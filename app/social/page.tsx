"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Users, Search, UserPlus, Check, X, Shield, Zap, Clock, Loader2, Trophy, Medal, Award, ArrowRight, Bell } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { BADGES } from "@/lib/badges"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

export default function SocialPage() {
    const [activeTab, setActiveTab] = useState("global") // friends, global, search
    const [sortBy, setSortBy] = useState("xp") // streak, badges, xp
    const [searchQuery, setSearchQuery] = useState("")
    const [friends, setFriends] = useState<any[]>([])
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)

    const [pendingRequests, setPendingRequests] = useState<any[]>([])
    const [showPending, setShowPending] = useState(false)
    const [activityStream, setActivityStream] = useState<any[]>([])

    const calculateStreak = (startDate: string) => {
        if (!startDate) return 0
        const start = new Date(startDate).getTime()
        const now = new Date().getTime()
        const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
        return Math.max(0, diffDays)
    }

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        return user
    }

    const fetchPendingRequests = async (user: any) => {
        if (!user) return
        const { data, error } = await supabase
            .from('friendships')
            .select('*')
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) {
            console.error('fetchPendingRequests error (check RLS on friendships):', error.message, error)
            return
        }

        if (data && data.length > 0) {
            const senderIds = data.map(d => d.sender_id);
            const { data: profiles, error: profErr } = await supabase
                .from('profiles')
                .select('id, username, display_name')
                .in('id', senderIds);
            if (profErr) {
                console.error('fetchPendingRequests profiles error:', profErr.message)
            }
            setPendingRequests(profiles || []);
        } else {
            setPendingRequests([]);
        }
    }

    const getActivityStream = async () => {
        const { data } = await supabase
            .from('sessions')
            .select('id, created_at, user_id, duration_minutes')
            .order('created_at', { ascending: false })
            .limit(5);

        if (data) {
            // Need profiles for usernames
            const userIds = Array.from(new Set(data.map(d => d.user_id)));
            if (userIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('id, username, display_name').in('id', userIds);
                const profileMap = (profiles || []).reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.display_name || p.username }), {});

                const events = data.map(d => {
                    const diffMins = Math.floor((new Date().getTime() - new Date(d.created_at).getTime()) / 60000);
                    return {
                        id: d.id,
                        user: profileMap[d.user_id] || "Anonymous",
                        event: `Neutralized an urge (${d.duration_minutes}m)`,
                        time: diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`
                    }
                });
                setActivityStream(events);
            }
        }
    }

    const fetchSocialData = async () => {
        const user = await fetchUser()
        setLoading(true)
        if (user) {
            fetchPendingRequests(user)
            getActivityStream()
        }

        try {
            if (activeTab === "global") {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('xp', { ascending: false })
                    .limit(50);

                let sortedData = data || [];
                if (sortBy === "streak") {
                    sortedData.sort((a, b) => calculateStreak(b.current_streak_start) - calculateStreak(a.current_streak_start))
                } else if (sortBy === "badges") {
                    // fall back
                }
                setFriends(sortedData)
            } else if (activeTab === "friends" && user) {
                const { data } = await supabase.from('friendships')
                    .select('*')
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .eq('status', 'accepted');

                if (data && data.length > 0) {
                    const friendIds = data.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id);
                    const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds);
                    let sortedData = profiles || [];
                    if (sortBy === "streak") {
                        sortedData.sort((a, b) => calculateStreak(b.current_streak_start) - calculateStreak(a.current_streak_start))
                    } else if (sortBy === "xp") {
                        sortedData.sort((a, b) => (b.xp || 0) - (a.xp || 0))
                    }
                    setFriends(sortedData);
                } else {
                    setFriends([]);
                }
            } else {
                setFriends([]);
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSocialData()
    }, [sortBy, activeTab])

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
                .limit(10)

            if (data) {
                setSearchResults(data.map((u: any) => {
                    const label = u.display_name || u.username || '??'
                    return { ...u, avatar: label.slice(0, 2).toUpperCase() }
                }))
            }
        } finally {
            setSearching(false)
        }
    }

    const sendFriendRequest = async (receiverId: string) => {
        if (!currentUser) return;
        const { error } = await supabase.from('friendships').insert({
            sender_id: currentUser.id,
            receiver_id: receiverId,
            status: 'pending'
        });
        if (error) {
            console.error('Friend request error:', error)
            toast.error(error.message)
        } else {
            toast.success("Encrypted handshake sent.")
            setSearchResults(prev => prev.filter(u => u.id !== receiverId))
        }
    }

    const acceptFriendRequest = async (senderId: string) => {
        if (!currentUser) return;
        const { error } = await supabase.from('friendships')
            .update({ status: 'accepted' })
            .eq('sender_id', senderId)
            .eq('receiver_id', currentUser.id);

        if (error) {
            toast.error("Failed to accept.");
        } else {
            toast.success("Connection established.");
            fetchPendingRequests(currentUser);
            if (activeTab === 'friends') fetchSocialData();
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-32 max-w-5xl mx-auto w-full overflow-x-hidden">
            <header className="space-y-4">
                {/* Title */}
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter flex items-center gap-3 text-blue-500 italic uppercase">
                        <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                        The <span className="text-white">Brotherhood</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] italic mt-1">Collective Neural Integrity Network</p>
                </div>

                {/* Tabs + Bell — always one visible row */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 p-1 bg-zinc-900/50 border border-white/5 rounded-2xl backdrop-blur-xl">
                        {[
                            { id: 'friends', label: 'Friends' },
                            { id: 'global', label: 'Global' },
                            { id: 'search', label: 'Find' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.id ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {/* Bell — always visible, always clickable */}
                    <button
                        onClick={() => setShowPending(!showPending)}
                        className="relative p-3 bg-zinc-900/50 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
                        aria-label="Friend requests"
                    >
                        <Bell className="w-5 h-5 text-zinc-400" />
                        {pendingRequests.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center px-1 border-2 border-zinc-950">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {showPending && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-3xl space-y-3 mb-2">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest italic px-2">Pending Connections</h3>
                            {pendingRequests.length === 0 ? (
                                <div className="text-center py-6">
                                    <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">No pending requests.</p>
                                </div>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="p-3 bg-zinc-800/50 border border-white/5 rounded-2xl flex items-center justify-between gap-2">
                                            <span className="text-sm font-black text-white italic uppercase truncate">{req.display_name || req.username}</span>
                                            <button onClick={() => acceptFriendRequest(req.id)} className="p-2 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 rounded-xl transition-colors shrink-0">
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'search' ? (
                        <section className="space-y-6 p-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="SEARCH BY FREQUENCY OR USERNAME..."
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-3xl pl-12 pr-6 py-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black italic uppercase tracking-tighter text-sm"
                                />
                                {searching && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />}
                            </div>

                            <div className="space-y-4">
                                {searchResults.length > 0 ? (
                                    searchResults.map(user => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={user.id}
                                            className="p-6 rounded-3xl border bg-card/40 flex items-center justify-between group hover:border-blue-500/30 transition-all shadow-xl"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center font-black border border-white/5 italic">
                                                    {user.avatar}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-white italic uppercase">{user.display_name || user.username}</span>
                                                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest italic">{calculateStreak(user.current_streak_start)}d Clear</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => sendFriendRequest(user.id)}
                                                className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-lg active:scale-95 touch-manipulation"
                                            >
                                                <UserPlus className="w-5 h-5" />
                                            </button>
                                        </motion.div>
                                    ))
                                ) : searchQuery && !searching ? (
                                    <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">No matching units found in directory.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 opacity-30">
                                        <Users className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
                                        <p className="text-[10px] font-black uppercase tracking-widest italic">Enter search parameters to reveal profiles.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : (
                        <section className="space-y-6">
                            <div className="flex items-center justify-between px-4">
                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] italic">
                                    {activeTab === 'global' ? 'Global Ranking' : 'Network Units'}
                                </h3>
                                <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
                                    {[
                                        { id: 'xp', label: 'XP' },
                                        { id: 'streak', label: 'Streak' },
                                    ].map(o => (
                                        <button
                                            key={o.id}
                                            onClick={() => setSortBy(o.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                                sortBy === o.id ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"
                                            )}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 px-2">
                                {loading ? (
                                    [1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-[2.5rem] border bg-card/20 animate-pulse" />)
                                ) : friends.length === 0 ? (
                                    <div className="text-center py-20 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/5">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">No records found.</p>
                                    </div>
                                ) : (
                                    friends.map((friend, index) => {
                                        const days = calculateStreak(friend.current_streak_start)
                                        const label = friend.display_name || friend.username || '??'
                                        const userAvatar = label.slice(0, 2).toUpperCase()
                                        return (
                                            <Link
                                                href={`/social/user/${friend.id}`}
                                                key={friend.id}
                                                className={cn(
                                                    "p-6 rounded-[2.5rem] border bg-card/20 backdrop-blur-md transition-all flex flex-col md:flex-row md:items-center justify-between group cursor-pointer gap-4 hover:scale-[1.01]",
                                                    index === 0 && activeTab === 'global' ? "border-amber-500/30 bg-amber-500/5 shadow-2xl shadow-amber-500/5" : "hover:border-blue-500/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="relative">
                                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center font-black text-2xl border-2 border-white/5 shadow-xl group-hover:rotate-3 transition-transform italic">
                                                            {userAvatar}
                                                        </div>
                                                        {index < 3 && activeTab === 'global' && (
                                                            <div className={cn(
                                                                "absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-2xl",
                                                                index === 0 ? "bg-amber-500" : index === 1 ? "bg-zinc-300" : "bg-orange-600"
                                                            )}>
                                                                <Medal className="w-4 h-4 text-zinc-950" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-white text-lg italic uppercase tracking-tighter">
                                                                {label}
                                                            </span>
                                                            <span className="text-[8px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-black tracking-widest uppercase border border-blue-500/20">
                                                                LVL {Math.floor((friend.xp || 0) / 100) + 1}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className="text-xs font-black text-zinc-400 italic uppercase">
                                                                {friend.xp || 0} XP
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between md:flex-col md:items-end gap-1">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className={cn(
                                                            "text-4xl font-black italic",
                                                            index === 0 && activeTab === 'global' ? "text-amber-500" : "text-white"
                                                        )}>{days}</span>
                                                        <span className="text-[10px] font-black text-zinc-500 tracking-widest italic">DAYS</span>
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60 transition-all group-hover:text-emerald-500">View Intel Profile →</span>
                                                </div>
                                            </Link>
                                        )
                                    })
                                )}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column: Activity Ticker */}
                <div className="space-y-8">
                    <section className="p-8 rounded-[2.5rem] border bg-zinc-900/40 backdrop-blur-xl space-y-6 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Activity Stream
                            </h3>
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        <div className="space-y-6 font-mono">
                            {activityStream.length > 0 ? activityStream.map(event => (
                                <div key={event.id} className="space-y-1 group">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-zinc-400 font-black group-hover:text-blue-400">[{event.user}]</span>
                                        <span className="text-zinc-600 text-[8px]">{event.time}</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 leading-tight uppercase tracking-tight">
                                        <ArrowRight className="inline w-3 h-3 mr-1 text-zinc-700" />
                                        {event.event}
                                    </p>
                                </div>
                            )) : (
                                <p className="text-xs text-zinc-500">No recent activity detected.</p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <p className="text-[8px] text-zinc-600 italic font-black text-center uppercase tracking-widest leading-relaxed">
                                System monitoring active sessions in Sector-7.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
