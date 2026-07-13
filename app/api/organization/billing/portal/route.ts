import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { organizationQueries } from '@/lib/db';

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

  return { organizationId: Number(membership.organization_id) };
}

// POST /api/organization/billing/portal — create a Stripe Billing Portal session
// (payment method updates + Stripe-hosted invoice history as a fallback to /organization/billing/invoices)
export async function POST(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { organizationId } = resolved;

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 503 });
    }

    const subscription = await organizationQueries.getSubscriptionByOrganizationId(organizationId) as any;
    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account yet. Subscribe to a plan first.' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/organization/billing`,
    });

    return NextResponse.json({ success: true, data: { url: portalSession.url } });
  } catch (error: any) {
    console.error('POST organization billing portal error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
