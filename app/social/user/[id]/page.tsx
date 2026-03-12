"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Shield, Zap, Trophy, ArrowLeft, Calendar, Users,
    CheckCircle2, Activity, Eye, Moon, Sun, Timer, AlertCircle,
    FileText, Link as LinkIcon, Layers, Flower, ShieldAlert, Award,
    Lock, Tag, UserPlus, UserCheck, Loader2, RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BADGES, Badge } from "@/lib/badges"
import { calculateStreakMinutes } from "@/lib/gamification"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

// ── icon map ──────────────────────────────────────────────────────────────────
const BadgeIcon = ({ name, className }: { name: string; className?: string }) => {
    const icons: Record<string, React.ReactNode> = {
        Zap: <Zap className={className} />, Shield: <Shield className={className} />,
        Activity: <Activity className={className} />, Trophy: <Trophy className={className} />,
        Eye: <Eye className={className} />, Moon: <Moon className={className} />,
        Sun: <Sun className={className} />, Timer: <Timer className={className} />,
        AlertCircle: <AlertCircle className={className} />, FileText: <FileText className={className} />,
        Link: <LinkIcon className={className} />, Layers: <Layers className={className} />,
        Flower: <Flower className={className} />, ShieldAlert: <ShieldAlert className={className} />,
    }
    return (icons[name] ?? <Award className={className} />) as React.ReactElement
}

