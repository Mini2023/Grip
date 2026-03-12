"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { calculateLevel, UserXP, calculateStreakMinutes } from "@/lib/gamification"
import { supabase } from "@/lib/supabaseClient"
import { User } from "@supabase/supabase-js"

interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'info' | 'success' | 'alert';
}

interface UserContextType {
    userXP: UserXP;
    notifications: Notification[];
    unreadCount: number;
    markAllRead: () => void;
    addNotification: (n: Omit<Notification, 'id' | 'read' | 'time'>) => void;
    user: User | null;
    loading: boolean;
    sessions: any[];
    currentStreak: number;
    streakMinutes: number;
    /** The actual timestamp from the DB when the streak started (last relapse) */
    streakStart: string | null;
    /** Re-fetches sessions AND profile data from the database */
    refreshUserStats: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    // Single source of truth from profiles table
    const [profileXP, setProfileXP] = useState<number>(0);
    const [streakStart, setStreakStart] = useState<string | null>(null);

    const [notifications, setNotifications] = useState<Notification[]>([]);

    // ── fetch sessions ─────────────────────────────────────────────────────────
    const fetchSessions = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSessions(data);
        }
    }, []);

    // ── fetch profile data from DB (single source of truth) ──────────────────
    const fetchProfileData = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('xp, current_streak_start')
            .eq('id', userId)
            .single();

        if (!error && data) {
            setProfileXP(data.xp ?? 0);
            setStreakStart(data.current_streak_start);
        }
    }, []);

    // ── combined refresh (called after saving a session) ──────────────────────
    const refreshUserStats = async () => {
        if (user) {
            await Promise.all([
                fetchSessions(user.id),
                fetchProfileData(user.id),
            ]);
        }
    };

    // ── ensure profile exists (The Callback) ──────────────────────────────────
    const ensureUserProfile = useCallback(async (userId: string, email?: string) => {
        try {
            // Check if profile exists
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (error && error.code === 'PGRST116') { // PGRST116 is "no rows returned"
                console.log('No profile found, creating one for authenticated user...');
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([
                        { 
                            id: userId, 
                            email: email,
                            xp: 0,
                            current_streak_start: new Date().toISOString(),
                            created_at: new Date().toISOString()
                        }
                    ]);
                
                if (insertError) {
                    console.error('Error creating profile:', insertError);
                } else {
                    console.log('Profile created successfully.');
                }
            } else if (error) {
                console.error('Error checking profile:', error);
            }
        } catch (e) {
            console.error('Unexpected error in ensureUserProfile:', e);
        }
    }, []);

    // ── auth bootstrap ────────────────────────────────────────────────────────
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                // Ensure profile exists ONLY after auth is confirmed
                await ensureUserProfile(currentUser.id, currentUser.email);
                
                await Promise.all([
                    fetchSessions(currentUser.id),
                    fetchProfileData(currentUser.id),
                ]);
            }
            setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                // Handle callback on auth state change (like after signup/login)
                await ensureUserProfile(currentUser.id, currentUser.email);
                
                fetchSessions(currentUser.id);
                fetchProfileData(currentUser.id);
            } else {
                setSessions([]);
                setProfileXP(0);
                setStreakStart(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchSessions, fetchProfileData, ensureUserProfile]);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const addNotification = (n: Omit<Notification, 'id' | 'read' | 'time'>) => {
        const newN: Notification = {
            ...n,
            id: Math.random().toString(36).substr(2, 9),
            read: false,
            time: 'Just now'
        };
        setNotifications(prev => [newN, ...prev]);
    };

    // ── XP derives from profiles.xp (DB) ─────────────────────────────────────
    // Same formula everywhere: Math.floor(xp / 100) + 1
    const userXP = calculateLevel(profileXP);
    const unreadCount = notifications.filter(n => !n.read).length;

    const streakMinutes = React.useMemo(() => {
        if (!streakStart) return 0;
        const start = new Date(streakStart).getTime();
        const diffMs = Date.now() - start;
        return Math.max(0, Math.floor(diffMs / 60000));
    }, [streakStart]);

    return (
        <UserContext.Provider value={{
            userXP,
            notifications,
            unreadCount,
            markAllRead,
            addNotification,
            user,
            loading,
            sessions,
            currentStreak: Math.floor(streakMinutes / 1440),
            streakMinutes,
            streakStart,
            refreshUserStats
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within UserProvider");
    return context;
};
