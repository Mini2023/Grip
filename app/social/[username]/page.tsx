"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Shield, Zap, Clock, Users, Trophy, Medal, ArrowLeft, Calendar, BarChart2,
    CheckCircle2, Activity, Eye, Search, Moon, Sun, Timer, AlertCircle,
    FileText, Link as LinkIcon, Layers, Flower, ShieldAlert, Award, Lock, Tag
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BADGES, Badge } from "@/lib/badges"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabaseClient"

const BadgeIcon = ({ name, className }: { name: string, className?: string }) => {
    switch (name) {
        case 'Zap': return <Zap className={className} />;
        case 'Shield': return <Shield className={className} />;
        case 'Activity': return <Activity className={className} />;
        case 'Trophy': return <Trophy className={className} />;
        case 'Eye': return <Eye className={className} />;
        case 'Moon': return <Moon className={className} />;
        case 'Sun': return <Sun className={className} />;
        case 'Timer': return <Timer className={className} />;
        case 'AlertCircle': return <AlertCircle className={className} />;
        case 'FileText': return <FileText className={className} />;
        case 'Link': return <LinkIcon className={className} />;
        case 'Layers': return <Layers className={className} />;
        case 'Flower': return <Flower className={className} />;
        case 'ShieldAlert': return <ShieldAlert className={className} />;
        case 'Search': return <Search className={className} />;
        default: return <Award className={className} />;
    }
};

const BadgeItem = ({ badge, earned }: { badge: Badge, earned: boolean }) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={cn(
                        "relative p-4 rounded-2xl border transition-all flex items-center justify-center",
                        earned
                            ? badge.category === 'Sentinel'
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                            : "bg-white/[0.02] border-white/5 text-zinc-700 grayscale opacity-40 hover:opacity-60"
                    )}
                >
                    <BadgeIcon name={badge.icon} className="w-7 h-7" />
                    {earned && (
                        <div className="absolute -top-1.5 -right-1.5 bg-zinc-950 rounded-full p-0.5 border border-emerald-500/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-zinc-950" />
                        </div>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-950 border-zinc-800 p-4 max-w-[240px] rounded-2xl shadow-2xl">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border",
                            badge.category === 'Sentinel' ? "text-blue-500 border-blue-500/20 bg-blue-500/5" : "text-amber-500 border-amber-500/20 bg-amber-500/5"
                        )}>
                            {badge.category === 'Sentinel' ? 'Combat Rank' : 'Collectible'}
                        </span>
                        {!earned && <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">Locked</span>}
                    </div>
                    <div>
                        <p className="font-black text-sm text-white uppercase italic tracking-tight">{badge.name}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{badge.description}</p>
                    </div>
                    <div className="pt-2 mt-2 border-t border-white/5">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic">Acquisition Protocol:</p>
                        <p className="text-[10px] text-zinc-300 font-bold mt-1">{badge.howToGet}</p>
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
};