// ── badge item ────────────────────────────────────────────────────────────────
const BadgeItem = ({ badge, earned }: { badge: Badge; earned: boolean }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <div className={cn(
                "relative p-4 rounded-2xl border flex items-center justify-center transition-all",
                earned
                    ? badge.category === "Sentinel"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : "bg-white/[0.02] border-white/5 text-zinc-700 opacity-30"
            )}>
                <BadgeIcon name={badge.icon} className="w-6 h-6" />
                {earned && (
                    <div className="absolute -top-1.5 -right-1.5 bg-zinc-950 rounded-full p-0.5 border border-emerald-500/50">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                )}
            </div>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-950 border-zinc-800 p-3 max-w-[220px] rounded-2xl">
            <p className="font-black text-sm text-white uppercase italic">{badge.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{badge.description}</p>
            <p className="text-[9px] text-zinc-400 mt-2 font-bold">{badge.howToGet}</p>
        </TooltipContent>
    </Tooltip>
)

// ── page ──────────────────────────────────────────────────────────────────────
export default function UserProfileById() {
    const { id } = useParams()
    const router = useRouter()

    const [profile, setProfile] = useState<any>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // friendship state: null | 'none' | 'pending_sent' | 'pending_received' | 'accepted'
    const [friendStatus, setFriendStatus] = useState<string>("none")
    const [sendingReq, setSendingReq] = useState(false)

    const streakMinutes = useMemo(() => {
        if (!profile || !profile.current_streak_start) return 0;
        const start = new Date(profile.current_streak_start).getTime();
        const now = Date.now();
        return Math.max(0, Math.floor((now - start) / 60000));
    }, [profile]);

    const streak = Math.floor(streakMinutes / 1440);

    useEffect(() => {
        if (!id) return
        const init = async () => {
            setLoading(true)

            // 1. Logged-in user
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            // 2. Target profile
            const { data: prof } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", id)
                .single()

            if (!prof) { setLoading(false); return }
            setProfile(prof)

            // 3. Friendship status
            if (user && user.id !== prof.id) {
                const { data: fs } = await supabase
                    .from("friendships")
                    .select("status, sender_id")
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${prof.id}),and(sender_id.eq.${prof.id},receiver_id.eq.${user.id})`)
                    .maybeSingle()

                if (fs) {
                    if (fs.status === "accepted") setFriendStatus("accepted")
                    else if (fs.sender_id === user.id) setFriendStatus("pending_sent")
                    else setFriendStatus("pending_received")
                } else {
                    setFriendStatus("none")
                }
            } else if (user?.id === prof.id) {
                setFriendStatus("self")
            }

            // 4. Sessions — always fetch (privacy respect happens in UI/render)
            const { data: sess } = await supabase
                .from("sessions")
                .select("*")
                .eq("user_id", prof.id)
                .order("created_at", { ascending: false })
            setSessions(sess || [])

            setLoading(false)
        }
        init()
    }, [id])

    // ── derived ──────────────────────────────────────────────────────────────
    const canSeeStats = useMemo(() => {
        if (!profile) return false
        if (currentUser?.id === profile.id) return true
        if (!profile.show_stats_publicly || profile.show_stats_publicly === "global") return true
        if (profile.show_stats_publicly === "friends" && friendStatus === "accepted") return true
        return false
    }, [profile, currentUser, friendStatus])

    const canSeePrefs = useMemo(() => {
        if (!profile) return false
        if (currentUser?.id === profile.id) return true
        if (!profile.show_preferences_publicly || profile.show_preferences_publicly === "global") return true
        if (profile.show_preferences_publicly === "friends" && friendStatus === "accepted") return true
        return false
    }, [profile, currentUser, friendStatus])

    const preferences = useMemo(() => {
        if (!canSeePrefs || !sessions.length) return { topTag: "None", topPerformer: "None" }
        const tags: Record<string, number> = {}
        const perfs: Record<string, number> = {}
        sessions.forEach(s => {
            ; (s.categories || []).forEach((t: string) => { tags[t] = (tags[t] || 0) + 1 })
            if (s.performer) perfs[s.performer] = (perfs[s.performer] || 0) + 1
        })
        const topTag = Object.entries(tags).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None"
        const topPerformer = Object.entries(perfs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None"
        return { topTag, topPerformer }
    }, [sessions, canSeePrefs])

    // ── actions ───────────────────────────────────────────────────────────────
    const sendFriendRequest = async () => {
        if (!currentUser || !profile) return
        const targetId = profile.id as string
        setSendingReq(true)
        const { error } = await supabase.from("friendships").insert({
            sender_id: currentUser.id,
            receiver_id: targetId,
            status: "pending",
        })
        if (error) {
            console.error('Friend request error:', error)
            toast.error(error.message)
        } else {
            toast.success("Encrypted handshake sent.")
            setFriendStatus("pending_sent")
        }
        setSendingReq(false)
    }

    const acceptRequest = async () => {
        if (!currentUser || !profile) return
        setSendingReq(true)
        const { error } = await supabase.from("friendships")
            .update({ status: "accepted" })
            .eq("sender_id", profile.id)
            .eq("receiver_id", currentUser.id)
        if (error) {
            console.error('Accept request error:', error)
            toast.error(error.message)
        } else {
            toast.success("Connection established.")
            setFriendStatus("accepted")
        }
        setSendingReq(false)
    }


    // ── loading / not found ───────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    )

    if (!profile) return (
        <div className="space-y-8 pb-20">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest italic">
                <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <div className="text-center py-20 rounded-[3rem] border border-dashed border-white/5">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Unit not found.</p>
            </div>
        </div>
    )

    const displayName = profile.display_name || profile.username || "Anonymous"
    const initials = displayName.slice(0, 2).toUpperCase()
    // streak is already defined from useMemo above
    const rankLevel = Math.floor((profile.xp || 0) / 100) + 1
    const joinDate = new Date(profile.created_at || Date.now()).toLocaleDateString(undefined, { month: "short", year: "numeric" })

    // Compute earned badges from session data (earned_badges column may not exist in DB)
    const earnedBadgeIds = (() => {
        const e: string[] = []
        const total = sessions.length
        if (total >= 1) e.push('coll_quick')
        if (total >= 5) e.push('coll_night')
        if (total >= 10) e.push('coll_pov_10')
        if (streak >= 7) e.push('sent_7')
        if (streak >= 30) e.push('sent_30')
        if (streak >= 100) e.push('sent_100')
        return e
    })()
    const earnedBadges = earnedBadgeIds // alias for existing JSX

    // ── friend button ─────────────────────────────────────────────────────────
    const FriendButton = () => {
        if (friendStatus === "self") return null
        if (friendStatus === "accepted") return (
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black uppercase">
                <UserCheck className="w-4 h-4" /> Connected
            </div>
        )
        if (friendStatus === "pending_sent") return (
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-black uppercase">
                <Loader2 className="w-4 h-4" /> Request Sent
            </div>
        )
        if (friendStatus === "pending_received") return (
            <button onClick={acceptRequest} disabled={sendingReq} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase transition-all shadow-lg">
                <UserCheck className="w-4 h-4" /> Accept Request
            </button>
        )
        return (
            <button onClick={sendFriendRequest} disabled={sendingReq} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase transition-all shadow-lg shadow-blue-900/30 active:scale-95">
                {sendingReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add to Network
            </button>
        )
    }

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">

            {/* Back nav */}
            <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] italic">
                <ArrowLeft className="w-4 h-4" /> Brotherhood
            </button>

            {/* Hero card */}
            <div className="relative p-10 rounded-[3rem] border bg-card/40 backdrop-blur-xl overflow-hidden shadow-2xl group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[100px] group-hover:bg-blue-500/8 transition-colors" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 blur-[100px]" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    {/* Avatar + identity */}
                    <div className="flex items-center gap-6">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center font-black text-4xl border-4 border-zinc-800 shadow-2xl shrink-0 italic uppercase"
                        >
                            {initials}
                        </motion.div>
                        <div className="space-y-2 min-w-0">
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic leading-none break-words hyphens-auto">
                                {displayName}
                            </h1>
                            {profile.username && profile.display_name && (
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">@{profile.username}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="flex items-center gap-1.5 text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                    <Shield className="w-3 h-3" /> LVL {rankLevel}
                                </span>
                                <span className="flex items-center gap-1.5 text-[9px] bg-white/5 text-zinc-400 border border-white/10 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                    <Calendar className="w-3 h-3" /> Since {joinDate}
                                </span>
                                <span className="flex items-center gap-1.5 text-[9px] bg-white/5 text-zinc-400 border border-white/10 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                    <Zap className="w-3 h-3 text-amber-500" /> {profile.xp || 0} XP
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Friend button */}
                    <FriendButton />
                </div>
            </div>

            {/* Body grid */}
            <div className="grid gap-8 lg:grid-cols-3">

                {/* Left col: Streak + Sessions */}
                <div className="lg:col-span-1 space-y-6">
                    {canSeeStats ? (
                        <>
                            {/* Streak counter */}
                            <div className="p-8 rounded-[2.5rem] border bg-card/30 backdrop-blur-md flex flex-col items-center text-center space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Combat Streak</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-7xl font-black text-white italic tracking-tighter leading-none">{streak}</span>
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Days</span>
                                </div>
                                <div className="w-full max-w-[140px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(streak * 2, 100)}%` }}
                                        className="h-full bg-blue-600"
                                    />
                                </div>
                                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest italic">Shield Integrity OK</p>
                            </div>

                            {/* Session count */}
                            <div className="p-8 rounded-[2.5rem] border bg-card/30 flex items-center gap-5">
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                    <Trophy className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-4xl font-black text-white italic tracking-tighter leading-none">{sessions.length}</p>
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Urges Defeated</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-10 rounded-[2.5rem] border bg-white/[0.02] border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-3 min-h-[320px]">
                            <Lock className="w-10 h-10 text-zinc-600" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Stats Private</p>
                        </div>
                    )}
                </div>

                {/* Right col: Badges + Prefs */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Badges */}
                    <div className="p-8 rounded-[3rem] border bg-card/30 backdrop-blur-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black italic uppercase tracking-tighter text-zinc-300">Achievement Repository</h2>
                            <span className="text-[9px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-black text-zinc-400 italic">
                                {Math.round((earnedBadges.length / Math.max(BADGES.length, 1)) * 100)}%
                            </span>
                        </div>

                        <div className="space-y-8">
                            {[
                                { cat: "Sentinel", label: "Combat Ranks", color: "text-blue-500", Icon: Shield },
                                { cat: "Collector", label: "High-Value Collectibles", color: "text-amber-500", Icon: Award },
                            ].map(({ cat, label, color, Icon }) => (
                                <div key={cat} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className={cn("text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 italic", color)}>
                                            <Icon className="w-3.5 h-3.5" /> {label}
                                        </h3>
                                        <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {BADGES.filter(b => b.category === cat).map(badge => (
                                            <BadgeItem key={badge.id} badge={badge} earned={earnedBadges.includes(badge.id)} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="p-8 rounded-[3rem] border bg-card/30 backdrop-blur-sm space-y-6">
                        <h2 className="text-lg font-black italic uppercase tracking-tighter text-zinc-300 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-emerald-500" /> Preferences Intel
                        </h2>
                        {canSeePrefs ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Top Vector</span>
                                    <p className="text-xl font-black text-white italic truncate">{preferences.topTag}</p>
                                </div>
                                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Top Target</span>
                                    <p className="text-xl font-black text-emerald-500 italic truncate">{preferences.topPerformer}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-3">
                                <Lock className="w-8 h-8 text-zinc-600" />
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Preferences Private</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
