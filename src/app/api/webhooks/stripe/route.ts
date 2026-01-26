import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { Plan } from '@prisma/client';

// ===========================================
// Stripe Webhook Handler
// ===========================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ===========================================
// Event Handlers
// ===========================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  // Find user profile by Supabase userId
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!userProfile) {
    console.error(`No user profile found for userId ${userId}`);
    return;
  }

  // Update user profile with Stripe customer ID
  await prisma.userProfile.update({
    where: { userId },
    data: {
      stripeCustomerId: customerId,
    },
  });

  console.log(`Checkout completed for user ${userId}, customer ${customerId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user profile by Stripe customer ID
  const userProfile = await prisma.userProfile.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userProfile) {
    console.error(`No user profile found for customer ${customerId}`);
    return;
  }

  // Determine plan based on price ID
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);

  // Update user profile subscription details
  await prisma.userProfile.update({
    where: { id: userProfile.id },
    data: {
      plan,
      stripeSubscriptionId: subscription.id,
      renderMinutesLimit: getPlanRenderMinutes(plan),
      storageLimitMb: getPlanStorageMb(plan),
      projectLimit: getPlanProjectLimit(plan),
    },
  });

  console.log(`Subscription updated for user ${userProfile.userId}: ${plan}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user profile by Stripe customer ID
  const userProfile = await prisma.userProfile.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userProfile) {
    console.error(`No user profile found for customer ${customerId}`);
    return;
  }

  // Revert to free plan
  await prisma.userProfile.update({
    where: { id: userProfile.id },
    data: {
      plan: Plan.FREE,
      stripeSubscriptionId: null,
      renderMinutesLimit: 60,
      storageLimitMb: 1024,
      projectLimit: 5,
    },
  });

  console.log(`Subscription cancelled for user ${userProfile.userId}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Log successful payment
  console.log(`Payment succeeded for customer ${customerId}`);

  // Could send a confirmation email here
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user profile
  const userProfile = await prisma.userProfile.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!userProfile) {
    console.error(`No user profile found for customer ${customerId}`);
    return;
  }

  // Log failed payment
  console.error(`Payment failed for user ${userProfile.userId}`);

  // Could send a notification email here
}

// ===========================================
// Helper Functions
// ===========================================

function getPlanFromPriceId(priceId: string): Plan {
  const priceMap: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_STARTER || '']: Plan.STARTER,
    [process.env.STRIPE_PRICE_PRO || '']: Plan.PRO,
    [process.env.STRIPE_PRICE_BUSINESS || '']: Plan.BUSINESS,
  };

  return priceMap[priceId] || Plan.FREE;
}

function getPlanRenderMinutes(plan: Plan): number {
  const limits: Record<Plan, number> = {
    [Plan.FREE]: 60,
    [Plan.STARTER]: 300,
    [Plan.PRO]: 1000,
    [Plan.BUSINESS]: 5000,
  };

  return limits[plan] || 60;
}

function getPlanStorageMb(plan: Plan): number {
  const limits: Record<Plan, number> = {
    [Plan.FREE]: 1024,      // 1 GB
    [Plan.STARTER]: 5120,   // 5 GB
    [Plan.PRO]: 20480,      // 20 GB
    [Plan.BUSINESS]: 102400, // 100 GB
  };

  return limits[plan] || 1024;
}

function getPlanProjectLimit(plan: Plan): number {
  const limits: Record<Plan, number> = {
    [Plan.FREE]: 5,
    [Plan.STARTER]: 25,
    [Plan.PRO]: 100,
    [Plan.BUSINESS]: -1, // Unlimited
  };

  return limits[plan] || 5;
}