export default function UserProfilePage() {
    const { username } = useParams()
    const router = useRouter()

    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isFriend, setIsFriend] = useState(false)
    const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null)
    const [sessions, setSessions] = useState<any[]>([])

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)

            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .ilike('username', username as string)
                .single()

            if (profileData) {
                setProfile(profileData)

                let isCurrentFriend = false;
                if (user && user.id !== profileData.id) {
                    const { data: friendData } = await supabase
                        .from('friendships')
                        .select('status')
                        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profileData.id}),and(sender_id.eq.${profileData.id},receiver_id.eq.${user.id})`)
                        .single()

                    if (friendData) {
                        setFriendshipStatus(friendData.status);
                        isCurrentFriend = friendData.status === 'accepted';
                        setIsFriend(isCurrentFriend);
                    }
                } else if (user && user.id === profileData.id) {
                    isCurrentFriend = true; // Himself
                    setIsFriend(true);
                }

                // If allowed to see stats or prefs, fetch sessions to calculate streak/urges and prefs
                const showStatsLocally = profileData.show_stats_publicly === 'global' || (profileData.show_stats_publicly === 'friends' && isCurrentFriend) || (user && user.id === profileData.id) || !profileData.show_stats_publicly;
                const showPrefsLocally = profileData.show_preferences_publicly === 'global' || (profileData.show_preferences_publicly === 'friends' && isCurrentFriend) || (user && user.id === profileData.id) || !profileData.show_preferences_publicly;

                if (showStatsLocally || showPrefsLocally) {
                    const { data: sessionData } = await supabase
                        .from('sessions')
                        .select('*')
                        .eq('user_id', profileData.id)
                        .order('created_at', { ascending: false })

                    if (sessionData) {
                        setSessions(sessionData)
                    }
                }
            }
            setLoading(false)
        }

        fetchAll()
    }, [username])

    const calculateStreak = (startDate: string) => {
        if (!startDate) return 0
        const start = new Date(startDate).getTime()
        const now = new Date().getTime()
        const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
        return Math.max(0, diffDays)
    }

    const canSeeStats = useMemo(() => {
        if (!profile) return false;
        if (currentUser?.id === profile.id) return true;
        if (profile.show_stats_publicly === 'global') return true;
        if (profile.show_stats_publicly === 'friends' && isFriend) return true;
        if (!profile.show_stats_publicly) return true; // Default to public
        return false;
    }, [profile, currentUser, isFriend]);

    const canSeePrefs = useMemo(() => {
        if (!profile) return false;
        if (currentUser?.id === profile.id) return true;
        if (profile.show_preferences_publicly === 'global') return true;
        if (profile.show_preferences_publicly === 'friends' && isFriend) return true;
        if (!profile.show_preferences_publicly) return true; // Default
        return false;
    }, [profile, currentUser, isFriend]);

    const preferences = useMemo(() => {
        if (!canSeePrefs || !sessions.length) return { topTag: 'None', topPerformer: 'None' };

        const tagCounts: Record<string, number> = {};
        const perfCounts: Record<string, number> = {};

        sessions.forEach(s => {
            (s.categories || []).forEach((t: string) => {
                tagCounts[t] = (tagCounts[t] || 0) + 1;
            });
            if (s.performer && s.performer !== 'Unknown') {
                perfCounts[s.performer] = (perfCounts[s.performer] || 0) + 1;
            }
        });

        const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0] ? Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0][0] : 'None';
        const topPerformer = Object.entries(perfCounts).sort((a, b) => b[1] - a[1])[0] ? Object.entries(perfCounts).sort((a, b) => b[1] - a[1])[0][0] : 'None';

        return { topTag, topPerformer };
    }, [sessions, canSeePrefs]);


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] italic"
                >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
                <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Unit not found.</p>
                </div>
            </div>
        )
    }

    const streak = calculateStreak(profile.current_streak_start)
    const joinDate = new Date(profile.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    const rankLevel = Math.floor((profile.xp || 0) / 100) + 1
    const totalSessions = sessions.length;
    const earnedBadges = profile.earned_badges || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] italic"
            >
                <ArrowLeft className="w-4 h-4" /> Personnel Feed
            </button>

            <div className="relative p-10 rounded-[3rem] border bg-card/40 backdrop-blur-xl overflow-hidden shadow-2xl group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[100px] group-hover:bg-blue-500/10 transition-colors" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 blur-[100px]" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-36 h-36 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center font-black text-5xl border-4 border-zinc-800 shadow-2xl z-10 relative italic italic shrink-0 uppercase"
                        >
                            {profile.username.slice(0, 2)}
                        </motion.div>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="absolute -bottom-2 -right-2 bg-blue-600 p-2.5 rounded-2xl border-4 border-zinc-950 shadow-xl z-20"
                        >
                            <Shield className="w-6 h-6 text-white" />
                        </motion.div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">{profile.username}</h1>
                        <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-[10px] italic">
                            Unit Rank: Standard
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4 transition-colors hover:bg-white/[0.05]">
                            <Calendar className="w-4 h-4 text-zinc-500" />
                            <div className="text-left">
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Enlisted</p>
                                <p className="text-xs font-black text-zinc-300 italic">{joinDate}</p>
                            </div>
                        </div>
                        <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4 transition-colors hover:bg-white/[0.05]">
                            <Users className="w-4 h-4 text-zinc-500" />
                            <div className="text-left">
                                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Clearance</p>
                                <p className="text-xs font-black text-emerald-500 italic">Level {rankLevel}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Stats Container (Left column) */}
                <div className="lg:col-span-1 space-y-6">
                    {canSeeStats ? (
                        <>
                            <div className="p-10 rounded-[2.5rem] border bg-card/30 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-6 group overflow-hidden relative">
                                <div className="absolute inset-0 bg-blue-500/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic relative z-10">Combat Streak</h2>
                                <div className="flex items-baseline gap-2 relative z-10">
                                    <span className="text-8xl font-black text-white italic tracking-tighter leading-none">{streak}</span>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Days</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden shadow-inner relative z-10 max-w-[160px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(streak * 2, 100)}%` }}
                                        className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                    />
                                </div>
                                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest italic group-hover:scale-105 transition-transform">Shield Integrity: 100%</p>
                            </div>

                            <div className="p-10 rounded-[2.5rem] border bg-card/30 backdrop-blur-sm flex flex-col items-center justify-center text-center space-y-6">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Impact Index</h2>
                                <div className="flex items-center gap-6">
                                    <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-xl shadow-amber-900/10">
                                        <Trophy className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-5xl font-black text-white leading-none italic tracking-tighter">{totalSessions}</p>
                                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Urges Defeated</p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                                    Calculated from verified biometric recovery logs.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="p-10 rounded-[2.5rem] border bg-white/[0.02] border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
                            <Lock className="w-12 h-12 text-zinc-600" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Stats Private</p>
                            <p className="text-xs text-zinc-400">This unit restricted tactical readout.</p>
                        </div>
                    )}
                </div>

                {/* Badges / Prefs (Right Columns) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Badge Collection Component */}
                    <div className="p-10 rounded-[3rem] border bg-card/30 backdrop-blur-sm space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-lg font-black italic uppercase tracking-tighter text-zinc-300">Achievement Repository</h2>
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Personnel development trackers</p>
                            </div>
                            <span className="text-[10px] bg-white/5 border border-white/10 px-4 py-2 rounded-2xl font-black text-zinc-400 italic">
                                MAX: {Math.round((earnedBadges.length / BADGES.length) * 100)}%
                            </span>
                        </div>

                        <div className="space-y-12">
                            {/* Sentinel Badges */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                        <Shield className="w-3.5 h-3.5" /> Combat Ranks (Sentinels)
                                    </h3>
                                    <div className="h-px flex-1 bg-blue-500/10" />
                                </div>
                                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                    {BADGES.filter(b => b.category === 'Sentinel').map(badge => (
                                        <BadgeItem
                                            key={badge.id}
                                            badge={badge}
                                            earned={earnedBadges.includes(badge.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preferences Component */}
                    <div className="p-10 rounded-[3rem] border bg-card/30 backdrop-blur-sm space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-lg font-black italic uppercase tracking-tighter text-zinc-300 flex items-center gap-2">
                                <Tag className="w-5 h-5 text-emerald-500" /> Preferences Intel
                            </h2>
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Derived from session patterns</p>
                        </div>
                        {canSeePrefs ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Top Vector</span>
                                    <p className="text-xl font-black text-white italic truncate">{preferences.topTag}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Top Target</span>
                                    <p className="text-xl font-black text-emerald-500 italic truncate">{preferences.topPerformer}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-10 rounded-3xl border bg-white/[0.02] border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-4">
                                <Lock className="w-8 h-8 text-zinc-600" />
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Preferences Private</p>
                                <p className="text-xs text-zinc-400">This unit hides behavioral targets.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
