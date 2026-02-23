import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    let event: Stripe.Event

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            webhookSecret,
            undefined,
            Stripe.createSubtleCryptoProvider()
        )
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), {
            status: 400,
        })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                const membershipId = subscription.metadata?.membership_id

                if (membershipId) {
                    // Get the price ID and find matching plan
                    const priceId = subscription.items.data[0]?.price?.id

                    // Find the plan with this stripe_price_id
                    const { data: plan } = await supabase
                        .from('🔄 Plans')
                        .select('id')
                        .eq('stripe_price_id', priceId)
                        .single()

                    // Update client_memberships with subscription info
                    const { error: updateError } = await supabase
                        .from('client_memberships')
                        .update({
                            stripe_subscription_id: subscription.id,
                            stripe_customer_id: subscription.customer as string,
                            plan_id: plan?.id || null,
                            status: subscription.status === 'active' ? 'En cours' : subscription.status,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', membershipId)

                    if (updateError) {
                        console.error('Error updating membership:', updateError)
                    } else {
                        console.log(`Subscription ${subscription.id} synced for membership ${membershipId}`)
                    }
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const membershipId = subscription.metadata?.membership_id

                if (membershipId) {
                    const { error: updateError } = await supabase
                        .from('client_memberships')
                        .update({
                            stripe_subscription_id: null,
                            status: 'Canceled',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', membershipId)

                    if (updateError) {
                        console.error('Error updating membership on cancellation:', updateError)
                    } else {
                        console.log(`Subscription canceled for membership ${membershipId}`)
                    }
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                const subscriptionId = invoice.subscription as string

                // Find membership by subscription ID
                const { data: membership } = await supabase
                    .from('client_memberships')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single()

                if (membership) {
                    const { error: updateError } = await supabase
                        .from('client_memberships')
                        .update({
                            status: 'Payment Failed',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', membership.id)

                    if (updateError) {
                        console.error('Error updating membership on payment failure:', updateError)
                    }
                }
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice
                const subscriptionId = invoice.subscription as string

                // Find membership by subscription ID and update status to active
                const { data: membership } = await supabase
                    .from('client_memberships')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single()

                if (membership) {
                    const { error: updateError } = await supabase
                        .from('client_memberships')
                        .update({
                            status: 'En cours',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', membership.id)

                    if (updateError) {
                        console.error('Error updating membership on payment success:', updateError)
                    }
                }
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Webhook handler error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
