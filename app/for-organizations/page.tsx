'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/lib/subscription-plans';
import { Building2, ShieldCheck, BarChart2, Users, CheckCircle2 } from 'lucide-react';

const valueProps = [
  {
    icon: Building2,
    title: 'Your Own Branded Portal',
    description: 'Employees sign in through a page that looks and feels like your organization — logo, colors, and all.',
  },
  {
    icon: Users,
    title: 'Vetted Therapists, Your Choice',
    description: 'Onboard your own network of licensed therapists, or let us help you find the right fit.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & Confidential',
    description: 'Sessions and records stay between your employees and their therapists — never visible to admins.',
  },
  {
    icon: BarChart2,
    title: 'Usage Insights',
    description: 'Track engagement and utilization at a glance, without ever seeing individual session details.',
  },
];

const steps = [
  { step: '1', title: 'Sign up your organization', description: 'Create an account and choose a plan that fits your team size.' },
  { step: '2', title: 'Invite your team', description: 'Invite employees as members, and onboard your own therapists if you have them.' },
  { step: '3', title: 'Everyone gets to work', description: 'Employees book sessions with your therapists through their own branded portal.' },
];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function ForOrganizationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      <Navbar />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-32 pb-20 text-center">
        <span className="inline-block rounded-full bg-green-100 text-green-700 text-xs font-semibold px-4 py-1.5 mb-6">
          For Organizations
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Employee Wellness, Simplified
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          Give your team access to licensed therapists through a private, branded portal — built for
          organizations that take mental health seriously.
        </p>
        <Link href="/signup?role=org_admin">
          <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 py-3.5 font-semibold text-base">
            Get Started
          </Button>
        </Link>
      </section>

      {/* Value Props */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {valueProps.map((prop) => {
            const Icon = prop.icon;
            return (
              <div key={prop.title} className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{prop.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{prop.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-gray-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Plans for Every Team Size</h2>
        <p className="text-gray-600 text-center mb-12">Priced per seat, billed monthly or annually. No hidden fees.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`rounded-2xl border p-8 flex flex-col relative ${
                plan.mostPopular ? 'border-green-600 shadow-lg bg-white' : 'border-gray-200 bg-white'
              }`}
            >
              {plan.mostPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-600 mb-6">{plan.description}</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {formatPrice(plan.pricePerSeatMonthly)}
                <span className="text-base font-medium text-gray-500">/seat/mo</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {plan.maxSeats ? `Up to ${plan.maxSeats} seats` : 'Unlimited seats'}
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/signup?role=org_admin">
                <Button
                  className={`w-full rounded-lg font-semibold h-11 ${
                    plan.mostPopular
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Get Started
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-green-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to invest in your team&apos;s wellbeing?</h2>
          <p className="text-green-50 mb-8">Set up your organization in minutes. No credit card required to get started.</p>
          <Link href="/signup?role=org_admin">
            <Button className="bg-white hover:bg-gray-100 text-green-700 rounded-full px-8 py-3.5 font-semibold text-base">
              Sign Up Your Organization
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
