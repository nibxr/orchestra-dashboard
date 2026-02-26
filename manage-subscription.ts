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
        const { action, subscriptionId, membershipId, newPriceId } = await req.json()

        if (!action) {
            throw new Error('Action is required')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verify the caller is an admin team member
        const authHeader = req.headers.get('authorization')
        if (!authHeader) throw new Error('Authorization required')

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) throw new Error('Unauthorized')

        const { data: teamMember } = await supabase
            .from('team')
            .select('id, role')
            .eq('email', user.email)
            .maybeSingle()

        if (!teamMember || teamMember.role !== 'admin') {
            throw new Error('Only admin team members can manage subscriptions')
        }

        // Get subscription ID from membership if not provided directly
        let subId = subscriptionId
        if (!subId && membershipId) {
            const { data: membership } = await supabase
                .from('client_memberships')
                .select('stripe_subscription_id, stripe_customer_id')
                .eq('id', membershipId)
                .single()
            subId = membership?.stripe_subscription_id

            // Fallback: if no subscription ID stored, look it up from Stripe via customer ID
            if (!subId && membership?.stripe_customer_id) {
                console.log('No subscription ID stored, looking up from Stripe customer:', membership.stripe_customer_id)
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
                    subId = subscriptions.data[0].id
                    // Save it back for future use
                    await supabase
                        .from('client_memberships')
                        .update({ stripe_subscription_id: subId, updated_at: new Date().toISOString() })
                        .eq('id', membershipId)
                    console.log('Found and saved subscription:', subId)
                }
            }
        }

        let result: any = {}
        const hasStripeSubscription = !!subId

        // Status map for local-only updates (no Stripe subscription)
        const localStatusMap: Record<string, string> = {
            pause: 'Paused',
            resume: 'En cours',
            cancel: 'Cancelling',
            cancel_immediately: 'Canceled',
            reactivate: 'En cours',
        }

        // If no Stripe subscription, handle locally only
        if (!hasStripeSubscription && action !== 'create_checkout' && action !== 'change_plan') {
            if (!membershipId) throw new Error('Membership ID is required')
            const newStatus = localStatusMap[action]
            if (!newStatus) throw new Error(`Unknown action: ${action}`)

            await supabase
                .from('client_memberships')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', membershipId)

            // Also update the Agreement status if one exists
            await supabase
                .from('Agreements')
                .update({ status: newStatus === 'En cours' ? 'Active' : newStatus, updated_at: new Date().toISOString() })
                .eq('client_memberships', membershipId)

            result = { status: newStatus, localOnly: true }
        } else {
            // Stripe subscription exists — manage through Stripe + update local DB
            if (!subId && action !== 'create_checkout') {
                throw new Error('No subscription found for this client.')
            }

            switch (action) {
                case 'pause': {
                    const subscription = await stripe.subscriptions.update(subId, {
                        pause_collection: { behavior: 'void' }
                    })
                    result = { status: subscription.status, paused: true }

                    if (membershipId) {
                        await supabase
                            .from('client_memberships')
                            .update({ status: 'Paused', updated_at: new Date().toISOString() })
                            .eq('id', membershipId)
                    }
                    break
                }

                case 'resume': {
                    const subscription = await stripe.subscriptions.update(subId, {
                        pause_collection: null as any
                    })
                    result = { status: subscription.status, paused: false }

                    if (membershipId) {
                        await supabase
                            .from('client_memberships')
                            .update({ status: 'En cours', updated_at: new Date().toISOString() })
                            .eq('id', membershipId)
                    }
                    break
                }

                case 'cancel': {
                    const subscription = await stripe.subscriptions.update(subId, {
                        cancel_at_period_end: true
                    })
                    result = {
                        status: subscription.status,
                        cancelAtPeriodEnd: true,
                        cancelAt: subscription.cancel_at
                    }

                    if (membershipId) {
                        await supabase
                            .from('client_memberships')
                            .update({ status: 'Cancelling', updated_at: new Date().toISOString() })
                            .eq('id', membershipId)
                    }
                    break
                }

                case 'cancel_immediately': {
                    const subscription = await stripe.subscriptions.cancel(subId)
                    result = { status: 'canceled' }

                    if (membershipId) {
                        await supabase
                            .from('client_memberships')
                            .update({
                                stripe_subscription_id: null,
                                status: 'Canceled',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', membershipId)
                    }
                    break
                }

                case 'reactivate': {
                    const subscription = await stripe.subscriptions.update(subId, {
                        cancel_at_period_end: false
                    })
                    result = {
                        status: subscription.status,
                        cancelAtPeriodEnd: false
                    }

                    if (membershipId) {
                        await supabase
                            .from('client_memberships')
                            .update({ status: 'En cours', updated_at: new Date().toISOString() })
                            .eq('id', membershipId)
                    }
                    break
                }

                case 'change_plan': {
                    if (!newPriceId) throw new Error('New price ID is required for plan change')

                    const currentSub = await stripe.subscriptions.retrieve(subId)
                    const itemId = currentSub.items.data[0]?.id
                    if (!itemId) throw new Error('No subscription item found')

                    const subscription = await stripe.subscriptions.update(subId, {
                        items: [{
                            id: itemId,
                            price: newPriceId,
                        }],
                        proration_behavior: 'create_prorations'
                    })

                    const { data: newPlan } = await supabase
                        .from('Plans')
                        .select('whalesync_postgres_id')
                        .eq('stripe_price_id', newPriceId)
                        .single()

                    if (newPlan && membershipId) {
                        await supabase
                            .from('client_memberships')
                            .update({
                                plan_from_agreements: newPlan.whalesync_postgres_id,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', membershipId)
                    }

                    result = { status: subscription.status, planChanged: true }
                    break
                }

                default:
                    throw new Error(`Unknown action: ${action}`)
            }
        }

        return new Response(
            JSON.stringify({ success: true, ...result }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Manage subscription error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
