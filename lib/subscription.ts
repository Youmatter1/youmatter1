import { subscriptionQueries } from '@/lib/db';

// Gates session booking on having an active patient_subscriptions row.
// Currently every patient is auto-enrolled in the free promo tier at signup,
// so this always passes for now; it's the seam where a real paid-plan check
// (Stripe subscription status) plugs in once pricing goes live.
export async function hasActiveSubscription(userId: number | string): Promise<boolean> {
  const subscription = await subscriptionQueries.getActiveByUserId(userId) as any;
  return !!subscription;
}
