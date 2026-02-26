/**
 * Stripe Service for Sprint 1 - Billing integration
 */
import { supabase } from '../supabaseClient';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Create a Stripe Checkout session
 * @param {string} membershipId - The client membership ID
 * @param {string} planId - The plan ID from the Plans table
 * @param {string} successUrl - URL to redirect after successful payment
 * @param {string} cancelUrl - URL to redirect if payment is cancelled
 * @returns {Promise<{url: string}|{error: Error}>}
 */
export const createCheckoutSession = async (membershipId, planId, successUrl, cancelUrl) => {
    try {
        // Get the plan details to get stripe_price_id
        const { data: plan, error: planError } = await supabase
            .from('Plans')
            .select('stripe_price_id, plan_name')
            .eq('whalesync_postgres_id', planId)
            .single();

        if (planError || !plan?.stripe_price_id) {
            throw new Error('Plan not found or missing Stripe price ID');
        }

        // Get membership details + contact email for customer info
        const { data: membership, error: membershipError } = await supabase
            .from('client_memberships')
            .select('client_name, stripe_customer_id')
            .eq('id', membershipId)
            .single();

        if (membershipError) {
            throw new Error('Membership not found');
        }

        // Get the contact email from client_contacts
        const { data: contact } = await supabase
            .from('client_contacts')
            .select('email')
            .eq('membership_id', membershipId)
            .maybeSingle();

        // Call the Supabase Edge Function to create checkout session
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
                membershipId,
                priceId: plan.stripe_price_id,
                customerEmail: contact?.email || null,
                customerId: membership.stripe_customer_id,
                clientName: membership.client_name,
                successUrl: successUrl || `${window.location.origin}/checkout/success`,
                cancelUrl: cancelUrl || `${window.location.origin}/checkout/cancel`
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || errBody.message || 'Failed to create checkout session');
        }

        const { url } = await response.json();
        return { url };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return { error };
    }
};

/**
 * Get subscription status for a membership
 * @param {string} membershipId - The client membership ID
 * @returns {Promise<Object>} Subscription status object
 */
export const getSubscriptionStatus = async (membershipId) => {
    try {
        const { data: membership, error } = await supabase
            .from('client_memberships')
            .select(`
                id,
                stripe_customer_id,
                stripe_subscription_id,
                plan_from_agreements,
                "Plans" (
                    whalesync_postgres_id,
                    plan_name,
                    tasks_at_once,
                    delivery_sla_business_days,
                    monthly_price_ht,
                    stripe_price_id
                )
            `)
            .eq('id', membershipId)
            .single();

        if (error) throw error;

        return {
            membershipId: membership.id,
            stripeCustomerId: membership.stripe_customer_id,
            stripeSubscriptionId: membership.stripe_subscription_id,
            plan: membership['Plans'],
            isActive: !!membership.stripe_subscription_id
        };
    } catch (error) {
        console.error('Error fetching subscription status:', error);
        return { error };
    }
};

/**
 * Redirect to Stripe Customer Portal for subscription management
 * @param {string} stripeCustomerId - The Stripe customer ID
 * @returns {Promise<void>}
 */
export const redirectToCustomerPortal = async (stripeCustomerId) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-portal-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
                customerId: stripeCustomerId,
                returnUrl: window.location.href
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || errBody.message || 'Failed to create portal session');
        }

        const { url } = await response.json();
        window.location.href = url;
    } catch (error) {
        console.error('Error redirecting to customer portal:', error);
        throw error;
    }
};

/**
 * Get plan limits for a membership
 * @param {string} membershipId - The client membership ID
 * @returns {Promise<{maxActiveTasks: number, turnaroundHours: number}>}
 */
export const getPlanLimits = async (membershipId) => {
    try {
        const { data: membership, error } = await supabase
            .from('client_memberships')
            .select(`
                plan_from_agreements,
                "Plans" (
                    tasks_at_once,
                    delivery_sla_business_days
                )
            `)
            .eq('id', membershipId)
            .single();

        if (error) throw error;

        const plan = membership['Plans'];
        return {
            maxActiveTasks: plan?.tasks_at_once || 1,
            turnaroundHours: plan?.delivery_sla_business_days ? plan.delivery_sla_business_days * 24 : 72
        };
    } catch (error) {
        console.error('Error fetching plan limits:', error);
        return {
            maxActiveTasks: 1,
            turnaroundHours: 72
        };
    }
};

/**
 * Check if a task can be activated based on plan limits
 * @param {string} membershipId - The client membership ID
 * @returns {Promise<{canActivate: boolean, currentActive: number, maxTasks: number}>}
 */
export const checkTaskLimit = async (membershipId) => {
    try {
        const { data, error } = await supabase.rpc('check_task_limit', {
            p_membership_id: membershipId
        });

        if (error) throw error;

        return {
            canActivate: data.can_activate,
            currentActive: data.current_active,
            maxTasks: data.max_tasks
        };
    } catch (error) {
        console.error('Error checking task limit:', error);
        return {
            canActivate: true, // Default to allowing activation on error
            currentActive: 0,
            maxTasks: 1
        };
    }
};

/**
 * Get client financial details (subscription, invoices, upcoming invoice)
 * @param {string} membershipId - The client membership ID
 * @returns {Promise<Object>} Client financial data
 */
export const getClientFinancials = async (membershipId) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-client-financials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({ membershipId })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || errBody.message || 'Failed to fetch financials');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching client financials:', error);
        return { error };
    }
};

/**
 * Manage subscription (pause, resume, cancel, reactivate, change plan)
 * Admin-only action
 * @param {string} action - 'pause' | 'resume' | 'cancel' | 'cancel_immediately' | 'reactivate' | 'change_plan'
 * @param {Object} params - { membershipId, subscriptionId?, newPriceId? }
 * @returns {Promise<Object>} Result
 */
export const manageSubscription = async (action, { membershipId, subscriptionId, newPriceId } = {}) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
                action,
                membershipId,
                subscriptionId,
                newPriceId
            })
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error || errBody.message || 'Failed to manage subscription');
        }

        return await response.json();
    } catch (error) {
        console.error('Error managing subscription:', error);
        return { error };
    }
};

export default {
    createCheckoutSession,
    getSubscriptionStatus,
    redirectToCustomerPortal,
    getPlanLimits,
    checkTaskLimit,
    getClientFinancials,
    manageSubscription
};
