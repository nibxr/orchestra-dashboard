import React, { useState, useEffect } from 'react';
import {
  Upload, Building2, Globe, Mail, Palette, Save,
  UserPlus, MoreHorizontal, Trash2, Check, X,
  Columns, Plus, GripVertical, ArrowUp, ArrowDown,
  CreditCard, Layout, Zap,
  Link as LinkIcon, User, Lock, LogOut, AlertCircle,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { STATUS_CONFIG } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './Shared';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';

// --- PROFILE SETTINGS ---
export const ProfileSettingsView = () => {
    const { user, updateProfile, updatePassword, signOut, userRole } = useAuth();
    const toast = useToast();
    const { confirm } = useConfirm();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [teamMember, setTeamMember] = useState(null);
    const [profileData, setProfileData] = useState({
        full_name: '',
        avatar_url: ''
    });
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Fetch user data on mount - from client_contacts for customers, team for designers
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user?.email) return;

            if (userRole === 'customer') {
                const { data } = await supabase
                    .from('client_contacts')
                    .select('id, full_name, email')
                    .eq('email', user.email)
                    .maybeSingle();
                if (data) {
                    setTeamMember({ id: data.id, full_name: data.full_name, email: data.email, status: 'Active' });
                    setProfileData({
                        full_name: data.full_name || user?.user_metadata?.full_name || '',
                        avatar_url: user?.user_metadata?.avatar_url || ''
                    });
                } else {
                    setProfileData({
                        full_name: user?.user_metadata?.full_name || '',
                        avatar_url: user?.user_metadata?.avatar_url || ''
                    });
                }
            } else {
                const { data } = await supabase
                    .from('team')
                    .select('id, full_name, avatar_url, profil_pic, email, status')
                    .eq('email', user.email)
                    .maybeSingle();
                if (data) {
                    setTeamMember(data);
                    setProfileData({
                        full_name: data.full_name || user?.user_metadata?.full_name || '',
                        avatar_url: data.avatar_url || data.profil_pic || user?.user_metadata?.avatar_url || ''
                    });
                } else {
                    setProfileData({
                        full_name: user?.user_metadata?.full_name || '',
                        avatar_url: user?.user_metadata?.avatar_url || ''
                    });
                }
            }
        };
        fetchUserData();
    }, [user?.email, userRole]);

    const displayName = profileData.full_name || user?.email || 'User';
    const displayAvatar = profileData.avatar_url;

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be under 2MB');
            return;
        }

        setAvatarUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
            toast.success('Avatar uploaded');
        } catch (err) {
            // If storage bucket doesn't exist, fall back to URL input
            console.warn('Avatar upload failed, using URL input instead:', err.message);
            toast.error('Upload not available — enter a URL instead');
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            // Update Supabase Auth user_metadata
            const { error } = await updateProfile({
                full_name: profileData.full_name,
                avatar_url: profileData.avatar_url
            });
            if (error) throw error;

            // Also update the appropriate table record
            if (teamMember?.id) {
                if (userRole === 'customer') {
                    const { error: contactError } = await supabase
                        .from('client_contacts')
                        .update({ full_name: profileData.full_name })
                        .eq('id', teamMember.id);
                    if (contactError) console.warn('Contact table update failed:', contactError.message);
                } else {
                    const { error: teamError } = await supabase
                        .from('team')
                        .update({
                            full_name: profileData.full_name,
                            avatar_url: profileData.avatar_url
                        })
                        .eq('id', teamMember.id);
                    if (teamError) console.warn('Team table update failed:', teamError.message);
                }
            }

            toast.success('Profile updated');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await updatePassword(passwordData.newPassword);
            if (error) throw error;

            toast.success('Password updated');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleSignOut = async () => {
        const confirmed = await confirm({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out?',
            confirmText: 'Sign Out',
            cancelText: 'Cancel',
            variant: 'info'
        });

        if (confirmed) {
            await signOut();
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 animate-fade-in pb-24">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">Profile</h1>
                <p className="text-sm text-neutral-400">Manage your personal account settings.</p>
            </div>

            {/* Avatar & Identity Section */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-5">
                    {/* Avatar with upload */}
                    <div className="relative group">
                        <Avatar
                            name={displayName}
                            url={displayAvatar}
                            size="2xl"
                        />
                        <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            {avatarUploading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Upload size={16} className="text-white" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                                disabled={avatarUploading}
                            />
                        </label>
                    </div>

                    {/* Identity info */}
                    <div className="flex-1 min-w-0 pt-1">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">{displayName}</h2>
                        <p className="text-sm text-neutral-400 truncate">{user?.email}</p>
                        {teamMember?.status && (
                            <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {teamMember.status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Avatar URL fallback input */}
                <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                    <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                        Avatar URL
                    </label>
                    <input
                        type="text"
                        value={profileData.avatar_url}
                        onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2 px-3 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1.5">Or upload an image by hovering over your avatar</p>
                </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-5">Personal Information</h3>

                <div className="space-y-5">
                    {/* Full Name */}
                    <div>
                        <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={profileData.full_name}
                            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                            placeholder="Your full name"
                            className="w-full bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full bg-neutral-100 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-neutral-400 cursor-not-allowed"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1.5">Email cannot be changed</p>
                    </div>
                </div>

                <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                        onClick={handleUpdateProfile}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                        ) : (
                            <Save size={14} />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-5">Change Password</h3>

                <div className="space-y-5">
                    <div>
                        <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                        />
                    </div>
                </div>

                {/* Password strength indicator */}
                {passwordData.newPassword && (
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex-1 flex gap-1">
                                {[1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-colors ${
                                            passwordData.newPassword.length >= i * 3
                                                ? passwordData.newPassword.length >= 12 ? 'bg-emerald-500' : passwordData.newPassword.length >= 8 ? 'bg-amber-500' : 'bg-red-500'
                                                : 'bg-neutral-200 dark:bg-neutral-800'
                                        }`}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] text-neutral-400">
                                {passwordData.newPassword.length < 6 ? 'Too short' : passwordData.newPassword.length < 8 ? 'Weak' : passwordData.newPassword.length < 12 ? 'Good' : 'Strong'}
                            </span>
                        </div>
                        {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                            <p className="text-[11px] text-red-500 flex items-center gap-1">
                                <X size={12} /> Passwords don&apos;t match
                            </p>
                        )}
                        {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && passwordData.newPassword.length >= 6 && (
                            <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                                <Check size={12} /> Passwords match
                            </p>
                        )}
                    </div>
                )}

                <div className="flex justify-end pt-5 mt-5 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                        onClick={handleUpdatePassword}
                        disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 6}
                        className="flex items-center gap-2 px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                        {passwordLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                        ) : (
                            <Lock size={14} />
                        )}
                        Update Password
                    </button>
                </div>
            </div>

            {/* Sign Out */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">Sign Out</h3>
                        <p className="text-xs text-neutral-400">Sign out of your account on this device.</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition-all active:scale-[0.97]"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- AGENCY SETTINGS (Branding) ---
export const AgencySettingsView = () => {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: 'Dafolle',
        slug: 'dafolle',
        supportEmail: 'support@dafolle.io',
        brandColor: '#a3e635',
        logoUrl: null
    });
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        const saved = localStorage.getItem('orchestra_agency_settings');
        if (saved) setFormData(JSON.parse(saved));
    }, []);

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Convert to base64 and store
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData({ ...formData, logoUrl: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            localStorage.setItem('orchestra_agency_settings', JSON.stringify(formData));
            setLoading(false);
            const btn = document.getElementById('save-btn');
            if(btn) {
                const originalText = btn.innerText;
                btn.innerText = 'Saved!';
                setTimeout(() => btn.innerText = originalText, 2000);
            }
        }, 800);
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in pb-24">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Agency Settings</h1>
                <p className="text-neutral-500 text-sm">Manage your agency's branding and public profile.</p>
            </div>

            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 mb-8">
                <h3 className="text-sm font-bold text-white mb-1">Agency Logo</h3>
                <p className="text-xs text-neutral-500 mb-4">This logo will appear on your dashboard and client portals.</p>
                <div className="flex items-center gap-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                    >
                        {formData.logoUrl ? (
                            <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="text-neutral-700" size={32} />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="text-white" size={20} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-colors"
                        >
                            Upload new logo
                        </button>
                        {formData.logoUrl && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData({ ...formData, logoUrl: null });
                                }}
                                className="px-4 py-2 text-red-400 hover:text-red-500 text-xs font-medium transition-colors"
                            >
                                Remove logo
                            </button>
                        )}
                        <p className="text-[10px] text-neutral-600">Recommended size: 400x400px. Max 2MB.</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 mb-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Agency Name</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0f0f0f] border border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Agency URL</label>
                        <div className="flex items-center w-full bg-[#0f0f0f] border border-neutral-800 rounded-lg overflow-hidden focus-within:border-neutral-600 transition-all">
                            <input type="text" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} className="flex-1 bg-transparent py-2.5 pl-4 pr-2 text-sm text-white focus:outline-none" />
                            <span className="pr-4 text-neutral-600 text-xs bg-[#0f0f0f] h-full flex items-center border-l border-neutral-800">.orchestra.com</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Support Email</label>
                        <input type="email" value={formData.supportEmail} onChange={(e) => setFormData({...formData, supportEmail: e.target.value})} className="w-full bg-[#0f0f0f] border border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-all" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide ml-1">Brand Color</label>
                        <div className="relative group flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border border-neutral-800 flex items-center justify-center" style={{backgroundColor: formData.brandColor}}></div>
                            <input type="text" value={formData.brandColor} onChange={(e) => setFormData({...formData, brandColor: e.target.value})} className="flex-1 bg-[#0f0f0f] border border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-all font-mono uppercase" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-neutral-800">
                 <button id="save-btn" onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50">
                    {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : <Save size={16} />} Save Changes
                 </button>
            </div>
        </div>
    );
};

// --- TEAM SETTINGS ---
export const TeamSettingsView = ({ team }) => {
    const toast = useToast();
    const { confirm } = useConfirm();
    const [localTeam, setLocalTeam] = useState(team || []);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState('Designer');
    const [loading, setLoading] = useState(false);

    useEffect(() => { if(team) setLocalTeam(team); }, [team]);

    // Filter out "Left company" members and sort alphabetically
    const visibleMembers = localTeam
        .filter(m => !(m.status || '').toLowerCase().includes('left'))
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.from('team').insert([{ full_name: inviteName, email: inviteEmail, status: 'Active', notes: `Role: ${inviteRole}` }]).select();
            if (error) throw error;
            if (data) { setLocalTeam([...localTeam, data[0]]); setIsInviteOpen(false); setInviteName(''); setInviteEmail(''); }
            toast.success('Member invited');
        } catch (error) { toast.error("Failed to invite member."); } finally { setLoading(false); }
    };

    const getStatusStyle = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'active') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        if (s === 'inactive' || s === 'disabled') return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700';
        if (s === 'invited' || s === 'pending') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700';
    };

    const getStatusDot = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'active') return 'bg-emerald-500';
        if (s === 'invited' || s === 'pending') return 'bg-amber-500';
        return 'bg-neutral-400';
    };

    const getRoleFromNotes = (notes) => {
        if (!notes) return 'Member';
        return notes.replace('Role: ', '') || 'Member';
    };

    return (
        <div className="max-w-2xl mx-auto p-8 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">Team</h1>
                    <p className="text-sm text-neutral-400">Manage your team members and roles.</p>
                </div>
                <button
                    onClick={() => setIsInviteOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.97]"
                >
                    <UserPlus size={14} /> Invite
                </button>
            </div>

            {/* Team count */}
            <div className="mb-4">
                <span className="text-xs text-neutral-400">{visibleMembers.length} active member{visibleMembers.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Team list */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {visibleMembers.length === 0 ? (
                    <div className="py-16 text-center">
                        <User size={32} className="mx-auto mb-3 text-neutral-300 dark:text-neutral-700" />
                        <p className="text-sm text-neutral-400">No team members yet</p>
                    </div>
                ) : (
                    visibleMembers.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
                        >
                            {/* Avatar */}
                            <div className="shrink-0">
                                {member.avatar_url || member.profil_pic ? (
                                    <img
                                        src={member.avatar_url || member.profil_pic}
                                        alt={member.full_name}
                                        className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-300 font-semibold text-sm">
                                        {member.full_name ? member.full_name[0].toUpperCase() : '?'}
                                    </div>
                                )}
                            </div>

                            {/* Name, Role & Email */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                        {member.full_name || 'Unnamed'}
                                    </span>
                                    <span className="text-[10px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-1.5 py-0.5 rounded shrink-0">
                                        {getRoleFromNotes(member.notes)}
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-400 truncate mt-0.5">{member.email || '-'}</p>
                            </div>

                            {/* Status */}
                            <div className="shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${getStatusStyle(member.status)}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(member.status)}`}></span>
                                    {member.status || 'Active'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Invite Modal */}
            {isInviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-[2px] p-4 animate-fade-in" onClick={() => setIsInviteOpen(false)}>
                    <div
                        className="bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-up"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Invite Team Member</h3>
                            <button onClick={() => setIsInviteOpen(false)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors p-1">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleInvite} className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                                    placeholder="John Doe"
                                    value={inviteName}
                                    onChange={e => setInviteName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
                                    placeholder="john@example.com"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2 block">Role</label>
                                <select
                                    className="w-full bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 rounded-lg py-2.5 px-4 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors cursor-pointer"
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value)}
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Designer">Designer</option>
                                    <option value="Project Manager">Project Manager</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold text-sm rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                                ) : (
                                    <UserPlus size={14} />
                                )}
                                {loading ? 'Inviting...' : 'Send Invite'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- WORKFLOW SETTINGS (Strict 4 Statuses) ---
export const WorkflowSettingsView = () => {
    // Initialize ONLY with the 4 allowed statuses
    const [statuses, setStatuses] = useState(() => {
        const saved = localStorage.getItem('orchestra_workflow_statuses');
        // If saved exists, we load it. If not, we generate from the CONSTANTS to ensure correct 4.
        // However, to enforce your rule, I will regenerate it from constants if the count is off or specific keys are missing.
        if (saved) {
            const parsed = JSON.parse(saved);
            // Basic validation to ensure we don't load "To Do" or old statuses
            if(parsed.some(s => s.id === 'To Do' || s.id === 'In Progress')) {
                return Object.keys(STATUS_CONFIG).map(key => ({ 
                    id: key, 
                    ...STATUS_CONFIG[key], 
                    name: key,
                    description: 'Default description.',
                    automations: { notifyClient: false, notifyAssignee: false }
                }));
            }
            return parsed;
        }
        return Object.keys(STATUS_CONFIG).map(key => ({ 
            id: key, 
            ...STATUS_CONFIG[key], 
            name: key,
            description: 'Default description.',
            automations: { notifyClient: false, notifyAssignee: false }
        }));
    });
    
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        localStorage.setItem('orchestra_workflow_statuses', JSON.stringify(statuses));
    }, [statuses]);

    const updateStatus = (index, field, value) => {
        const updated = [...statuses];
        if(field.includes('.')) {
            const [parent, child] = field.split('.');
            updated[index][parent][child] = value;
        } else {
            updated[index][field] = value;
        }
        setStatuses(updated);
    };

    const moveStatus = (index, direction) => {
        const newStatuses = [...statuses];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= newStatuses.length) return;
        [newStatuses[index], newStatuses[target]] = [newStatuses[target], newStatuses[index]];
        setStatuses(newStatuses);
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in pb-24">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Workflow</h1>
                    <p className="text-neutral-500 text-sm">Configure your 4 core workflow stages.</p>
                </div>
                {/* Removed "Add Status" button to enforce the strict 4-status rule */}
            </div>

            <div className="space-y-4">
                {statuses.map((status, index) => (
                    <div key={status.id + index} className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden transition-all">
                        <div className="flex items-center gap-4 p-4 group hover:bg-[#1a1a1a] cursor-pointer" onClick={() => setExpandedId(expandedId === status.id ? null : status.id)}>
                             <div className="flex flex-col gap-1 text-neutral-600" onClick={e => e.stopPropagation()}>
                                <button onClick={() => moveStatus(index, 'up')} disabled={index === 0} className="hover:text-white disabled:opacity-20"><ArrowUp size={14}/></button>
                                <button onClick={() => moveStatus(index, 'down')} disabled={index === statuses.length - 1} className="hover:text-white disabled:opacity-20"><ArrowDown size={14}/></button>
                            </div>
                            <div className="w-8 h-8 rounded-lg border border-neutral-700 flex items-center justify-center" style={{ color: status.color.replace('text-', '') }}>
                                <div className="w-4 h-4 rounded-full bg-current opacity-80"></div>
                            </div>
                            <div className="flex-1 font-medium text-white">{status.name}</div>
                            <div className="text-xs text-neutral-500 mr-4">{status.automations?.notifyClient ? 'Notify Client On' : ''}</div>
                        </div>

                        {expandedId === status.id && (
                            <div className="p-6 border-t border-neutral-800 bg-[#0f0f0f] grid grid-cols-2 gap-8 animate-slide-down">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Stage Name</label>
                                        <input type="text" value={status.name} onChange={(e) => updateStatus(index, 'name', e.target.value)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-white text-sm focus:border-neutral-600 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Definition of Done</label>
                                        <textarea rows="3" value={status.description} onChange={(e) => updateStatus(index, 'description', e.target.value)} className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-white text-sm focus:border-neutral-600 outline-none resize-none" placeholder="What needs to happen before moving?" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block flex items-center gap-2"><Zap size={14} className="text-amber-500"/> Automations</label>
                                    <div className="bg-[#1a1a1a] border border-neutral-800 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-white">Notify Client</div>
                                            <button onClick={() => updateStatus(index, 'automations.notifyClient', !status.automations?.notifyClient)} className={`w-10 h-5 rounded-full relative transition-colors ${status.automations?.notifyClient ? 'bg-emerald-500' : 'bg-neutral-700'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${status.automations?.notifyClient ? 'left-6' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-white">Notify Assignee</div>
                                            <button onClick={() => updateStatus(index, 'automations.notifyAssignee', !status.automations?.notifyAssignee)} className={`w-10 h-5 rounded-full relative transition-colors ${status.automations?.notifyAssignee ? 'bg-emerald-500' : 'bg-neutral-700'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${status.automations?.notifyAssignee ? 'left-6' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Delete button removed as we only want these 4 statuses */}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- CLIENT PORTAL SETTINGS (Feature Rich & Functional) ---
export const ClientPortalSettingsView = () => {
    const { prompt } = useConfirm();
    const [settings, setSettings] = useState({
        customDomain: '',
        portalName: 'Client Portal',
        welcomeMessage: 'Welcome to your dashboard.',
        loginHeading: 'Log in to your workspace',
        primaryColor: '#a3e635',
        showPricing: true,
        allowFeedback: true,
        links: [{ id: 1, label: 'Book a Call', url: 'https://cal.com/dafolle' }]
    });

    useEffect(() => {
        const saved = localStorage.getItem('orchestra_portal_settings');
        if(saved) setSettings(JSON.parse(saved));
    }, []);

    const save = () => {
        localStorage.setItem('orchestra_portal_settings', JSON.stringify(settings));
        const btn = document.getElementById('portal-save-btn');
        if(btn) { btn.innerText = 'Saved!'; setTimeout(() => btn.innerText = 'Save Changes', 2000); }
    };

    const addLink = async () => {
        const label = await prompt({
            title: 'Add Link',
            message: 'Enter the link label:',
            confirmText: 'Next',
            cancelText: 'Cancel'
        });

        if (!label) return;

        const url = await prompt({
            title: 'Add Link',
            message: 'Enter the URL:',
            confirmText: 'Add',
            cancelText: 'Cancel'
        });

        if (url) {
            setSettings({ ...settings, links: [...settings.links, { id: Date.now(), label, url }] });
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in pb-24">
             <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">Client Portal</h1>
                <p className="text-neutral-500 text-sm">Customize what your clients see when they log in.</p>
            </div>

            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 mb-6 flex gap-8">
                <div className="flex-1 space-y-6">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2"><Layout size={16}/> Login Screen</h3>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase">Portal Name</label>
                        <input type="text" className="w-full bg-[#0f0f0f] border border-neutral-800 rounded-lg p-2.5 text-white text-sm outline-none focus:border-neutral-600" value={settings.portalName} onChange={e => setSettings({...settings, portalName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase">Login Heading</label>
                        <input type="text" className="w-full bg-[#0f0f0f] border border-neutral-800 rounded-lg p-2.5 text-white text-sm outline-none focus:border-neutral-600" value={settings.loginHeading} onChange={e => setSettings({...settings, loginHeading: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase">Custom Domain</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="portal.agency.com" className="flex-1 bg-[#0f0f0f] border border-neutral-800 rounded-lg p-2.5 text-white text-sm outline-none focus:border-neutral-600" value={settings.customDomain} onChange={e => setSettings({...settings, customDomain: e.target.value})} />
                            <button className="px-3 bg-white/10 text-white rounded-lg text-xs font-medium hover:bg-white/20">Verify</button>
                        </div>
                    </div>
                </div>
                
                <div className="w-64 bg-[#0f0f0f] border border-neutral-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
                    <div className="h-4 bg-[#1a1a1a] border-b border-neutral-800 flex items-center px-2 gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-3">
                        <div className="w-8 h-8 rounded bg-white/10"></div>
                        <div className="text-[10px] text-white font-bold">{settings.portalName}</div>
                        <div className="text-[8px] text-neutral-500">{settings.loginHeading}</div>
                        <div className="w-full h-6 bg-[#1a1a1a] rounded flex items-center justify-center text-[8px] text-neutral-500">Email</div>
                        <div className="w-full h-6 bg-white text-black rounded flex items-center justify-center text-[8px] font-bold">Log in</div>
                    </div>
                </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2"><Zap size={16}/> Features & Links</h3>
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                         <div className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg border border-neutral-800">
                            <div><div className="text-white text-sm font-medium">Show Pricing</div><div className="text-neutral-500 text-[10px]">Client sees invoices tab</div></div>
                            <button onClick={() => setSettings({...settings, showPricing: !settings.showPricing})} className={`w-8 h-4 rounded-full relative transition-colors ${settings.showPricing ? 'bg-emerald-500' : 'bg-neutral-700'}`}><div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${settings.showPricing ? 'left-5' : 'left-0.5'}`}></div></button>
                        </div>
                         <div className="flex items-center justify-between p-3 bg-[#0f0f0f] rounded-lg border border-neutral-800">
                            <div><div className="text-white text-sm font-medium">Allow Feedback</div><div className="text-neutral-500 text-[10px]">Comment on tasks</div></div>
                            <button onClick={() => setSettings({...settings, allowFeedback: !settings.allowFeedback})} className={`w-8 h-4 rounded-full relative transition-colors ${settings.allowFeedback ? 'bg-emerald-500' : 'bg-neutral-700'}`}><div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all ${settings.allowFeedback ? 'left-5' : 'left-0.5'}`}></div></button>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                             <label className="text-xs font-medium text-neutral-400 uppercase">Sidebar Links</label>
                             <button onClick={addLink} className="text-[10px] bg-white/10 px-2 py-1 rounded text-white hover:bg-white/20">Add Link</button>
                        </div>
                        <div className="space-y-2">
                            {settings.links.map((link, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-[#0f0f0f] border border-neutral-800 rounded text-sm">
                                    <div className="flex items-center gap-2 text-white"><LinkIcon size={12} className="text-neutral-500"/> {link.label}</div>
                                    <button onClick={() => setSettings({...settings, links: settings.links.filter((_, idx) => idx !== i)})} className="text-neutral-600 hover:text-red-500"><X size={12}/></button>
                                </div>
                            ))}
                            {settings.links.length === 0 && <div className="text-neutral-600 text-xs italic">No custom links added.</div>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button id="portal-save-btn" onClick={save} className="px-6 py-2.5 bg-white text-black rounded-lg font-bold text-sm hover:bg-neutral-200 transition-colors">Save Changes</button>
            </div>
        </div>
    );
};

// --- PLANS & ADD-ONS SETTINGS (Fully Functional) ---
export const PlansSettingsView = () => {
    const toast = useToast();
    const { confirm } = useConfirm();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);

    // Only show these specific plan IDs
    const ALLOWED_PLAN_IDS = [
        '449834cd-2067-44cb-a019-cd34c45d2418', // Boost - 2 tâches / 48h
        'a190bfe1-5376-4855-9721-2f26e6f10920', // Grow - 1 tâche / 48h
        'a9c6f4cf-ba79-4525-b9e8-4f01624c1ef1', // Lite - 1 tâche / 5 jours
        'b638801e-3e84-45b8-9dfd-f8563ff10288'  // Start - 1 tâche / 72h
    ];

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            console.log('Fetching plans from Supabase...');
            console.log('Table name: Plans');
            console.log('Allowed plan IDs:', ALLOWED_PLAN_IDS);

            const { data, error } = await supabase
                .from('Plans')
                .select('*')
                .in('whalesync_postgres_id', ALLOWED_PLAN_IDS)
                .order('monthly_price_ht', { ascending: true });

            console.log('Supabase response:', { data, error });

            if (error) {
                console.error('Supabase error details:', error);
                throw error;
            }

            console.log('Plans fetched successfully:', data);
            setPlans(data || []);
        } catch (err) {
            console.error('Error fetching plans:', err);
            toast.error(`Failed to load plans: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const savePlan = async (e) => {
        e.preventDefault();
        if (!editingPlan.plan_name || !editingPlan.monthly_price_ht) {
            toast.error('Plan name and price are required');
            return;
        }

        try {
            if (editingPlan.whalesync_postgres_id) {
                // Update existing plan
                const { error } = await supabase
                    .from('Plans')
                    .update({
                        plan_name: editingPlan.plan_name,
                        monthly_price_ht: parseFloat(editingPlan.monthly_price_ht),
                        description: editingPlan.description,
                        delivery_sla_business_days: editingPlan.delivery_sla_business_days,
                        tasks_at_once: editingPlan.tasks_at_once,
                        status: editingPlan.status || 'clean'
                    })
                    .eq('whalesync_postgres_id', editingPlan.whalesync_postgres_id);

                if (error) throw error;
            } else {
                // Create new plan
                const { error } = await supabase
                    .from('Plans')
                    .insert([{
                        plan_name: editingPlan.plan_name,
                        monthly_price_ht: parseFloat(editingPlan.monthly_price_ht),
                        description: editingPlan.description,
                        delivery_sla_business_days: editingPlan.delivery_sla_business_days,
                        tasks_at_once: editingPlan.tasks_at_once,
                        status: 'clean',
                        active: false
                    }]);

                if (error) throw error;
            }

            setIsEditOpen(false);
            setEditingPlan(null);
            await fetchPlans();
            toast.success(editingPlan?.whalesync_postgres_id ? 'Plan updated successfully' : 'Plan created successfully');
        } catch (err) {
            console.error('Error saving plan:', err);
            toast.error(`Failed to save plan: ${err.message}`);
        }
    };

    const deletePlan = async (id) => {
        const confirmed = await confirm({
            title: 'Delete Plan',
            message: 'Are you sure you want to delete this plan? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('Plans')
                .delete()
                .eq('whalesync_postgres_id', id);

            if (error) throw error;
            await fetchPlans();
            toast.success('Plan deleted successfully');
        } catch (err) {
            console.error('Error deleting plan:', err);
            toast.error(`Failed to delete plan: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-8 animate-fade-in pb-24">
                <div className="flex items-center justify-center py-20">
                    <div className="text-neutral-500">Loading plans...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-8 animate-fade-in pb-24">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Plans & Add-ons</h1>
                    <p className="text-neutral-500 text-sm">Configure your subscription plans.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingPlan({
                            plan_name: '',
                            monthly_price_ht: '',
                            description: '',
                            delivery_sla_business_days: '',
                            tasks_at_once: ''
                        });
                        setIsEditOpen(true);
                    }}
                    className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} />
                    Create Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map(plan => (
                    <div key={plan.whalesync_postgres_id} className="bg-[#141414] border border-neutral-800 rounded-xl p-6 flex flex-col hover:border-neutral-700 transition-colors group relative">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white">{plan.plan_name}</h3>
                            <div className="text-right">
                                <div className="text-white font-mono font-medium">€{plan.monthly_price_ht}</div>
                                <div className="text-[10px] text-neutral-600">/month</div>
                            </div>
                        </div>

                        {plan.description && (
                            <div className="text-neutral-500 text-xs mb-4">{plan.description}</div>
                        )}

                        <ul className="space-y-2 mb-6 flex-1">
                            {plan.tasks_at_once && (
                                <li className="flex items-center gap-2 text-sm text-neutral-400">
                                    <Check size={12} className="text-lime-500"/>
                                    {plan.tasks_at_once} task{plan.tasks_at_once > 1 ? 's' : ''} at once
                                </li>
                            )}
                            {plan.delivery_sla_business_days && (
                                <li className="flex items-center gap-2 text-sm text-neutral-400">
                                    <Check size={12} className="text-lime-500"/>
                                    {plan.delivery_sla_business_days} day delivery
                                </li>
                            )}
                            {plan.status === 'clean' && (
                                <li className="flex items-center gap-2 text-sm text-neutral-400">
                                    <Check size={12} className="text-lime-500"/>
                                    Active plan
                                </li>
                            )}
                        </ul>

                        <button
                            onClick={() => {
                                setEditingPlan(plan);
                                setIsEditOpen(true);
                            }}
                            className="w-full py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-neutral-200 mb-2 transition-colors"
                        >
                            Edit Plan
                        </button>
                        <button
                            onClick={() => deletePlan(plan.whalesync_postgres_id)}
                            className="w-full py-2 text-neutral-600 hover:text-red-500 text-xs transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0f0f0f] border border-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up">
                        <h3 className="font-bold text-white mb-6">{editingPlan?.whalesync_postgres_id ? 'Edit Plan' : 'Create New Plan'}</h3>
                        <form onSubmit={savePlan} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-neutral-500 uppercase">Plan Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-white text-sm focus:border-neutral-600 outline-none"
                                    value={editingPlan?.plan_name || ''}
                                    onChange={e => setEditingPlan({...editingPlan, plan_name: e.target.value})}
                                    placeholder="e.g., 🟩 Boost - 2 tâches / 48h"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-neutral-500 uppercase">Price (€/month)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-white text-sm focus:border-neutral-600 outline-none"
                                        value={editingPlan?.monthly_price_ht || ''}
                                        onChange={e => setEditingPlan({...editingPlan, monthly_price_ht: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-neutral-500 uppercase">Tasks at Once</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-white text-sm focus:border-neutral-600 outline-none"
                                        value={editingPlan?.tasks_at_once || ''}
                                        onChange={e => setEditingPlan({...editingPlan, tasks_at_once: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-neutral-500 uppercase">Delivery SLA (Business Days)</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-white text-sm focus:border-neutral-600 outline-none"
                                    value={editingPlan?.delivery_sla_business_days || ''}
                                    onChange={e => setEditingPlan({...editingPlan, delivery_sla_business_days: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-neutral-500 uppercase">Description</label>
                                <textarea
                                    rows="3"
                                    className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-lg p-2 text-white text-sm focus:border-neutral-600 outline-none resize-none"
                                    value={editingPlan?.description || ''}
                                    onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                                    placeholder="Optional description"
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditOpen(false);
                                        setEditingPlan(null);
                                    }}
                                    className="flex-1 py-2.5 text-neutral-400 hover:text-white text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-white text-black rounded-lg font-bold text-sm hover:bg-neutral-200 transition-colors"
                                >
                                    {editingPlan?.whalesync_postgres_id ? 'Update Plan' : 'Create Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- TEMPLATES VIEW (Placeholder) ---
export const TemplatesView = () => (
    <div className="p-10 flex flex-col items-center justify-center h-full text-neutral-500 animate-fade-in">
      <h3 className="text-xl font-medium text-white mb-3">Templates</h3>
      <p className="max-w-md text-center text-neutral-500">Create reusable task templates to speed up your workflow.</p>
    </div>
);

// --- CLIENT TEAM SETTINGS VIEW (Shows client's own contacts) ---
export const ClientTeamSettingsView = () => {
    const { user, userMembership } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContacts = async () => {
            if (!user?.email) {
                setLoading(false);
                return;
            }

            // Extract domain from the current user's email
            const emailDomain = user.email.split('@')[1];
            if (!emailDomain) {
                setLoading(false);
                return;
            }

            // Fetch all contacts that share the same email domain
            const { data } = await supabase
                .from('client_contacts')
                .select('id, full_name, email, domain, membership_id')
                .ilike('email', `%@${emailDomain}`)
                .order('full_name', { ascending: true });
            setContacts(data || []);
            setLoading(false);
        };
        fetchContacts();
    }, [user?.email]);

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto p-8 animate-fade-in">
                <div className="flex items-center justify-center py-20">
                    <div className="text-neutral-500 dark:text-neutral-500">Loading team...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-8 animate-fade-in pb-24">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Your Team</h1>
                <p className="text-neutral-500 text-sm">Team members with access to your workspace</p>
            </div>

            {contacts.length === 0 ? (
                <div className="text-center py-16">
                    <User size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
                    <p className="text-neutral-500 text-sm">No team members found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {contacts.map(contact => (
                        <div key={contact.id} className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                            <Avatar
                                name={contact.full_name}
                                size="md"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">{contact.full_name || 'No name'}</h3>
                                <p className="text-xs text-neutral-500">{contact.email}</p>
                            </div>
                            {contact.domain && (
                                <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full">
                                    {contact.domain}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};