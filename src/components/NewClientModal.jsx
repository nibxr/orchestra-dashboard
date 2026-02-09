import React, { useState } from 'react';
import { X, Building2, Mail, User } from 'lucide-react';

/**
 * NewClientModal - Team creates client invitations
 * Demo version with mock Stripe plans
 */
export const NewClientModal = ({ isOpen, onClose, onInvite }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    clientName: '',
    clientEmail: '',
    planId: 'start'
  });

  // Dafolle pricing plans
  const plans = [
    {
      id: 'start',
      name: 'Dafolle Start',
      price: '$4,000',
      description: 'Perfect to get started',
      features: ['1 task every 72 hours', 'Unlimited revisions', 'Dedicated Slack channel']
    },
    {
      id: 'grow',
      name: 'Dafolle Grow',
      price: '$6,000',
      description: 'For growing businesses',
      features: ['1 task every 48 hours', 'Unlimited revisions', 'Dedicated Slack channel', 'Priority support'],
      popular: true
    },
    {
      id: 'boost',
      name: 'Dafolle Boost',
      price: '$11,000',
      description: 'Maximum productivity',
      features: ['2 tasks every 48 hours', 'Unlimited revisions', 'Dedicated Slack channel', 'Priority support', 'Dedicated account manager']
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Generate a mock invitation token
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invitationLink = `${window.location.origin}/activate/${invitationToken}`;

    // Demo: Show the invitation link
    alert(`Invitation created!\n\nInvitation link:\n${invitationLink}\n\n(In production, this would be emailed to ${formData.clientEmail})`);

    // Call parent callback
    if (onInvite) {
      onInvite({
        ...formData,
        invitationToken,
        invitationLink
      });
    }

    // Reset and close
    setFormData({
      companyName: '',
      clientName: '',
      clientEmail: '',
      planId: 'start'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1a1a1a] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-xl font-semibold text-white">Invite New Client</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Client Details */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-white mb-4">Client Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-500 font-medium mb-2 block">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-500 font-medium mb-2 block">
                    Contact Name *
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-500 font-medium mb-2 block">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-neutral-300 text-sm placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                      placeholder="john@acme.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div>
              <h3 className="text-sm font-medium text-white mb-4">Select Plan</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setFormData({ ...formData, planId: plan.id })}
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                      formData.planId === plan.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h4 className="text-white font-semibold mb-1">{plan.name}</h4>
                      <div className="text-2xl font-bold text-white mb-1">
                        {plan.price}
                        <span className="text-sm text-neutral-500 font-normal">/month</span>
                      </div>
                      <p className="text-xs text-neutral-500">{plan.description}</p>
                    </div>

                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="text-xs text-neutral-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-neutral-600"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {formData.planId === plan.id && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
