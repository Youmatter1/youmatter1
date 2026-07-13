import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import db, { organizationQueries } from '@/lib/db';
import { headers } from 'next/headers';
import { getPricePerSeat, type BillingCycle } from '@/lib/subscription-plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedPayment);
        break;

      case 'invoice.payment_succeeded':
        // Handle subscription payment success if needed
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await handleSubscriptionPayment(invoice);
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          await handleOrgCheckoutCompleted(session);
        }
        break;

      case 'customer.subscription.updated':
        await handleOrgSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleOrgSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleOrgInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleOrgInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler failed:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { metadata, amount, currency, id } = paymentIntent;

  if (!metadata) return;

  const { userId, type, session_id } = metadata;

  // Record transaction in database
  await db.execute({
    sql: `
      INSERT INTO transactions (
        stripe_payment_id,
        user_id,
        amount,
        currency,
        status,
        type,
        metadata
      ) VALUES (?, ?, ?, ?, 'succeeded', ?, ?)
    `,
    args: [
      id,
      userId || null,
      amount,
      currency,
      type || 'one_time',
      JSON.stringify(metadata)
    ]
  });

  // If this was a donation
  if (type === 'donation') {
    await db.execute({
      sql: `
        INSERT INTO donations (
          user_id,
          amount,
          currency,
          status,
          stripe_payment_id,
          metadata
        ) VALUES (?, ?, ?, 'succeeded', ?, ?)
      `,
      args: [
        userId || null,
        amount,
        currency,
        id,
        JSON.stringify(metadata)
      ]
    });
  }

  // If this was a session booking payment
  if (type === 'session_booking' && session_id) {
    await db.execute({
      sql: `UPDATE sessions SET status = 'confirmed', payment_status = 'paid' WHERE id = ?`,
      args: [session_id]
    });
  }

  // If this was a therapist subscription
  if (type === 'subscription' && userId) {
    console.log(`Processing subscription activation for user ${userId}`);
    // 30 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    try {
      const result = await db.execute({
        sql: `UPDATE users SET subscription_status = 'active', subscription_end_date = ? WHERE email = (SELECT email FROM users WHERE id = ?)`,
        args: [endDate.toISOString(), userId]
      });
      console.log(`Updated active subscription for user ${userId}. DB Result:`, result);
    } catch (dbError) {
      console.error(`Failed to update subscription in DB for user ${userId}:`, dbError);
    }
  } else {
    console.log(`Webhook payment success ignored. Type: ${type}, UserId: ${userId}`);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { metadata, amount, currency, id, last_payment_error } = paymentIntent;

  await db.execute({
    sql: `
      INSERT INTO transactions (
        stripe_payment_id,
        user_id,
        amount,
        currency,
        status,
        type,
        metadata,
        error_message
      ) VALUES (?, ?, ?, ?, 'failed', ?, ?, ?)
    `,
    args: [
      id,
      metadata?.userId || null,
      amount,
      currency,
      metadata?.type || 'unknown',
      JSON.stringify(metadata),
      last_payment_error?.message || 'Unknown error'
    ]
  });

  // If this was a donation
  if (metadata?.type === 'donation') {
    await db.execute({
      sql: `
        INSERT INTO donations (
          user_id,
          amount,
          currency,
          status,
          stripe_payment_id,
          metadata
        ) VALUES (?, ?, ?, 'failed', ?, ?)
      `,
      args: [
        metadata.userId || null,
        amount,
        currency,
        id,
        JSON.stringify(metadata)
      ]
    });
  }
}

async function handleSubscriptionPayment(invoice: Stripe.Invoice) {
  // Logic to update user subscription status
  if (invoice.customer_email && invoice.lines?.data?.[0]?.period?.end) {
    console.log(`Subscription payment received for ${invoice.customer_email}`);

    // Get subscription end date from invoice line item (period_end is unix timestamp)
    const periodEnd = invoice.lines.data[0].period.end;
    const endDate = new Date(periodEnd * 1000).toISOString();

    await db.execute({
      sql: `UPDATE users SET subscription_status = 'active', subscription_end_date = ? WHERE email = ?`,
      args: [endDate, invoice.customer_email]
    });

    console.log(`Updated subscription for ${invoice.customer_email} until ${endDate}`);
  }
}

