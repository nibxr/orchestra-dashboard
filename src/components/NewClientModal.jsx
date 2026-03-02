import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';

/**
 * NewClientModal - Admin creates real client invitations
 * Creates: client_memberships record, client_contacts record, client_invitations record
 * Then generates an activation link for the client to set up their account + pay via Stripe
 */
export const NewClientModal = ({ isOpen, onClose, onInvite, availablePlans = [], teamMemberId, onDataRefresh }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [invitationResult, setInvitationResult] = useState(null); // { link, token }
  const [formData, setFormData] = useState({
    companyName: '',
    clientName: '',
    clientEmail: '',
    planId: null
  });

  // Process plans from the DB — map Airtable/WhaleSync fields to usable format
  const plans = useMemo(() => {
    return (availablePlans || [])
      .filter(p => p.stripe_price_id) // Only plans with Stripe integration
      .map(p => ({
        id: p.whalesync_postgres_id || p.id,
        name: p.plan_name || 'Plan',
        price: p.monthly_price_ht ? `€${Number(p.monthly_price_ht).toLocaleString()}` : null,
        priceRaw: p.monthly_price_ht || 0,
        maxActiveTasks: p.tasks_at_once || 1,
        deliverySlaDays: p.delivery_sla_business_days || 3,
        stripePriceId: p.stripe_price_id,
        description: p.description || null,
      }))
      .sort((a, b) => a.priceRaw - b.priceRaw);
  }, [availablePlans]);

  // Auto-select first plan if none selected
  const selectedPlanId = formData.planId || (plans.length > 0 ? plans[0].id : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }

    setLoading(true);
    try {
      // 1. Create client_memberships record
      const { data: membership, error: membershipError } = await supabase
        .from('client_memberships')
        .insert([{
          client_name: formData.companyName,
          plan_from_agreements: selectedPlanId,
          status: 'Pending',
        }])
        .select()
        .single();

      if (membershipError) throw membershipError;

      // 2. Create client_contacts record
      const { error: contactError } = await supabase
        .from('client_contacts')
        .insert([{
          full_name: formData.clientName,
          email: formData.clientEmail,
          membership_id: membership.id,
        }])
        .select()
        .single();

      if (contactError) throw contactError;

      // 3. Generate invitation token and create client_invitations record
      const invitationToken = `inv_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID().split('-')[0] : Math.random().toString(36).substr(2, 9)}`;
      const invitationLink = `${window.location.origin}/activate/${invitationToken}`;

      const { error: invitationError } = await supabase
        .from('client_invitations')
        .insert([{
          token: invitationToken,
          company_name: formData.companyName,
          contact_name: formData.clientName,
          contact_email: formData.clientEmail,
          plan_id: selectedPlanId,
          membership_id: membership.id,
          invited_by: teamMemberId || null,
          status: 'pending',
        }]);

      if (invitationError) {
        console.warn('Failed to save invitation record (table may not exist yet):', invitationError);
        // Non-blocking: invitation tracking table may not be deployed yet
      }

      // Copy link to clipboard
      try {
        await navigator.clipboard?.writeText(invitationLink);
      } catch {}

      setInvitationResult({ link: invitationLink, token: invitationToken });
      toast.success('Client created! Invitation link copied to clipboard.');

      // Call parent callback
      if (onInvite) {
        onInvite({
          ...formData,
          planId: selectedPlanId,
          membershipId: membership.id,
          invitationToken,
          invitationLink,
        });
      }

      // Refresh data in parent
      if (onDataRefresh) onDataRefresh();

    } catch (error) {
      console.error('Failed to create client:', error);
      toast.error(`Failed to create client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ companyName: '', clientName: '', clientEmail: '', planId: null });
    setInvitationResult(null);
    onClose();
  };

  const handleCopyLink = async () => {
    if (invitationResult?.link) {
      try {
        await navigator.clipboard.writeText(invitationResult.link);
        toast.success('Link copied!');
      } catch {
        toast.error('Failed to copy');
      }
    }
  };

  if (!isOpen) return null;

  // Success state — show invitation link
  if (invitationResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl w-full max-w-lg m-4 animate-scale-in" onClick={e => e.stopPropagation()}>
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="check-01" size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Client Created</h2>
            <p className="text-sm text-neutral-500 mb-6">
              Share this activation link with <strong className="text-neutral-900 dark:text-white">{formData.clientName}</strong>. They'll set up their account and subscribe via Stripe.
            </p>

            <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 flex items-center gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={invitationResult.link}
                className="flex-1 bg-transparent text-xs text-neutral-600 dark:text-neutral-300 outline-none font-mono truncate"
              />
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                title="Copy link"
              >
                <Icon name="copy-right" size={14} className="text-neutral-500" />
              </button>
            </div>

            <div className="flex items-center gap-3 justify-center">
              <a
                href={`mailto:${formData.clientEmail}?subject=${encodeURIComponent(`Your ${formData.companyName} design dashboard is ready`)}&body=${encodeURIComponent(`Hi ${formData.clientName},\n\nYour Dafolle Studio dashboard is ready! Click the link below to set up your account and activate your subscription:\n\n${invitationResult.link}\n\nThis link will let you:\n- Create your login credentials\n- Subscribe to your selected plan via Stripe\n- Access your project dashboard\n\nLooking forward to working with you!\n\nBest,\nThe Dafolle Team`)}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all"
              >
                <Icon name="send-01" size={14} />
                Send Email
              </a>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Invite New Client</h2>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Icon name="x-01" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Client Information */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">Client Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-500 font-medium mb-2 block">Company Name *</label>
                  <div className="relative">
                    <Icon name="bank" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-neutral-900 dark:text-neutral-300 text-sm placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 font-medium mb-2 block">Contact Name *</label>
                    <div className="relative">
                      <Icon name="user-profile-01" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-neutral-900 dark:text-neutral-300 text-sm placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                        placeholder="John Smith"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 font-medium mb-2 block">Email Address *</label>
                    <div className="relative">
                      <Icon name="mail-01" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="email"
                        required
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-neutral-900 dark:text-neutral-300 text-sm placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                        placeholder="john@acme.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">Select Plan</h3>
              {plans.length === 0 ? (
                <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 text-center">
                  <Icon name="lightning-01" size={24} className="mx-auto mb-2 text-neutral-400" />
                  <p className="text-sm text-neutral-500">No plans with Stripe integration found.</p>
                  <p className="text-xs text-neutral-400 mt-1">Add <code className="bg-neutral-200 dark:bg-neutral-800 px-1 rounded">stripe_price_id</code> to your Plans table.</p>
                </div>
              ) : (
                <div className={`grid grid-cols-1 ${plans.length >= 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2' : ''} gap-4`}>
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setFormData({ ...formData, planId: plan.id })}
                      className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPlanId === plan.id
                          ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-center mb-3">
                        <h4 className="text-neutral-900 dark:text-white font-semibold mb-1 text-sm">{plan.name}</h4>
                        {plan.price && (
                          <div className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                            {plan.price}
                            <span className="text-xs text-neutral-500 font-normal">/month</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-xs text-neutral-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-neutral-500"></div>
                          {plan.maxActiveTasks} active task{plan.maxActiveTasks > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-neutral-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-neutral-500"></div>
                          {plan.deliverySlaDays} business days turnaround
                        </div>
                      </div>

                      {selectedPlanId === plan.id && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <Icon name="check-01" size={12} className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || plans.length === 0}
              className="px-6 py-2.5 text-sm bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Icon name="loader-01" size={14} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create & Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
