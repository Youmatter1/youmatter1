import { NextResponse } from 'next/server';
import { getUserFromRequest, hasRole } from '@/lib/auth';
import { subscriptionQueries } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/patient/subscription: current patient's subscription status, for
// the dashboard subscription card.
export async function GET(request: Request) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !hasRole(currentUser, 'patient')) {
      return NextResponse.json({ error: 'Unauthorized. Patient access required.' }, { status: 403 });
    }

    const subscription = await subscriptionQueries.getByUserId(currentUser.userId) as any;
    if (!subscription) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        plan_name: subscription.plan_name,
        status: subscription.status,
        promo_label: subscription.promo_label,
        price: subscription.price,
        currency: subscription.currency,
        billing_cycle: subscription.billing_cycle,
      },
    });
  } catch (error) {
    console.error('Get patient subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
