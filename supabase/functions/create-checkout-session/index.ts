import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { membershipId, priceId, customerEmail, customerId, successUrl, cancelUrl } = await req.json()

        if (!priceId) {
            throw new Error('Price ID is required')
        }

        // Create or retrieve customer
        let stripeCustomerId = customerId

        if (!stripeCustomerId && customerEmail) {
            // Search for existing customer
            const existingCustomers = await stripe.customers.list({
                email: customerEmail,
                limit: 1
            })

            if (existingCustomers.data.length > 0) {
                stripeCustomerId = existingCustomers.data[0].id
            } else {
                // Create new customer
                const newCustomer = await stripe.customers.create({
                    email: customerEmail,
                    metadata: {
                        membership_id: membershipId
                    }
                })
                stripeCustomerId = newCustomer.id
            }
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.get('origin')}/checkout/cancel`,
            metadata: {
                membership_id: membershipId
            },
            subscription_data: {
                metadata: {
                    membership_id: membershipId
                }
            }
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Checkout session error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
