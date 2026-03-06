"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { calculateLevel, UserXP } from "@/lib/gamification"
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
    /** Re-fetches sessions AND profile XP from the database */
    refreshUserStats: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    // XP is now stored directly from profiles.xp (the DB is the source of truth)
    const [profileXP, setProfileXP] = useState<number>(0);

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

    // ── fetch profile XP from DB (single source of truth) ────────────────────
    const fetchProfileXP = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', userId)
            .single();

        if (!error && data) {
            setProfileXP(data.xp ?? 0);
        }
    }, []);

    // ── combined refresh (called after saving a session) ──────────────────────
    const refreshUserStats = async () => {
        if (user) {
            await Promise.all([
                fetchSessions(user.id),
                fetchProfileXP(user.id),
            ]);
        }
    };

    // ── auth bootstrap ────────────────────────────────────────────────────────
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                await Promise.all([
                    fetchSessions(currentUser.id),
                    fetchProfileXP(currentUser.id),
                ]);
            }
            setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchSessions(currentUser.id);
                fetchProfileXP(currentUser.id);
            } else {
                setSessions([]);
                setProfileXP(0);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchSessions, fetchProfileXP]);

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
