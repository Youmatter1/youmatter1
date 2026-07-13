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

// POST /api/organization/billing/subscription/reactivate — undo a pending cancellation
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
    if (subscription.status === 'canceled') {
      return NextResponse.json(
        { error: 'This subscription has already ended. Choose a plan to start a new one.' },
        { status: 400 }
      );
    }
    if (!subscription.cancel_at_period_end) {
      return NextResponse.json({ error: 'This subscription is not scheduled to cancel.' }, { status: 400 });
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await organizationQueries.updateSubscription(
      subscription.stripe_subscription_id,
      null, null, null, null, null, null, null, 0
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST organization billing reactivate error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
