import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'team', 'customer', or null
  const [userMembership, setUserMembership] = useState(null); // Client membership for customers
  const [teamMemberId, setTeamMemberId] = useState(null); // Team member ID for team users
  const [clientContactId, setClientContactId] = useState(null); // Client contact ID for customers
  const [planLimits, setPlanLimits] = useState(null); // Plan limits for customers
  const isInitializedRef = useRef(false);
  const lastUserIdRef = useRef(null); // Track the last authenticated user ID

  const detectUserRole = async (email) => {
    console.log('[detectUserRole] Called with email:', email);

    if (!email) {
      console.log('[detectUserRole] No email provided, clearing role');
      setUserRole(null);
      setUserMembership(null);
      setTeamMemberId(null);
      setClientContactId(null);
      setPlanLimits(null);
      return;
    }

    try {
      console.log('[detectUserRole] Checking team table...');
      // Check if user is in team table
      const { data: teamData, error: teamError } = await supabase
        .from('team')
        .select('id, full_name, email')
        .eq('email', email)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      console.log('[detectUserRole] Team query result:', { teamData, teamError });

      if (teamData && !teamError) {
        console.log('[detectUserRole] Setting role to TEAM');
        setUserRole('team');
        setUserMembership(null);
        setTeamMemberId(teamData.id);
        setClientContactId(null);
        setPlanLimits(null);
        console.log('[detectUserRole] User detected as team member:', teamData);
        return;
      }

      console.log('[detectUserRole] Not in team table, checking client_contacts...');
      // Check if user is in client_contacts table
      const { data: contactData, error: contactError } = await supabase
        .from('client_contacts')
        .select('id, full_name, email, membership_id')
        .eq('email', email)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      console.log('[detectUserRole] Client contacts query result:', { contactData, contactError });

      if (contactData && !contactError) {
        console.log('[detectUserRole] Setting role to CUSTOMER with membership_id:', contactData.membership_id);
        setUserRole('customer');
        setUserMembership(contactData.membership_id);
        setTeamMemberId(null);
        setClientContactId(contactData.id);

        // Fetch plan limits for customer
        if (contactData.membership_id) {
          const { data: membershipData } = await supabase
            .from('client_memberships')
            .select(`
              plan_id,
              "Plans" (
                max_active_tasks,
                turnaround_hours,
                name
              )
            `)
            .eq('id', contactData.membership_id)
            .maybeSingle();

          if (membershipData?.['Plans']) {
            setPlanLimits({
              maxActiveTasks: membershipData['Plans'].max_active_tasks || 1,
              turnaroundHours: membershipData['Plans'].turnaround_hours || 72,
              planName: membershipData['Plans'].name
            });
            console.log('[detectUserRole] Plan limits:', membershipData['Plans']);
          }
        }

        console.log('[detectUserRole] User detected as customer:', contactData);
        return;
      }

      // If not found in either, default to team (for backwards compatibility)
      console.log('[detectUserRole] User not found in team or contacts, defaulting to team role');
      setUserRole('team');
      setUserMembership(null);
      setTeamMemberId(null);
      setClientContactId(null);
      setPlanLimits(null);
    } catch (error) {
      console.error('[detectUserRole] Error detecting user role:', error);
      setUserRole('team'); // Default to team on error
      setUserMembership(null);
      setTeamMemberId(null);
      setClientContactId(null);
      setPlanLimits(null);
    }

    console.log('[detectUserRole] Function complete');
  };

  useEffect(() => {
    console.log('[AuthContext] useEffect mounted');

    // Get initial session
    const initializeAuth = async () => {
      console.log('[AuthContext] Starting initializeAuth...');
      try {
        console.log('[AuthContext] Fetching session from Supabase...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthContext] Session fetched:', session ? 'Session exists' : 'No session');

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('[AuthContext] User found, email:', session.user.email);
          console.log('[AuthContext] Calling detectUserRole...');
          lastUserIdRef.current = session.user.id; // Store the user ID
          await detectUserRole(session.user.email);
          console.log('[AuthContext] detectUserRole completed');
        } else {
          console.log('[AuthContext] No user in session');
          lastUserIdRef.current = null;
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
      } finally {
        console.log('[AuthContext] Setting loading to false');
        setLoading(false);
        isInitializedRef.current = true;
      }
    };

    initializeAuth();

    // Listen for auth changes (skip SIGNED_IN on initial mount)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthContext] Auth state changed, event:', _event, 'isInitialized:', isInitializedRef.current);

      // Skip the initial SIGNED_IN event that fires on mount (only during initialization)
      if (_event === 'SIGNED_IN' && !isInitializedRef.current) {
        console.log('[AuthContext] Skipping initial SIGNED_IN event during mount');
        return;
      }

      // Don't set loading for tab visibility changes when already authenticated with same user
      if (_event === 'SIGNED_IN' && isInitializedRef.current && session?.user && lastUserIdRef.current === session.user.id) {
        console.log('[AuthContext] Tab became visible, same user already authenticated, skipping');
        return;
      }

      // Token refresh: update session quietly without showing loading state or re-detecting role
      if (_event === 'TOKEN_REFRESHED' && session?.user && lastUserIdRef.current === session.user.id) {
        console.log('[AuthContext] Token refreshed for same user, updating session silently');
        setSession(session);
        return;
      }

      setLoading(true);
      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('[AuthContext] User in auth change:', session.user.email);
          lastUserIdRef.current = session.user.id; // Update the ref
          await detectUserRole(session.user.email);
        } else {
          console.log('[AuthContext] No user in auth change');
          lastUserIdRef.current = null;
          setUserRole(null);
          setUserMembership(null);
          setTeamMemberId(null);
          setClientContactId(null);
          setPlanLimits(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error in auth state change:', error);
      } finally {
        console.log('[AuthContext] Auth state change complete, setting loading to false');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    userMembership,
    teamMemberId,
    clientContactId,
    planLimits,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
