import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Lock, ExternalLink } from 'lucide-react';

/**
 * ClientActivation - Client activation and Stripe checkout flow
 * Uses Stripe Checkout for secure payment processing
 */
export const ClientActivation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Check for successful payment on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';

    if (paymentSuccess) {
      setAccountCreated(true);
    }
  }, []);

  // Mock: Load invitation data
  useEffect(() => {
    setTimeout(() => {
      // Mock invitation data
      setInvitationData({
        companyName: 'Acme Inc.',
        clientName: 'John Smith',
        clientEmail: 'john@acme.com',
        plan: {
          id: 'grow',
          name: 'Dafolle Grow',
          price: '$6,000',
          priceId: 'price_1234567890', // Stripe Price ID (mock)
          features: ['1 task every 48 hours', 'Unlimited revisions', 'Dedicated Slack channel', 'Priority support']
        }
      });
      setLoading(false);
    }, 1000);
  }, [token]);

  const handleSetupAccount = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    setLoading(true);

    // TODO: Create user account in database
    // const { data, error } = await supabase.auth.signUp({
    //   email: invitationData.clientEmail,
    //   password: formData.password
    // });

    // Mock: Simulate account creation
    setTimeout(() => {
      setLoading(false);
      // Redirect to Stripe Checkout
      redirectToStripeCheckout();
    }, 1000);
  };

  const redirectToStripeCheckout = () => {
    // TODO: Replace with actual Stripe Checkout session creation
    // In production, you'll:
    // 1. Call your backend to create a Stripe Checkout session
    // 2. Backend returns the session URL
    // 3. Redirect user to that URL

    // Mock Stripe Checkout URL
    // In production this would be: window.location.href = checkoutSession.url

    // For demo purposes, simulate the redirect by showing success
    // In real implementation, user would go to Stripe, pay, then return to success URL
    console.log('Redirecting to Stripe Checkout...');
    console.log('Price ID:', invitationData.plan.priceId);
    console.log('Return URL:', `${window.location.origin}/activate/${token}?payment=success`);

    // DEMO: Simulate successful payment return
    setTimeout(() => {
      setAccountCreated(true);
    }, 2000);
  };

  const handleGetStarted = () => {
    // Navigate to dashboard
    navigate('/');
  };

  if (loading && !invitationData) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Success view after payment
  if (accountCreated) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
        {/* Header */}
        <div className="border-b border-neutral-800 bg-[#1a1a1a]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <h1 className="text-xl font-semibold text-white">DAF OS</h1>
          </div>
        </div>

        {/* Success Content */}
        <div className="flex-1 py-12 flex items-center justify-center">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-white" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-3">Welcome to DAF OS!</h2>
            <p className="text-neutral-400 mb-8 max-w-md mx-auto">
              Your account has been created and your subscription is now active. Let's get started with your first project!
            </p>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8 text-left max-w-md mx-auto">
              <h3 className="text-white font-semibold mb-4">What's next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Access your dashboard</p>
                    <p className="text-neutral-500 text-xs">View all your projects and tasks</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Collaborate with your team</p>
                    <p className="text-neutral-500 text-xs">Invite team members and start working</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check size={20} className="text-green-500 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Track your deliverables</p>
                    <p className="text-neutral-500 text-xs">Monitor progress and manage tasks</p>
                  </div>
                </li>
              </ul>
            </div>

            <button
              onClick={handleGetStarted}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 bg-[#1a1a1a]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <p className="text-xs text-neutral-600 text-center">
              © 2024 DAF OS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-white">DAF OS</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-12">
        <div className="max-w-2xl mx-auto px-6">
          {/* Account Setup Form */}
          {!loading && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to DAF OS!</h2>
                <p className="text-neutral-400">
                  You've been invited by your team to join <strong className="text-white">{invitationData?.companyName}</strong>
                </p>
              </div>

              {/* Plan Summary */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold mb-1">{invitationData?.plan.name} Plan</h3>
                    <p className="text-2xl font-bold text-white">
                      {invitationData?.plan.price}
                      <span className="text-sm text-neutral-500 font-normal">/month</span>
                    </p>
                  </div>
                  <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                    Selected
                  </div>
                </div>
                <ul className="space-y-2">
                  {invitationData?.plan.features.map((feature, index) => (
                    <li key={index} className="text-sm text-neutral-400 flex items-center gap-2">
                      <Check size={16} className="text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Account Form */}
              <form onSubmit={handleSetupAccount} className="space-y-6">
                <div>
                  <label className="text-sm text-neutral-400 font-medium mb-2 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={invitationData?.clientEmail}
                    disabled
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm text-neutral-400 font-medium mb-2 block">
                    Create Password *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                      placeholder="Enter a secure password"
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-neutral-400 font-medium mb-2 block">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                      placeholder="Confirm your password"
                      minLength={8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Continue to Stripe Checkout
                      <ExternalLink size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Security Note */}
              <div className="mt-8 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm text-white font-medium mb-1">Secure Payment via Stripe</p>
                    <p className="text-xs text-neutral-500">
                      After creating your account, you'll be redirected to Stripe's secure checkout page to complete your payment.
                      We never store your payment information on our servers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-xs text-neutral-600 text-center">
            © 2024 DAF OS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
