import type { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  stripePriceId: string;
}

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['Basic browser control', 'Manual trading only', '5 actions/day'],
    stripePriceId: ''
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    features: ['Unlimited browser control', 'AI-ML autonomous trading', 'Real-time analytics', 'Priority support'],
    stripePriceId: 'price_1ProPlanStripePriceId'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'Advanced analytics'],
    stripePriceId: 'price_1EnterprisePlanStripePriceId'
  }
];

export class StripeService {
  private stripe: Stripe | null = null;

  async initialize() {
    this.stripe = await stripePromise;
    return this.stripe;
  }

  async createCheckoutSession(priceId: string, userId: string) {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });

      const session = await response.json();

      if (!this.stripe) await this.initialize();
      if (!this.stripe) throw new Error('Stripe failed to initialize');

      const { error } = await this.stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        console.error('Stripe checkout error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  async createCustomerPortal(customerId: string) {
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId }),
    });
    
    const { url } = await response.json();
    window.location.href = url;
  }
}

export const stripeService = new StripeService();
