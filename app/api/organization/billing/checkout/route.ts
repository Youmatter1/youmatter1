import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';
import { validateRequest, checkoutSchema } from '@/lib/validation';
import { getPlanByTier, getPricePerSeat } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

async function resolveOrgAdminMembership(request: Request) {
  const currentUser = getUserFromRequest(request);
  if (!currentUser || !hasRole(currentUser, 'org_admin')) {
    return { error: NextResponse.json({ error: 'Unauthorized. Organization admin access required.' }, { status: 403 }) };
  }

  const membership = await organizationQueries.getMembershipByUserId(currentUser.userId) as any;
  if (!membership || membership.org_role !== 'org_admin') {
    return { error: NextResponse.json({ error: 'Organization not found' }, { status: 404 }) };
  }

  return { membership, organizationId: Number(membership.organization_id) };
}

// POST /api/organization/billing/checkout — create a Stripe Checkout Session for a new subscription
export async function POST(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { membership, organizationId } = resolved;

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 503 });
    }

    const validation = await validateRequest(request, checkoutSchema);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }
    const { plan_tier, billing_cycle, seats } = validation.data;

    const plan = getPlanByTier(plan_tier);
    if (!plan) {
      return NextResponse.json({ error: 'Unknown plan tier' }, { status: 400 });
    }
    if (plan.maxSeats !== null && seats > plan.maxSeats) {
      return NextResponse.json(
        { error: `The ${plan.name} plan supports up to ${plan.maxSeats} seats.` },
        { status: 400 }
      );
    }

    // Reuse an existing Stripe customer for this org (e.g. resubscribing after a
    // cancellation) rather than creating a duplicate one.
    const existingSubscription = await organizationQueries.getSubscriptionByOrganizationId(organizationId) as any;
    let customerId: string | undefined = existingSubscription?.stripe_customer_id || undefined;

    if (!customerId) {
      const organization = await organizationQueries.getOrganizationById(organizationId) as any;
      const customer = await stripe.customers.create({
        name: organization?.name || membership.organization_name,
        email: organization?.billing_email || undefined,
        metadata: { organization_id: String(organizationId) },
      });
      customerId = customer.id;
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const pricePerSeat = getPricePerSeat(plan_tier, billing_cycle);
    const sessionMetadata = {
      organization_id: String(organizationId),
      plan_tier,
      billing_cycle,
      seats: String(seats),
    };

    // Inline price_data so no Products/Prices need to be pre-created in the Stripe dashboard.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `You Matter — ${plan.name} Plan`,
              description: plan.description,
            },
            unit_amount: pricePerSeat,
            recurring: {
              interval: billing_cycle === 'annual' ? 'year' : 'month',
            },
          },
          quantity: seats,
        },
      ],
      success_url: `${origin}/organization/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/organization/billing/plans`,
      metadata: sessionMetadata,
      subscription_data: {
        metadata: sessionMetadata,
      },
    });

    return NextResponse.json({ success: true, data: { url: session.url } });
  } catch (error: any) {
    console.error('POST organization billing checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
