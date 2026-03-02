import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';

const TIME_OPTIONS = [
    { value: 'XS', label: 'XS', description: '< 1h' },
    { value: 'S', label: 'S', description: '< 2h' },
    { value: 'M', label: 'M', description: '< 4h' },
    { value: 'L', label: 'L', description: '< 6h' },
    { value: 'XL', label: 'XL', description: '< 8h' },
    { value: 'XXL', label: 'XXL', description: '> 8h (resize needed)' }
];

const DELIVERY_STATUS_OPTIONS = [
    { value: 'on_time', label: 'On time' },
    { value: 'early', label: 'Early' },
    { value: 'late', label: 'Late' }
];

const TASK_TYPE_OPTIONS = [
    'Design',
    'Motion',
    'Development',
    'Strategy',
    'Branding',
    'Other'
];

const StarRating = ({ value, onChange, label }) => {
    const [hovered, setHovered] = useState(0);

    return (
        <div className="space-y-2">
            <label className="text-sm text-neutral-400">{label}</label>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                    >
                        <Icon
                            name="star-01"
                            size={24}
                            className={`transition-colors ${
                                star <= (hovered || value)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-neutral-600'
                            }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

export const DeliverablesForm = ({ isOpen, onClose, task, onSave }) => {
    const toast = useToast();
    const { teamMemberId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [existingDeliverable, setExistingDeliverable] = useState(null);

    const [formData, setFormData] = useState({
        time_spent: '',
        days_active: '',
        task_type: '',
        delivery_status: '',
        timing_notes: '',
        brief_quality: 0,
        deliverable_quality: 0,
        sent_feedback_form: false,
        deliverable_link: '',
        claap_video_link: '',
        claap_transcript: '',
        next_steps: '',
        additional_notes: ''
    });

    // Load existing deliverable if exists
    useEffect(() => {
        if (isOpen && task?.id) {
            loadExistingDeliverable();
        }
    }, [isOpen, task?.id]);

    const loadExistingDeliverable = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('deliverables')
                .select('*')
                .eq('task_id', task.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setExistingDeliverable(data);
                setFormData({
                    time_spent: data.time_spent || '',
                    days_active: data.days_active || '',
                    task_type: data.task_type || '',
                    delivery_status: data.delivery_status || '',
                    timing_notes: data.timing_notes || '',
                    brief_quality: data.brief_quality || 0,
                    deliverable_quality: data.deliverable_quality || 0,
                    sent_feedback_form: data.sent_feedback_form || false,
                    deliverable_link: data.deliverable_link || '',
                    claap_video_link: data.claap_video_link || '',
                    claap_transcript: data.claap_transcript || '',
                    next_steps: data.next_steps || '',
                    additional_notes: data.additional_notes || ''
                });
            }
        } catch (error) {
            console.error('Error loading deliverable:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                task_id: task.id,
                ...formData,
                days_active: formData.days_active ? parseInt(formData.days_active) : null,
                brief_quality: formData.brief_quality || null,
                deliverable_quality: formData.deliverable_quality || null,
                completed_by: teamMemberId,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            let result;
            if (existingDeliverable) {
                // Update existing
                const { data, error } = await supabase
                    .from('deliverables')
                    .update(payload)
                    .eq('id', existingDeliverable.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Create new
                payload.created_at = new Date().toISOString();
                const { data, error } = await supabase
                    .from('deliverables')
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            toast.success('Deliverables saved successfully');
            onSave?.(result);
            onClose();
        } catch (error) {
            console.error('Error saving deliverable:', error);
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-2xl max-h-[90vh] bg-[#0f0f0f] theme-bg-primary border border-neutral-800 rounded-xl shadow-2xl flex flex-col animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white">Deliverables Form</h2>
                        <p className="text-sm text-neutral-500 mt-0.5">{task?.title}</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
                        <Icon name="x-01" size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-12">
                        <Icon name="loader-01" size={32} className="animate-spin text-neutral-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 space-y-6">
                            {/* Auto-populated fields (read-only) */}
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 space-y-3">
                                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">Task Info</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-neutral-500">Task:</span>
                                        <span className="ml-2 text-white">{task?.title}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500">Designer:</span>
                                        <span className="ml-2 text-white">{task?.assigneeName || 'Unassigned'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500">Client:</span>
                                        <span className="ml-2 text-white">{task?.clientName || 'Internal'}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500">Activated:</span>
                                        <span className="ml-2 text-white">
                                            {task?.activated_at
                                                ? new Date(task.activated_at).toLocaleDateString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Time Spent */}
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400 flex items-center gap-2">
                                    <Icon name="clock-01" size={14} />
                                    Time Spent on Deliverable *
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {TIME_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateField('time_spent', opt.value)}
                                            className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                                                formData.time_spent === opt.value
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                                            }`}
                                        >
                                            <span className="font-medium">{opt.label}</span>
                                            <span className="text-xs ml-1 opacity-70">({opt.description})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Days Active */}
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400">
                                    Days in Active Task (excluding weekends) *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.days_active}
                                    onChange={e => updateField('days_active', e.target.value)}
                                    placeholder="Enter number of days"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                                />
                            </div>

                            {/* Task Type */}
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400 flex items-center gap-2">
                                    <Icon name="file-01" size={14} />
                                    Task Type *
                                </label>
                                <select
                                    value={formData.task_type}
                                    onChange={e => updateField('task_type', e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-neutral-500"
                                >
                                    <option value="">Select type...</option>
                                    {TASK_TYPE_OPTIONS.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Delivery Status */}
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400">Delivered on time? *</label>
                                <div className="flex gap-2">
                                    {DELIVERY_STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateField('delivery_status', opt.value)}
                                            className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                                                formData.delivery_status === opt.value
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Timing Notes */}
                            <div className="space-y-2">
                                <label className="text-sm text-neutral-400">Timing Notes *</label>
                                <textarea
                                    value={formData.timing_notes}
                                    onChange={e => updateField('timing_notes', e.target.value)}
                                    placeholder="Any notes about the timing..."
                                    rows={3}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
                                />
                            </div>

                            {/* Quality Ratings */}
                            <div className="grid grid-cols-2 gap-6">
                                <StarRating
                                    label="Brief Quality (1-5)"
                                    value={formData.brief_quality}
                                    onChange={val => updateField('brief_quality', val)}
                                />
                                <StarRating
                                    label="Deliverable Quality (1-5)"
                                    value={formData.deliverable_quality}
                                    onChange={val => updateField('deliverable_quality', val)}
                                />
                            </div>

                            {/* Sent Feedback Form */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => updateField('sent_feedback_form', !formData.sent_feedback_form)}
                                    className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                                        formData.sent_feedback_form
                                            ? 'bg-lime-500 border-lime-500 text-black'
                                            : 'bg-neutral-900 border-neutral-700'
                                    }`}
                                >
                                    {formData.sent_feedback_form && <Icon name="check-01" size={14} />}
                                </button>
                                <label className="text-sm text-neutral-300">
                                    I will send the feedback form to the client
                                </label>
                            </div>

                            {/* Links Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                    <Icon name="link" size={14} />
                                    Links & Resources
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-neutral-500 mb-1 block">Deliverable Link (Figma/Frame.io) *</label>
                                        <input
                                            type="url"
                                            value={formData.deliverable_link}
                                            onChange={e => updateField('deliverable_link', e.target.value)}
                                            placeholder="https://figma.com/..."
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-neutral-500 mb-1 block">Claap Video Link</label>
                                        <input
                                            type="url"
                                            value={formData.claap_video_link}
                                            onChange={e => updateField('claap_video_link', e.target.value)}
                                            placeholder="https://app.claap.io/..."
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-neutral-500 mb-1 block">Claap Transcript</label>
                                        <textarea
                                            value={formData.claap_transcript}
                                            onChange={e => updateField('claap_transcript', e.target.value)}
                                            placeholder="Paste transcript here..."
                                            rows={3}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                    <Icon name="message-square" size={14} />
                                    Notes
                                </h3>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-neutral-500 mb-1 block">Next Steps</label>
                                        <textarea
                                            value={formData.next_steps}
                                            onChange={e => updateField('next_steps', e.target.value)}
                                            placeholder="What are the next steps for this project?"
                                            rows={3}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-neutral-500 mb-1 block">Additional Notes</label>
                                        <textarea
                                            value={formData.additional_notes}
                                            onChange={e => updateField('additional_notes', e.target.value)}
                                            placeholder="Any other notes..."
                                            rows={3}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between bg-[#0f0f0f] theme-bg-primary shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-white text-black font-bold text-sm rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Icon name="loader-01" size={14} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="check-01" size={14} />
                                        Save Deliverables
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DeliverablesForm;
