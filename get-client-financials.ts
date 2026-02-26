import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { membershipId } = await req.json()

        if (!membershipId) {
            throw new Error('Membership ID is required')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get membership with plan info
        const { data: membership, error: membershipError } = await supabase
            .from('client_memberships')
            .select(`
                id,
                client_name,
                stripe_customer_id,
                stripe_subscription_id,
                plan_from_agreements,
                status,
                "Plans" (
                    whalesync_postgres_id,
                    plan_name,
                    monthly_price_ht,
                    tasks_at_once,
                    delivery_sla_business_days,
                    stripe_price_id
                )
            `)
            .eq('id', membershipId)
            .single()

        if (membershipError) throw membershipError

        let subscriptionData = null
        let invoices: any[] = []
        let upcomingInvoice = null

        // Resolve subscription ID — fallback to Stripe lookup if not stored
        let subscriptionId = membership.stripe_subscription_id
        if (!subscriptionId && membership.stripe_customer_id) {
            try {
                // Try active/trialing/past_due first, then fall back to all statuses (including canceled)
                let subscriptions = await stripe.subscriptions.list({
                    customer: membership.stripe_customer_id,
                    limit: 1,
                })
                if (subscriptions.data.length === 0) {
                    subscriptions = await stripe.subscriptions.list({
                        customer: membership.stripe_customer_id,
                        status: 'all',
                        limit: 1,
                    })
                }
                if (subscriptions.data.length > 0) {
                    subscriptionId = subscriptions.data[0].id
                    // Save it back for future use
                    await supabase
                        .from('client_memberships')
                        .update({ stripe_subscription_id: subscriptionId, updated_at: new Date().toISOString() })
                        .eq('id', membershipId)
                    console.log('Found and saved subscription:', subscriptionId)
                }
            } catch (err) {
                console.warn('Could not look up subscription from Stripe:', err.message)
            }
        }

        // Fetch Stripe subscription details if subscription exists
        if (subscriptionId) {
            try {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                subscriptionData = {
                    id: subscription.id,
                    status: subscription.status,
                    currentPeriodStart: subscription.current_period_start,
                    currentPeriodEnd: subscription.current_period_end,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    cancelAt: subscription.cancel_at,
                    trialEnd: subscription.trial_end,
                    created: subscription.created,
                    pauseCollection: subscription.pause_collection,
                }
            } catch (err) {
                console.warn('Could not fetch subscription:', err.message)
            }
        }

        // Fetch recent invoices if customer exists
        if (membership.stripe_customer_id) {
            try {
                const invoiceList = await stripe.invoices.list({
                    customer: membership.stripe_customer_id,
                    limit: 10,
                })
                invoices = invoiceList.data.map(inv => ({
                    id: inv.id,
                    number: inv.number,
                    status: inv.status,
                    amountDue: inv.amount_due,
                    amountPaid: inv.amount_paid,
                    currency: inv.currency,
                    created: inv.created,
                    periodStart: inv.period_start,
                    periodEnd: inv.period_end,
                    hostedInvoiceUrl: inv.hosted_invoice_url,
                    pdfUrl: inv.invoice_pdf,
                }))
            } catch (err) {
                console.warn('Could not fetch invoices:', err.message)
            }

            // Fetch upcoming invoice
            try {
                const upcoming = await stripe.invoices.retrieveUpcoming({
                    customer: membership.stripe_customer_id,
                })
                upcomingInvoice = {
                    amountDue: upcoming.amount_due,
                    currency: upcoming.currency,
                    periodStart: upcoming.period_start,
                    periodEnd: upcoming.period_end,
                }
            } catch (err) {
                // No upcoming invoice is normal for cancelled/paused subscriptions
                console.log('No upcoming invoice:', err.message)
            }
        }

        const plan = membership['Plans']

        return new Response(
            JSON.stringify({
                membership: {
                    id: membership.id,
                    clientName: membership.client_name,
                    status: membership.status,
                    stripeCustomerId: membership.stripe_customer_id,
                    stripeSubscriptionId: membership.stripe_subscription_id,
                },
                plan: plan ? {
                    name: plan.plan_name,
                    price: plan.monthly_price_ht,
                    maxActiveTasks: plan.tasks_at_once,
                    deliverySlaDays: plan.delivery_sla_business_days,
                    stripePriceId: plan.stripe_price_id,
                } : null,
                subscription: subscriptionData,
                invoices,
                upcomingInvoice,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Get client financials error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
