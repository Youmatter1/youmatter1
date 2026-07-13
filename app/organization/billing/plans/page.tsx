'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeading } from '@/components/ui/section-heading';
import { PLANS, calculatePrice, type BillingCycle, type PlanTier } from '@/lib/subscription-plans';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

interface CurrentSubscription {
  plan_tier: string;
  status: string;
}

export default function OrganizationPlansPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [seats, setSeats] = useState(10);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutTier, setCheckoutTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/organization/billing/subscription', { credentials: 'include' })
      .then(async (res) => {
        const body = await res.json();
        if (res.ok && body.success && body.data.subscription) {
          setCurrent(body.data.subscription);
          if (body.data.subscription.max_seats) setSeats(body.data.subscription.max_seats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChoosePlan = async (tier: PlanTier) => {
    setError('');
    setCheckoutTier(tier);
    try {
      const response = await fetch('/api/organization/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_tier: tier, billing_cycle: billingCycle, seats }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Failed to start checkout');
      window.location.href = body.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setCheckoutTier(null);
    }
  };

  const isCurrentPlan = (tier: PlanTier) => current?.plan_tier === tier && current.status !== 'canceled';

  return (
    <div className="space-y-8">
      <SectionHeading
        align="left"
        variant="light"
        title="Choose Your Plan"
        description="Pick the plan that fits your team, set how many seats you need, and we'll handle billing from there."
      />

      <div className="flex flex-col gap-6 rounded-3xl border border-black/20 bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Chip active={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
            Monthly
          </Chip>
          <Chip active={billingCycle === 'annual'} onClick={() => setBillingCycle('annual')}>
            Annual
          </Chip>
          {billingCycle === 'annual' ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Save 17%
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="seats" className="whitespace-nowrap">Number of seats</Label>
          <div className="w-28">
            <Input
              id="seats"
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const total = calculatePrice(plan.tier, seats, billingCycle);
          const perSeat = billingCycle === 'annual' ? plan.pricePerSeatAnnual : plan.pricePerSeatMonthly;
          const seatsExceedPlan = plan.maxSeats !== null && seats > plan.maxSeats;
          const current_ = isCurrentPlan(plan.tier);

          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.2)] ${
                plan.mostPopular ? 'border-black' : 'border-black/20'
              }`}
            >
              {plan.mostPopular ? (
                <span className="absolute -top-3 left-6 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              ) : null}

              <h3 className="text-lg font-semibold text-black">{plan.name}</h3>
              <p className="mt-1 text-sm text-black/60">{plan.description}</p>

              <div className="mt-6">
                <span className="text-3xl font-semibold text-black">{formatCents(perSeat)}</span>
                <span className="text-sm text-black/50"> / seat / {billingCycle === 'annual' ? 'year' : 'month'}</span>
              </div>
              <p className="mt-1 text-xs text-black/50">
                {plan.maxSeats ? `Up to ${plan.maxSeats} seats` : 'Unlimited seats'}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-black/80">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl bg-black/5 px-4 py-3 text-sm text-black/70">
                {seats} seat{seats === 1 ? '' : 's'} = <span className="font-semibold text-black">{formatCents(total)}</span>{' '}
                / {billingCycle === 'annual' ? 'year' : 'month'}
              </div>

              {current_ ? (
                <span className="mt-4 flex items-center justify-center rounded-full bg-black/10 px-4 py-3 text-sm font-semibold text-black">
                  Current Plan
                </span>
              ) : (
                <Button
                  className="mt-4"
                  variant={plan.mostPopular ? 'primary' : 'outline'}
                  disabled={loading || seatsExceedPlan || checkoutTier !== null}
                  onClick={() => handleChoosePlan(plan.tier)}
                >
                  {checkoutTier === plan.tier ? 'Redirecting…' : seatsExceedPlan ? `Max ${plan.maxSeats} seats` : `Choose ${plan.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
