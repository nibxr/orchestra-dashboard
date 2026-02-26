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

// Simple email validation
function isValidEmail(email: string): boolean {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const {
            membershipId,
            priceId,
            customerEmail,
            customerId,
            clientName,
            successUrl,
            cancelUrl,
        } = await req.json()

        if (!priceId) {
            throw new Error('Price ID is required')
        }
        if (!membershipId) {
            throw new Error('Membership ID is required')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Resolve the actual contact email from DB if not provided or invalid
        let resolvedEmail = isValidEmail(customerEmail) ? customerEmail.trim() : null

        if (!resolvedEmail) {
            // Try to find the contact email from client_contacts
            const { data: contact } = await supabase
                .from('client_contacts')
                .select('email')
                .eq('membership_id', membershipId)
                .maybeSingle()

            if (contact?.email && isValidEmail(contact.email)) {
                resolvedEmail = contact.email.trim()
            }
        }

        // Build checkout session params
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || 'https://app.dafolle.io/checkout/success',
            cancel_url: cancelUrl || 'https://app.dafolle.io/checkout/cancel',
            subscription_data: {
                metadata: {
                    membership_id: membershipId,
                },
            },
        }

        // If we already have a Stripe customer, use it; otherwise create one
        if (customerId) {
            sessionParams.customer = customerId
        } else {
            // Create a new Stripe customer
            const customerParams: Stripe.CustomerCreateParams = {
                metadata: { membership_id: membershipId },
            }
            // Only set email if it's a valid email address
            if (resolvedEmail) {
                customerParams.email = resolvedEmail
            }
            if (clientName && typeof clientName === 'string') {
                customerParams.name = clientName.trim()
            }

            const customer = await stripe.customers.create(customerParams)
            sessionParams.customer = customer.id

            // Save the Stripe customer ID back to client_memberships
            await supabase
                .from('client_memberships')
                .update({
                    stripe_customer_id: customer.id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', membershipId)
        }

        // Create the Stripe Checkout Session
        const session = await stripe.checkout.sessions.create(sessionParams)

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Create checkout session error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
