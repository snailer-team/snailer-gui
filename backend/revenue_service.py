import stripe
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any
import pandas as pd
from dateutil.relativedelta import relativedelta

class StripeRevenueService:
    def __init__(self):
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        if not stripe.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable is required")
    
    def get_revenue_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Fetch comprehensive revenue metrics from Stripe"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get current period metrics
        current_metrics = self._get_period_metrics(start_date, end_date)
        
        # Get previous period for comparison
        prev_end = start_date
        prev_start = prev_end - timedelta(days=days)
        prev_metrics = self._get_period_metrics(prev_start, prev_end)
        
        # Calculate growth rates
        mrr_growth = self._calculate_growth_rate(prev_metrics['mrr'], current_metrics['mrr'])
        customer_growth = self._calculate_growth_rate(prev_metrics['customers'], current_metrics['customers'])
        
        return {
            'current_period': current_metrics,
            'previous_period': prev_metrics,
            'growth_rates': {
                'mrr_growth_rate': mrr_growth,
                'customer_growth_rate': customer_growth,
                'revenue_growth_rate': self._calculate_growth_rate(prev_metrics['total_revenue'], current_metrics['total_revenue'])
            },
            'churn_rate': self._calculate_churn_rate(days),
            'ltv_cac_ratio': self._calculate_ltv_cac_ratio(current_metrics)
        }
    
    def _get_period_metrics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get metrics for a specific time period"""
        # Fetch subscriptions
        subscriptions = stripe.Subscription.list(
            created={'gte': int(start_date.timestamp()), 'lte': int(end_date.timestamp())},
            limit=100
        )
        
        # Fetch invoices for revenue calculation
        invoices = stripe.Invoice.list(
            created={'gte': int(start_date.timestamp()), 'lte': int(end_date.timestamp())},
            status='paid',
            limit=100
        )
        
        # Calculate total revenue
        total_revenue = sum(invoice.amount_paid / 100 for invoice in invoices.data)
        
        # Calculate MRR from active subscriptions
        active_subs = stripe.Subscription.list(status='active', limit=100)
        mrr = sum(sub.items.data[0].price.unit_amount / 100 for sub in active_subs.data if sub.items.data)
        
        # Get customer count
        customers = stripe.Customer.list(
            created={'gte': int(start_date.timestamp()), 'lte': int(end_date.timestamp())},
            limit=100
        )
        
        return {
            'total_revenue': total_revenue,
            'mrr': mrr,
            'customers': len(customers.data),
            'new_subscriptions': len(subscriptions.data),
            'invoice_count': len(invoices.data)
        }
    
    def _calculate_growth_rate(self, previous: float, current: float) -> float:
        """Calculate growth rate percentage"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100
    
    def _calculate_churn_rate(self, days: int) -> float:
        """Calculate customer churn rate"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get canceled subscriptions
        canceled_subs = stripe.Subscription.list(
            status='canceled',
            canceled_at={'gte': int(start_date.timestamp()), 'lte': int(end_date.timestamp())},
            limit=100
        )
        
        # Get total active customers at start of period
        total_customers = stripe.Customer.list(limit=100)