// --- Organization (B2B) subscription billing ---

// organization_subscriptions.status only allows active/past_due/canceled/trialing;
// Stripe has a few extra transitional states we fold into past_due.
function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' | 'trialing' {
  if (status === 'active' || status === 'trialing' || status === 'canceled') return status;
  return 'past_due'; // unpaid, incomplete, incomplete_expired, paused
}

async function handleOrgCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription) return;

  const organizationId = session.metadata?.organization_id;
  const planTier = session.metadata?.plan_tier;
  const billingCycle = session.metadata?.billing_cycle as BillingCycle | undefined;
  const seatsMeta = session.metadata?.seats;

  if (!organizationId || !planTier || !billingCycle || !seatsMeta) {
    console.error('checkout.session.completed missing organization billing metadata', session.id);
    return;
  }

  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  const seats = Number(seatsMeta);
  const pricePerSeat = getPricePerSeat(planTier, billingCycle);
  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodStart = item ? new Date(item.current_period_start * 1000).toISOString() : null;
  const periodEnd = item ? new Date(item.current_period_end * 1000).toISOString() : null;

  await organizationQueries.createSubscription(
    Number(organizationId),
    subscriptionId,
    customerId,
    planTier,
    pricePerSeat,
    seats,
    billingCycle,
    status,
    periodStart,
    periodEnd
  );

  // organizations.plan_tier's CHECK constraint (free/pro/enterprise) doesn't include
  // starter/growth, so only max_seats (unconstrained) is kept in sync here.
  // organization_subscriptions is the real source of truth for plan/seats from here on.
  await db.execute({
    sql: 'UPDATE organizations SET max_seats = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [seats, Number(organizationId)],
  });
}

async function handleOrgSubscriptionUpdated(subscription: Stripe.Subscription) {
  const local = await organizationQueries.getSubscriptionByStripeId(subscription.id) as any;
  if (!local) return; // not an org subscription we created via checkout

  const item = subscription.items.data[0];
  const seats = item?.quantity ?? null;
  const pricePerSeat = item?.price?.unit_amount ?? null;
  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodStart = item ? new Date(item.current_period_start * 1000).toISOString() : null;
  const periodEnd = item ? new Date(item.current_period_end * 1000).toISOString() : null;

  await organizationQueries.updateSubscription(
    subscription.id,
    null,
    pricePerSeat,
    seats,
    null,
    status,
    periodStart,
    periodEnd,
    subscription.cancel_at_period_end ? 1 : 0
  );

  if (seats !== null) {
    await db.execute({
      sql: 'UPDATE organizations SET max_seats = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [seats, local.organization_id],
    });
  }
}

async function handleOrgSubscriptionDeleted(subscription: Stripe.Subscription) {
  const local = await organizationQueries.getSubscriptionByStripeId(subscription.id) as any;
  if (!local) return;

  await organizationQueries.updateSubscription(
    subscription.id,
    null, null, null, null, 'canceled', null, null, null
  );
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

async function handleOrgInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return; // not a subscription invoice

  const local = await organizationQueries.getSubscriptionByStripeId(subscriptionId) as any;
  if (!local) return; // not an org subscription we created via checkout

  const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null;
  const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null;
  const seatsBilled = invoice.lines?.data?.[0]?.quantity ?? null;

  await organizationQueries.createInvoice(
    local.organization_id,
    invoice.id,
    invoice.amount_paid,
    seatsBilled,
    periodStart,
    periodEnd,
    'paid',
    invoice.invoice_pdf ?? null
  );
}

async function handleOrgInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const local = await organizationQueries.getSubscriptionByStripeId(subscriptionId) as any;
  if (!local) return;

  await organizationQueries.updateSubscription(
    subscriptionId,
    null, null, null, null, 'past_due', null, null, null
  );
}
