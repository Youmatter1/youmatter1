// Subscription plan configuration for organization (B2B) billing.
// Prices are per-seat, in cents. Annual price is the amount billed once per
// year per seat (≈10 months' worth of the monthly rate — a 17% discount).

export type PlanTier = 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface Plan {
  tier: PlanTier;
  name: string;
  description: string;
  maxSeats: number | null; // null = unlimited
  pricePerSeatMonthly: number; // cents, billed every month
  pricePerSeatAnnual: number; // cents, billed once per year
  mostPopular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    tier: 'starter',
    name: 'Starter',
    description: 'For small teams getting started with employee wellness',
    maxSeats: 10,
    pricePerSeatMonthly: 1500,
    pricePerSeatAnnual: 15000,
    features: [
      'Up to 10 seats',
      'Licensed therapist matching',
      'Video, chat, and phone sessions',
      'Usage analytics dashboard',
      'Email support',
    ],
  },
  {
    tier: 'growth',
    name: 'Growth',
    description: 'For growing companies investing in team mental health',
    maxSeats: 50,
    pricePerSeatMonthly: 1200,
    pricePerSeatAnnual: 12000,
    mostPopular: true,
    features: [
      'Up to 50 seats',
      'Everything in Starter',
      'Priority therapist matching',
      'Advanced usage analytics',
      'Priority email & chat support',
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    maxSeats: null,
    pricePerSeatMonthly: 900,
    pricePerSeatAnnual: 9000,
    features: [
      'Unlimited seats',
      'Everything in Growth',
      'Dedicated account manager',
      'Custom onboarding for employees',
      'Priority phone support',
    ],
  },
];

export function getPlanByTier(tier: string): Plan | undefined {
  return PLANS.find((p) => p.tier === tier);
}

export function getMaxSeats(tier: string): number | null {
  return getPlanByTier(tier)?.maxSeats ?? null;
}

export function getPricePerSeat(tier: string, cycle: BillingCycle): number {
  const plan = getPlanByTier(tier);
  if (!plan) return 0;
  return cycle === 'annual' ? plan.pricePerSeatAnnual : plan.pricePerSeatMonthly;
}

// Total price in cents for the given tier/seats/cycle combination.
export function calculatePrice(tier: string, seats: number, cycle: BillingCycle): number {
  return getPricePerSeat(tier, cycle) * seats;
}
