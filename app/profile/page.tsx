"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Shield, Zap, Users, ArrowLeft, Calendar, BarChart2,
    CheckCircle2, Activity, Eye, Moon, Sun, Timer, AlertCircle,
    FileText, Link as LinkIcon, Layers, Flower, ShieldAlert, Award, Settings as SettingsIcon, LogOut, Camera, Beaker
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BADGES, Badge } from "@/lib/badges"
import { useUser } from "@/components/providers/UserProvider"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabaseClient"

const BadgeIcon = ({ name, className }: { name: string, className?: string }) => {
    switch (name) {
        case 'Zap': return <Zap className={className} />;
        case 'Shield': return <Shield className={className} />;
        case 'Activity': return <Activity className={className} />;
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
        default: return <Award className={className} />;
    }
};

const BadgeItem = ({ badge, earned, onTrigger }: { badge: Badge, earned: boolean, onTrigger: () => void }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <motion.div
                whileHover={{ scale: 1.1, translateY: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={onTrigger}
                className={cn(
                    "relative p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-center",
                    earned
                        ? badge.category === 'Sentinel'
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                        : "bg-white/[0.02] border-white/5 text-zinc-700 grayscale opacity-40"
                )}
            >
                <BadgeIcon name={badge.icon} className="w-5 h-5 sm:w-7 sm:h-7" />
                {earned && (
                    <div className="absolute -top-1.5 -right-1.5 bg-zinc-950 rounded-full p-0.5 border border-emerald-500/50">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 fill-zinc-950" />
                    </div>
                )}
            </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-950 border-zinc-800 p-4 max-w-[240px] rounded-2xl shadow-2xl">
            <p className="font-black text-sm text-white uppercase italic">{badge.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
            <p className="text-[9px] text-zinc-400 mt-2 font-bold">{badge.howToGet}</p>
        </TooltipContent>
    </Tooltip>
);

export default function PersonalProfilePage() {
    const router = useRouter()
    const { user, userXP, loading, sessions } = useUser()
    const [activeTab, setActiveTab] = useState("stats")
    const [highlightBadge, setHighlightBadge] = useState<string | null>(null)
    const [selectedAvatar, setSelectedAvatar] = useState("🛡️")
    const [showAvatarPicker, setShowAvatarPicker] = useState(false)
    const [friends, setFriends] = useState<any[]>([])
    const [friendsLoading, setFriendsLoading] = useState(false)

    useEffect(() => {
        if (!user) return
        const fetchFriends = async () => {
            setFriendsLoading(true)
            const { data } = await supabase
                .from('friendships')
                .select('sender_id, receiver_id, profiles!friendships_sender_id_fkey(id, display_name, username, xp), profiles!friendships_receiver_id_fkey(id, display_name, username, xp)')
                .eq('status', 'accepted')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            if (data) {
                const mapped = data.map((f: any) => {
                    const isSender = f.sender_id === user.id
                    const prof: any = isSender
                        ? f['profiles!friendships_receiver_id_fkey']
                        : f['profiles!friendships_sender_id_fkey']
                    if (!prof) return null
                    return { id: prof.id, name: prof.display_name || prof.username || '??', xp: prof.xp || 0 }
                }).filter(Boolean)
                setFriends(mapped)
            }
            setFriendsLoading(false)
        }
        fetchFriends()
    }, [user])

    const stats = useMemo(() => {
        if (!sessions?.length) return { currentStreak: 0, totalSessions: 0, longestStreak: 0, mostLogged: 'N/A', joined: 'Unknown' }
        const sorted = [...sessions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        const tagsMap: Record<string, number> = {}
        sessions.forEach(s => { (s.categories || []).forEach((t: string) => { tagsMap[t] = (tagsMap[t] || 0) + 1 }) })
        const mostLogged = Object.entries(tagsMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        const lastSession = new Date(sorted[0].created_at)
        const currentStreak = Math.floor((Date.now() - lastSession.getTime()) / 86_400_000)
        return {
            currentStreak,
            totalSessions: sessions.length,
            longestStreak: currentStreak,
            mostLogged,
            joined: new Date(user?.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        }
    }, [sessions, user])

    const AVATARS = ["🛡️", "⚔️", "👁️", "🌌", "🦾", "⚡", "🧠"]

    const earnedBadgeIds = useMemo(() => {
        const e: string[] = []
        if (sessions.length >= 1) e.push('coll_quick')
        if (sessions.length >= 5) e.push('coll_night')
        if (sessions.length >= 10) e.push('coll_pov_10')
        if (stats.currentStreak >= 7) e.push('sent_7')
        if (stats.currentStreak >= 30) e.push('sent_30')
        if (stats.currentStreak >= 100) e.push('sent_100')
        return e
    }, [sessions, stats])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="w-full max-w-full overflow-x-hidden space-y-5 animate-in fade-in duration-500 pb-24">

            {/* ── Header ── always stacked on mobile, row on sm+ */}
            <header className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] italic"
                    >
                        <ArrowLeft className="w-4 h-4" /> Return to Base
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => router.push('/settings')} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all">
                            <SettingsIcon className="w-4 h-4" />
                        </button>
                        <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                {/* XP Bar full-width under top row */}
                <div className="flex items-center gap-3 bg-zinc-900/50 p-2 pr-4 rounded-2xl border border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center font-black text-blue-500 italic text-sm border border-blue-500/20 shrink-0">
                        {userXP.level}
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500">
                            <span>RANK PROGRESS</span>
                            <span className="text-blue-500">{userXP.totalXP} XP</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${userXP.progressToNextLevel}%` }}
                                className="h-full bg-blue-600"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Hero Card ── compact row on ALL screens */}
            <div className="relative p-4 sm:p-8 rounded-[2rem] border bg-card/40 backdrop-blur-xl shadow-2xl">
                <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] pointer-events-none" />
                </div>
                <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2rem] bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center font-black text-2xl sm:text-5xl border-2 sm:border-4 border-zinc-800 shadow-xl italic">
                            {selectedAvatar}
                        </div>
                        <button
                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                            className="absolute -bottom-1.5 -right-1.5 bg-zinc-900 border border-white/10 p-1.5 sm:p-2 rounded-xl shadow-lg hover:bg-blue-600 transition-all"
                        >
                            <Camera className="w-3 h-3 text-white" />
                        </button>
                        <AnimatePresence>
                            {showAvatarPicker && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                                    className="absolute top-full mt-2 left-0 p-3 bg-zinc-900 border border-white/10 rounded-2xl z-50 flex gap-2 overflow-x-auto no-scrollbar shadow-2xl min-w-max"
                                >
                                    {AVATARS.map(a => (
                                        <button key={a} onClick={() => { setSelectedAvatar(a); setShowAvatarPicker(false) }}
                                            className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg hover:bg-blue-500/20 border border-transparent hover:border-blue-500 transition-all shrink-0">
                                            {a}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Identity */}
                    <div className="min-w-0 space-y-1.5 sm:space-y-3">
                        <div>
                            <h1 className="text-xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                                Personal <span className="text-blue-500">Hub</span>
                            </h1>
                            <p className="text-[9px] sm:text-[10px] text-blue-500 font-black uppercase tracking-widest italic truncate mt-0.5">
                                @{user?.email?.split('@')[0]}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">
                                <Calendar className="w-3 h-3 text-zinc-500" /> {stats.joined}
                            </span>
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">
                                <Shield className="w-3 h-3" /> Lvl {userXP.level}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tab Nav ── fills width, labels short so they fit */}
            <div className="flex p-1 bg-zinc-900/50 border border-white/5 rounded-2xl">
                {[
                    { id: 'stats', label: 'Stats' },
                    { id: 'badges', label: 'Badges' },
                    { id: 'friends', label: 'Network' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab.id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}
            <AnimatePresence mode="wait">

                {/* STATS */}
                {activeTab === 'stats' && (
                    <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">

                        {/* Account Intel */}
                        <div className="p-5 sm:p-8 rounded-[2rem] border bg-card/30 space-y-5 lg:col-span-1">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic flex items-center gap-2">
                                <BarChart2 className="w-4 h-4" /> Account Intel
                            </h2>
                            <div className="space-y-4">
                                {[
                                    { label: "Total Extractions", value: stats.totalSessions, icon: Beaker, color: "text-emerald-500" },
                                    { label: "Apex Streak", value: stats.longestStreak + " Days", icon: Zap, color: "text-amber-500" },
                                    { label: "Top Vector", value: stats.mostLogged, icon: Layers, color: "text-blue-500" },
                                    { label: "Urges Silenced", value: stats.totalSessions * 2, icon: Shield, color: "text-purple-500" },
                                ].map(stat => (
                                    <div key={stat.label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-xl bg-white/5", stat.color)}>
                                                <stat.icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">{stat.label}</span>
                                        </div>
                                        <span className="text-lg font-black text-white italic tracking-tighter">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Integrity Vector */}
                            <div className="pt-4 border-t border-white/5 text-center space-y-2">
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Integrity Vector</p>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-5xl font-black text-white italic tracking-tighter">{stats.currentStreak}</span>
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Days Clear</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(stats.currentStreak * 2, 100)}%` }}
                                        className="h-full bg-blue-600" />
                                </div>
                            </div>
                        </div>

                        {/* Neural Log Stream */}
                        <div className="p-5 sm:p-8 rounded-[2rem] border bg-card/30 space-y-4 lg:col-span-2">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-300">Neural Log Stream</h2>
                            {sessions.length === 0 ? (
                                <div className="py-12 text-center rounded-2xl border border-dashed border-white/5">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">No logs. Begin extraction in Lab.</p>
                                </div>
                            ) : sessions.slice(0, 5).map((s, i) => (
                                <div key={s.id || i} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-500 shrink-0">
                                        <Beaker className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black text-white uppercase italic truncate">{s.title || 'Unnamed Session'}</p>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">
                                            {new Date(s.created_at).toLocaleDateString()} · Regret {s.regret_score ?? '–'}/10
                                        </p>
                                    </div>
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest shrink-0",
                                        (s.regret_score || 0) <= 4 ? "text-emerald-500" : (s.regret_score || 0) <= 7 ? "text-amber-500" : "text-red-500"
                                    )}>
                                        {(s.regret_score || 0) <= 4 ? 'CLEAN' : (s.regret_score || 0) <= 7 ? 'OK' : 'HIGH'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* BADGES */}
                {activeTab === 'badges' && (
                    <motion.div key="badges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="p-5 sm:p-8 rounded-[2rem] border bg-card/30 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-300">Achievement Repository</h2>
                            <span className="text-[9px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-black text-zinc-400 italic">
                                {earnedBadgeIds.length}/{BADGES.length}
                            </span>
                        </div>
                        {[
                            { cat: 'Sentinel', label: 'Combat Ranks', color: 'text-blue-500', Icon: Shield },
                            { cat: 'Collector', label: 'Collectibles', color: 'text-amber-500', Icon: Award },
                        ].map(({ cat, label, color, Icon }) => (
                            <div key={cat} className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <h3 className={cn("text-[10px] font-black uppercase tracking-widest italic flex items-center gap-1.5", color)}>
                                        <Icon className="w-3.5 h-3.5" /> {label}
                                    </h3>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
                                    {BADGES.filter(b => b.category === cat).map(badge => (
                                        <BadgeItem key={badge.id} badge={badge}
                                            earned={earnedBadgeIds.includes(badge.id)}
                                            onTrigger={() => setHighlightBadge(badge.id)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* FRIENDS / NETWORK */}
                {activeTab === 'friends' && (
                    <motion.div key="friends" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-300">Authorized Network</h2>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">
                                {friendsLoading ? '…' : `${friends.length} Connections`}
                            </span>
                        </div>
                        {friendsLoading ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {[1, 2].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="py-16 text-center rounded-[2rem] border border-dashed border-white/5">
                                <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">No Sentinels found.<br />Search allies in the Social tab.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {friends.map(f => (
                                    <div key={f.id} className="p-4 rounded-2xl border bg-card/40 flex items-center justify-between gap-3 hover:border-white/20 transition-all">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black border border-white/5 italic uppercase shrink-0 text-sm">
                                                {f.name.slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-white uppercase italic truncate">{f.name}</p>
                                                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">{f.xp} XP</p>
                                            </div>
                                        </div>
                                        <button onClick={() => router.push(`/social/user/${f.id}`)}
                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shrink-0">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Badge Detail Overlay */}
            <AnimatePresence>
                {highlightBadge && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
                        onClick={() => setHighlightBadge(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card border-2 border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6 max-w-sm w-full"
                            onClick={e => e.stopPropagation()}>
                            <div className="w-20 h-20 bg-white/5 rounded-3xl mx-auto flex items-center justify-center border border-white/10">
                                <BadgeIcon name={BADGES.find(b => b.id === highlightBadge)?.icon || 'Award'} className="w-10 h-10 text-white" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{BADGES.find(b => b.id === highlightBadge)?.name}</h3>
                                <p className="text-sm text-muted-foreground">{BADGES.find(b => b.id === highlightBadge)?.description}</p>
                            </div>
                            <button onClick={() => setHighlightBadge(null)}
                                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all text-xs">
                                CLOSE
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
