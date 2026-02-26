import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Lock, ExternalLink, AlertCircle, Loader2, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { createCheckoutSession } from '../utils/stripeService';
import { useToast } from '../components/Toast';
import logoSmall from '../assets/Logo Small.png';

/**
 * ClientActivation - Client activation and Stripe checkout flow
 * 1. Loads invitation data from DB by token
 * 2. Client creates their account (Supabase Auth)
 * 3. Redirected to Stripe Checkout for payment
 * 4. On return (?payment=success), shows success page
 */
export const ClientActivation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [invitationError, setInvitationError] = useState(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const isPaymentSuccess = new URLSearchParams(window.location.search).get('payment') === 'success';

  // Load invitation data from DB (always — needed for both form and success views)
  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const { data: invitation, error } = await supabase
          .from('client_invitations')
          .select('*, membership_id')
          .eq('token', token)
          .maybeSingle();

        if (error) {
          console.warn('Could not query client_invitations:', error);
        }

        if (invitation) {
          // Only block already-used invitations if NOT returning from payment
          if (!isPaymentSuccess && invitation.status === 'accepted') {
            setInvitationError('This invitation has already been used.');
            setLoading(false);
            return;
          }
          if (!isPaymentSuccess && (invitation.status === 'expired' || (invitation.expires_at && new Date(invitation.expires_at) < new Date()))) {
            setInvitationError('This invitation has expired.');
            setLoading(false);
            return;
          }

          let planData = null;
          if (invitation.plan_id) {
            const { data: plan } = await supabase
              .from('Plans')
              .select('*')
              .eq('whalesync_postgres_id', invitation.plan_id)
              .maybeSingle();
            planData = plan;
          }

          setInvitationData({
            companyName: invitation.company_name,
            clientName: invitation.contact_name,
            clientEmail: invitation.contact_email,
            membershipId: invitation.membership_id,
            planId: invitation.plan_id,
            plan: planData ? {
              name: planData.plan_name || 'Plan',
              price: planData.monthly_price_ht ? `€${Number(planData.monthly_price_ht).toLocaleString()}` : null,
              priceRaw: planData.monthly_price_ht,
              stripePriceId: planData.stripe_price_id,
              features: [
                `${planData.tasks_at_once || 1} active task${(planData.tasks_at_once || 1) > 1 ? 's' : ''}`,
                `${planData.delivery_sla_business_days || 3} business days turnaround`,
                'Unlimited revisions',
                'Dedicated support',
              ]
            } : null
          });

          // If returning from successful payment, create Agreements record and mark success
          if (isPaymentSuccess) {
            setAccountCreated(true);
            // Create Agreements record so the client shows up in the Customers tab
            try {
              // Check if agreement already exists for this membership
              const { data: existingAgreement } = await supabase
                .from('Agreements')
                .select('id')
                .eq('client_memberships', invitation.membership_id)
                .maybeSingle();

              if (!existingAgreement) {
                await supabase.from('Agreements').insert([{
                  client_memberships: invitation.membership_id,
                  plans: invitation.plan_id || null,
                  status: 'Active',
                  custom_price_ht: planData?.monthly_price_ht || null,
                  start_date: new Date().toISOString().split('T')[0],
                }]);
                console.log('Agreement record created for membership:', invitation.membership_id);
              }
            } catch (agreementErr) {
              console.warn('Could not create agreement record:', agreementErr);
              // Non-blocking — the client account is already functional
            }
          }
        } else if (isPaymentSuccess) {
          // Returning from payment but can't find invitation — still show success
          setAccountCreated(true);
        } else {
          setInvitationError('Invitation not found. Please contact your account manager.');
        }
      } catch (err) {
        console.error('Error loading invitation:', err);
        if (isPaymentSuccess) {
          setAccountCreated(true); // Still show success even if invitation lookup fails
        } else {
          setInvitationError('Failed to load invitation. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, isPaymentSuccess]);

  const handleSetupAccount = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.clientEmail,
        password: formData.password,
        options: {
          data: {
            full_name: invitationData.clientName,
            company_name: invitationData.companyName,
          }
        }
      });

      if (authError) throw authError;

      try {
        await supabase
          .from('client_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('token', token);
      } catch {}

      if (invitationData.plan?.stripePriceId && invitationData.membershipId) {
        const successUrl = `${window.location.origin}/activate/${token}?payment=success`;
        const cancelUrl = `${window.location.origin}/activate/${token}?payment=cancelled`;

        const result = await createCheckoutSession(
          invitationData.membershipId,
          invitationData.planId,
          successUrl,
          cancelUrl
        );

        if (result.url) {
          window.location.href = result.url;
          return;
        } else {
          console.warn('Stripe checkout session failed:', result.error);
          toast.warning('Account created! Stripe checkout could not be started. Contact your account manager.');
          setAccountCreated(true);
        }
      } else {
        toast.success('Account created successfully!');
        setAccountCreated(true);
      }
    } catch (error) {
      console.error('Account setup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={24} className="text-[#D08B00] animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 text-sm">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (invitationError) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="px-8 py-6">
          <img src={logoSmall} alt="Dafolle" className="h-5 w-fit" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Lastik', serif" }}>
              Invalid Invitation
            </h2>
            <p className="text-neutral-500 text-sm mb-8">{invitationError}</p>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-[#D08B00] hover:text-[#E09B10] transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success view after payment — ask to confirm email
  if (accountCreated) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="px-8 py-6">
          <img src={logoSmall} alt="Dafolle" className="h-5 w-fit" />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center auth-view-enter">
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-[#D08B00]/10 flex items-center justify-center mx-auto mb-6 auth-stagger auth-stagger-1">
              <Check size={28} className="text-[#D08B00]" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 auth-stagger auth-stagger-2" style={{ fontFamily: "'Lastik', serif" }}>
              You're all set
            </h2>
            <p className="text-neutral-500 text-sm mb-10 auth-stagger auth-stagger-3">
              Your account has been created and your subscription is now active.
            </p>

            {/* Confirm email card */}
            <div className="bg-[#2E2D2C40] border border-neutral-800 rounded-xl p-6 mb-8 text-left auth-stagger auth-stagger-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#D08B00]/10 flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-[#D08B00]" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium mb-1">Confirm your email</p>
                  <p className="text-neutral-500 text-xs leading-relaxed">
                    We've sent a confirmation link to <span className="text-neutral-300">{invitationData?.clientEmail || 'your email'}</span>.
                    Please check your inbox and confirm your email before signing in.
                  </p>
                </div>
              </div>
            </div>

            {/* What's included */}
            <div className="space-y-3 mb-10 auth-stagger auth-stagger-5">
              {[
                'Access your project dashboard',
                'Submit and track deliverables',
                'Collaborate with your design team',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-left">
                  <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                    <Check size={10} className="text-neutral-400" />
                  </div>
                  <span className="text-neutral-400 text-sm">{item}</span>
                </div>
              ))}
            </div>

            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[#D08B00] hover:text-[#E09B10] transition-colors auth-stagger auth-stagger-6"
            >
              Go to Sign In
              <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800">
          <div className="px-8 py-4">
            <p className="text-neutral-600 text-xs">&copy;Dafolle 2026 - All rights reserved</p>
          </div>
        </div>
      </div>
    );
  }

  // Account setup form
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="px-8 py-6">
        <img src={logoSmall} alt="Dafolle" className="h-5 w-fit" />
      </div>

      <div className="flex-1 flex items-center justify-center pb-12">
        <div className="w-full max-w-sm mx-auto px-6 auth-view-enter">
          {/* Header */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 auth-stagger auth-stagger-1" style={{ fontFamily: "'Lastik', serif" }}>
            Set up your account
          </h1>
          <p className="text-[#BFBBB5] text-sm mb-8 auth-stagger auth-stagger-2">
            {invitationData?.companyName ? (
              <>Welcome to <span className="text-white">{invitationData.companyName}</span>'s workspace.</>
            ) : (
              'Create your password to get started.'
            )}
          </p>

          {/* Plan pill */}
          {invitationData?.plan && (
            <div className="bg-[#2E2D2C40] border border-neutral-800 rounded-xl p-4 mb-8 auth-stagger auth-stagger-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{invitationData.plan.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {invitationData.plan.features?.slice(0, 2).map((f, i) => (
                      <span key={i} className="text-neutral-500 text-xs">{f}</span>
                    ))}
                  </div>
                </div>
                {invitationData.plan.price && (
                  <div className="text-right">
                    <p className="text-white text-lg font-semibold">{invitationData.plan.price}</p>
                    <p className="text-neutral-600 text-xs">/month</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSetupAccount} className="space-y-4 auth-stagger auth-stagger-4">
            {/* Email - read only */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">Email</label>
              <input
                type="email"
                value={invitationData?.clientEmail || ''}
                disabled
                className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 py-3 text-neutral-500 text-sm cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 pr-12 py-3 text-white placeholder-neutral-600 focus:outline-none transition-all auth-input-glow"
                  placeholder="Min. 8 characters"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 pr-12 py-3 text-white placeholder-neutral-600 focus:outline-none transition-all auth-input-glow"
                  placeholder="Re-enter your password"
                  minLength={8}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#D08B00] hover:bg-[#E09B10] text-white py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 auth-btn-press"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Continue to Payment
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Stripe note */}
          <p className="text-neutral-600 text-xs text-center mt-6 auth-stagger auth-stagger-5">
            <Lock size={10} className="inline mr-1 -mt-0.5" />
            You'll be redirected to Stripe for secure payment
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800">
        <div className="px-8 py-4">
          <p className="text-neutral-600 text-xs">&copy;Dafolle 2026 - All rights reserved</p>
        </div>
      </div>
    </div>
  );
};
