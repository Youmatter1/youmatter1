import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';
import { validateRequest, updateSeatsSchema } from '@/lib/validation';
import { getPlanByTier } from '@/lib/subscription-plans';

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

// GET /api/organization/billing/subscription — current subscription + seat usage
export async function GET(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { membership, organizationId } = resolved;

    const [subscription, membersRes] = await Promise.all([
      organizationQueries.getSubscriptionByOrganizationId(organizationId) as Promise<any>,
      organizationQueries.countMembers(organizationId),
    ]);
    const seatsUsed = Number((membersRes as any)?.count || 0);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          subscription: null,
          plan_tier: membership.plan_tier,
          max_seats: membership.max_seats,
          seats_used: seatsUsed,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          plan_tier: subscription.plan_tier,
          price_per_seat: subscription.price_per_seat,
          max_seats: subscription.max_seats,
          billing_cycle: subscription.billing_cycle,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        },
        plan_tier: subscription.plan_tier,
        max_seats: subscription.max_seats,
        seats_used: seatsUsed,
      },
    });
  } catch (error) {
    console.error('GET organization billing subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/organization/billing/subscription — change seat count within the same plan
export async function PUT(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { organizationId } = resolved;

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 503 });
    }

    const validation = await validateRequest(request, updateSeatsSchema);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', errors: validation.errors }, { status: 400 });
    }
    const { seats } = validation.data;

    const subscription = await organizationQueries.getSubscriptionByOrganizationId(organizationId) as any;
    if (!subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const plan = getPlanByTier(subscription.plan_tier);
    if (plan && plan.maxSeats !== null && seats > plan.maxSeats) {
      return NextResponse.json(
        { error: `The ${plan.name} plan supports up to ${plan.maxSeats} seats.` },
        { status: 400 }
      );
    }

    const membersRes = await organizationQueries.countMembers(organizationId);
    const seatsUsed = Number((membersRes as any)?.count || 0);
    if (seats < seatsUsed) {
      return NextResponse.json(
        { error: `You currently have ${seatsUsed} active members. Remove members before reducing seats below that number.` },
        { status: 400 }
      );
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const item = stripeSubscription.items.data[0];
    if (!item) {
      return NextResponse.json({ error: 'Subscription item not found on Stripe' }, { status: 500 });
    }

    // Prorate the seat change; the resulting subscription is re-synced by the
    // customer.subscription.updated webhook, but we also update locally here for
    // immediate UI feedback.
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{ id: item.id, quantity: seats }],
      proration_behavior: 'create_prorations',
    });

    await organizationQueries.updateSubscription(
      subscription.stripe_subscription_id,
      null,
      null,
      seats,
      null,
      null,
      null,
      null,
      null
    );

    return NextResponse.json({ success: true, data: { max_seats: seats } });
  } catch (error: any) {
    console.error('PUT organization billing subscription error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
