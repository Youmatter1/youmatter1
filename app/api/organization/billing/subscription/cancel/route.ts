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

// POST /api/organization/billing/subscription/cancel — cancel at the end of the current period
export async function POST(request: Request) {
  try {
    const resolved = await resolveOrgAdminMembership(request);
    if (resolved.error) return resolved.error;
    const { organizationId } = resolved;

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 503 });
    }

    const subscription = await organizationQueries.getSubscriptionByOrganizationId(organizationId) as any;
    if (!subscription || !subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    const item = updated.items.data[0];
    const endsAt = item ? new Date(item.current_period_end * 1000).toISOString() : subscription.current_period_end;

    await organizationQueries.updateSubscription(
      subscription.stripe_subscription_id,
      null, null, null, null, null, null, endsAt, 1
    );

    return NextResponse.json({ success: true, data: { cancel_at_period_end: true, ends_at: endsAt } });
  } catch (error: any) {
    console.error('POST organization billing cancel error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
