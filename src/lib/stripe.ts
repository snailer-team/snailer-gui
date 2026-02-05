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

      // Redirect to Stripe Checkout URL
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL returned from server');
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
