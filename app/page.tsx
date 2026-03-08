"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useMode } from "@/components/providers/ModeProvider"
import { useUser } from "@/components/providers/UserProvider"
import {
    Shield, Beaker, Zap, Clock, TrendingUp, Plus, Smile, Tag,
    AlertTriangle, Users, HeartCrack, Trophy, ArrowRight, Award,
    Eye, Moon, Sun, Timer, AlertCircle, FileText, Link as LinkIcon, Layers, Flower, ShieldAlert, Activity, ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { BADGES, Badge, getNextMilestone } from "@/lib/badges"
import { XP_REWARDS } from "@/lib/gamification"
import { motion, AnimatePresence } from "framer-motion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const EMERGENCY_QUOTES = [
    "Control the urge, or it controls you.",
    "Data shows your regret is 90% higher after this. Stop now.",
    "Relapse is a vote for the person you no longer want to be.",
    "The 5-minute pleasure is not worth the 5-day mental fog.",
    "You are one decision away from a completely different life.",
    "Your future self is begging you to stay strong right now.",
    "Every urge is an opportunity to strengthen your neural pathways of self-control.",
    "Success is the sum of small battles won against your own weakness.",
    "You don't need the hit. You need the freedom.",
    "Discipline is choosing between what you want now and what you want most."
]

const QUICK_TAGS = ["POV", "Amateur", "Outdoor", "Late Night", "Boredom"]

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
        default: return <Award className={className} />;
    }
};

const SuccessOverlay = ({ badge, onComplete }: { badge: Badge, onComplete: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.5, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-card border-2 border-amber-500/50 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center space-y-6 max-w-sm w-full relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

                <div className="w-24 h-24 bg-amber-500/20 rounded-3xl mx-auto flex items-center justify-center border border-amber-500/30">
                    <BadgeIcon name={badge.icon} className="w-12 h-12 text-amber-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 italic">Achievement Unlocked</h2>
                    <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">{badge.name}</h1>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                    <div className="pt-2">
                        <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest italic">
                            +50 XP SECURED
                        </span>
                    </div>
                </div>

                <button
                    onClick={onComplete}
                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-900/20 transition-all hover:scale-105 active:scale-95"
                >
                    Acknowledge
                </button>
            </motion.div>
        </motion.div>
    );
};

const MilestoneCard = ({ currentStreak }: { currentStreak: number }) => {
    const nextMilestone = getNextMilestone(currentStreak);
    if (!nextMilestone) return null;

    const remaining = nextMilestone.threshold - currentStreak;
    const progress = (currentStreak / nextMilestone.threshold) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-2xl border bg-zinc-900/40 backdrop-blur-md border-amber-500/20 shadow-lg flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-default"
        >
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 italic">Sentinel Progress</span>
                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{remaining}D TO NEXT RANK</span>
                </div>
                {/* Custom Progress Bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all duration-1000"
                    />
                </div>
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tighter text-zinc-500">
                    <span>Rank: {currentStreak >= 7 ? 'Reboot' : 'Initiate'}</span>
                    <span className="text-zinc-300 italic">{nextMilestone.name}</span>
                </div>
            </div>
        </motion.div>
    );
};

const DashboardPage = () => {
    const {
        mode,
        privacyMode,
        relapseModalOpen,
        setRelapseModalOpen,
        activateDeepShield,
        isDeepShieldActive,
        deepShieldUntil
    } = useMode()

    const { user, loading: authLoading, refreshUserStats, sessions, userXP } = useUser()
    const router = useRouter()

    const [emergencyQuote, setEmergencyQuote] = useState("")
    const [regretScore, setRegretScore] = useState(5)
    const [categoryValue, setCategoryValue] = useState("")
    const [mTitle, setMTitle] = useState("")
    const [mDuration, setMDuration] = useState("")
    const [mPerformer, setMPerformer] = useState("")
    const [mTags, setMTags] = useState("")
    const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null)

    const [emergencyOpen, setEmergencyOpen] = useState(false)
    const [interventionActive, setInterventionActive] = useState(false)
    const [interventionStep, setInterventionStep] = useState(0) // 0: Breath In, 1: Hold, 2: Breath Out
    const [counter, setCounter] = useState(60)
    const [xpGain, setXpGain] = useState<{ amount: number, id: number } | null>(null)
    const [timeLeft, setTimeLeft] = useState("")

    const streakMinutes = useMemo(() => {
        if (!sessions || sessions.length === 0) return 0;
        const sorted = [...sessions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastSession = new Date(sorted[0].created_at);
        const now = new Date();
        const diffMs = now.getTime() - lastSession.getTime();
        return Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }, [sessions]);

    const time = useMemo(() => {
        const days = Math.floor(streakMinutes / 1440);
        const hours = Math.floor((streakMinutes % 1440) / 60);
        const minutes = streakMinutes % 60;
        return { days, hours, minutes };
    }, [streakMinutes]);

    const stats = useMemo(() => {
        if (!sessions?.length) return { currentStreak: 0, totalSessions: 0, avgRegret: 0, longestStreak: 0 };

        const totalSessions = sessions.length;
        const avgRegret = sessions.reduce((sum, s) => sum + (s.regret_score || 0), 0) / sessions.length;
        const currentStreak = Math.floor(streakMinutes / 1440);

        // Longest streak could be calculated properly here if needed
        const longestStreak = currentStreak;

        return { currentStreak, totalSessions, avgRegret, longestStreak };
    }, [sessions, streakMinutes]);

    // Scraper State
    const [url, setUrl] = useState("")
    const [isScraping, setIsScraping] = useState(false)
    const [scrapedData, setScrapedData] = useState<any>(null)
    const [showManual, setShowManual] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login")
        }
    }, [user, authLoading, router])

    const handleScrape = async () => {
        if (!url) return;
        setIsScraping(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (!data.error) {
                setScrapedData(data);
                setShowManual(false);
            } else if (res.status === 401) {
                toast.error("Session expired or unauthorized. Please log in again.");
                router.push("/login");
            } else {
                toast.error(data.error || "Extraction failed");
            }
        } catch (err) {
            console.error("Scrape failed", err);
            toast.error("Network error during extraction");
        } finally {
            setIsScraping(false);
        }
    };

    useEffect(() => {
        if (!isDeepShieldActive || !deepShieldUntil) {
            setTimeLeft("")
            return
        }

        const interval = setInterval(() => {
            const now = Date.now()
            const diff = deepShieldUntil - now
            if (diff <= 0) {
                setTimeLeft("")
                clearInterval(interval)
                window.location.reload()
            } else {
                const mins = Math.floor(diff / 60000)
                const secs = Math.floor((diff % 60000) / 1000)
                setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [isDeepShieldActive, deepShieldUntil])

    const triggerXPGain = (amount: number) => {
        setXpGain({ amount, id: Date.now() })
        setTimeout(() => setXpGain(null), 2000)
    }

    // ── Urge Defeated: write +50 XP to DB ────────────────────────────────────
    const handleUrgeDefeated = async () => {
        triggerXPGain(XP_REWARDS.URGE_DEFEATED)
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (!currentUser) return
            // Fetch current XP then add 50
            const { data: profile } = await supabase
                .from('profiles').select('xp').eq('id', currentUser.id).single()
            const currentXP = profile?.xp ?? 0
            const newXP = currentXP + XP_REWARDS.URGE_DEFEATED
            const { data: xpResult, error } = await supabase
                .from('profiles').update({ xp: newXP }).eq('id', currentUser.id).select('xp').single()
            if (!error) await refreshUserStats()
        } catch (e) {
            console.error('handleUrgeDefeated error:', e)
        }
    }

    const addQuickTag = (tag: string) => {
        if (!categoryValue.includes(tag)) {
            setCategoryValue(prev => prev ? `${prev}, ${tag}` : tag)
        }
    }

    const handleEmergency = () => {
        const randomIndex = Math.floor(Math.random() * EMERGENCY_QUOTES.length)
        setEmergencyQuote(EMERGENCY_QUOTES[randomIndex])
        setInterventionActive(true)
        setCounter(60)
    }

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (interventionActive && counter > 0) {
            timer = setInterval(() => {
                setCounter(prev => prev - 1)
                // Breathing cycle: 4s In, 4s Hold, 4s Out = 12s total
                const cyclePos = (60 - counter) % 12
                if (cyclePos < 4) setInterventionStep(0)
                else if (cyclePos < 8) setInterventionStep(1)
                else setInterventionStep(2)
            }, 1000)
        } else if (counter === 0) {
            setInterventionActive(false)
        }
        return () => clearInterval(timer)
    }, [interventionActive, counter])

    const handleSaveSession = async (customData?: any) => {
        setIsSaving(true);
        try {
            const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !currentUser) {
                console.error("Auth Error:", authError);
                toast.error("Please log in to save sessions.");
                setIsSaving(false);
                return;
            }

            const sessionData = customData || {
                title: scrapedData?.title || mTitle || "Untitled Session",
                url: url || "Manual Entry",
                performer: scrapedData?.performer || mPerformer || "Unknown",
                categories: scrapedData?.tags || mTags.split(',').map(t => t.trim()).filter(Boolean),
                duration_minutes: parseInt(scrapedData?.duration || mDuration || "0"),
                regret_score: parseInt(regretScore.toString()) || 5,
                content_type: scrapedData?.type || (mTags.toLowerCase().includes('art') ? 'Digital Art' : 'Real Life'),
                thumbnail_url: scrapedData?.image || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&q=80",
                user_id: currentUser.id
            };

            // 1. Insert the session
            const { error: insertError } = await supabase.from('sessions').insert([sessionData]);

            if (insertError) {
                console.error('Supabase Insert Error:', insertError);
                toast.error(insertError.message);
                return;
            }

            // 2. Fetch fresh session count for this user to calculate new XP
            const { data: allSessions, error: fetchError } = await supabase
                .from('sessions')
                .select('regret_score')
                .eq('user_id', currentUser.id);

            if (fetchError) {
                console.error('Session fetch error after insert:', fetchError);
            } else if (allSessions) {
                // XP formula: (sessions * 5) + (sum of regret_scores * 2)
                const newTotalXP =
                    (allSessions.length * 5) +
                    allSessions.reduce((sum, s) => sum + (s.regret_score || 0), 0) * 2;

                // 3. Write updated XP back to profiles
                const { data: xpUpdateData, error: xpError } = await supabase
                    .from('profiles')
                    .update({ xp: newTotalXP })
                    .eq('id', currentUser.id)
                    .select('xp')
                    .single();

                if (xpError) {
                    console.error('XP write failed (check RLS policy):', xpError);
                    toast.warning('Session saved, but XP sync failed. Check RLS policy on profiles.');
                } else {
                    triggerXPGain(XP_REWARDS.LAB_ENTRY);
                }
            }

            toast.success('Session secured in the Archive.');

            // 4. Refresh UI from DB (sessions + profileXP)
            await refreshUserStats();

            const randomCollector = BADGES.filter(b => b.category === 'Collector')[Math.floor(Math.random() * 5)];
            setUnlockedBadge(randomCollector);

            // Clear form
            setScrapedData(null);
            setUrl("");
            setMTitle("");
            setMDuration("");
            setMPerformer("");
            setMTags("");
            setRegretScore(5);
            setShowManual(false);

            router.refresh();
        } catch (err: any) {
            console.error("Supabase Insert Error:", err);
            toast.error(err.message || 'Failed to log session');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <AnimatePresence>
                {unlockedBadge && (
                    <SuccessOverlay
                        badge={unlockedBadge}
                        onComplete={() => setUnlockedBadge(null)}
                    />
                )}
                {xpGain && (
                    <motion.div
                        key={xpGain.id}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-emerald-400/30 flex items-center gap-3"
                    >
                        <Beaker className="w-5 h-5 text-white animate-pulse" />
                        <span className="text-white font-black italic tracking-tighter uppercase">+{xpGain.amount} XP SECURED</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-2 text-emerald-500 uppercase">
                        <Beaker className="w-8 h-8" />
                        Extraction <span className="text-white opacity-80 font-medium">Lab</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Data Stream: <span className="text-blue-500">Live Feedback</span></p>
                </div>
                <div className="w-full md:w-80">
                    <MilestoneCard currentStreak={Math.floor(streakMinutes / 1440)} />
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Logging Widget */}
                <div className="md:col-span-2 p-8 rounded-[2.5rem] border bg-card/50 backdrop-blur-md shadow-2xl space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
                    <div className="flex items-center justify-between relative z-10">
                        <h2 className="text-xl font-black font-mono tracking-tighter uppercase italic text-zinc-300">Extraction Lab</h2>
                        <div className="flex items-center gap-3">
                            {scrapedData && (
                                <button
                                    onClick={() => setScrapedData(null)}
                                    className="text-[8px] font-black uppercase text-zinc-500 hover:text-white transition-colors tracking-widest italic"
                                >
                                    [Clear Entry]
                                </button>
                            )}
                            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-xl shadow-emerald-900/10">
                                <Plus className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                        {/* URL Entry Point */}
                        {!scrapedData && (
                            <div className="space-y-4">
                                <div className="p-3 rounded-[2rem] bg-zinc-900/80 border border-white/5 shadow-inner flex flex-col sm:flex-row items-center gap-3 group focus-within:border-emerald-500/50 transition-all">
                                    <div className="flex-1 flex items-center gap-4 px-4 w-full">
                                        <LinkIcon className="w-5 h-5 text-zinc-500 shrink-0" />
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="PASTE INTELLIGENCE URL (PORNHUB, RULE34...)"
                                            className="w-full bg-transparent border-none outline-none text-sm font-black italic tracking-tighter text-white placeholder:text-zinc-700 uppercase"
                                        />
                                    </div>
                                    <button
                                        disabled={isScraping || !url}
                                        onClick={handleScrape}
                                        className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-3xl transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 italic"
                                    >
                                        {isScraping ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : "Analyze Link"}
                                    </button>
                                </div>
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => setShowManual(!showManual)}
                                        className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-emerald-500 transition-colors italic flex items-center gap-2"
                                    >
                                        {showManual ? "[-] Hide Manual Override" : "[+] Show Manual Entry"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Scraped Preview Card */}
                        {scrapedData && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-6 rounded-[2.5rem] bg-zinc-900/40 border border-white/10 shadow-2xl space-y-6 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic border",
                                        scrapedData.type === 'Digital Art'
                                            ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                            : "text-blue-500 bg-blue-500/10 border-blue-500/20"
                                    )}>
                                        {scrapedData.type}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 pt-4">
                                    <div className="w-full md:w-56 h-36 rounded-2xl bg-zinc-800 overflow-hidden relative border border-white/5 shrink-0 shadow-2xl">
                                        {scrapedData.image ? (
                                            <img
                                                src={`/api/proxy-image?url=${encodeURIComponent(scrapedData.image)}`}
                                                alt="Thumbnail"
                                                className="w-full h-full object-cover opacity-80"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Beaker className="w-10 h-10 text-zinc-700" />
                                            </div>
                                        )}
                                        {scrapedData.duration && (
                                            <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-black text-white italic border border-white/10 flex items-center gap-1.5">
                                                <Timer className="w-3 h-3 text-emerald-500" />
                                                {scrapedData.duration}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-4 min-w-0">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black italic text-white leading-tight truncate uppercase tracking-tighter">
                                                {scrapedData.title}
                                            </h3>
                                            {scrapedData.performer && (
                                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">
                                                    <Users className="w-3.5 h-3.5" />
                                                    UNIT: {scrapedData.performer}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {scrapedData.tags.map((tag: string) => (
                                                <span key={tag} className="text-[9px] px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 font-black uppercase text-zinc-400 italic tracking-widest hover:text-emerald-500 hover:border-emerald-500/30 transition-all">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>

                                        <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-tight line-clamp-2 opacity-60">
                                            {scrapedData.description || "Extraction completed. Telemetry data isolated and ready for commitment."}
                                        </p>
                                    </div>
                                </div>
                                {/* ── Regret Score Slider ── */}
                                <div className="pt-4 border-t border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] italic text-zinc-500 flex items-center gap-2">
                                            <HeartCrack className="w-3.5 h-3.5" /> Regret Score
                                        </span>
                                        <span className={cn(
                                            "text-xl font-black italic tracking-tighter tabular-nums transition-colors",
                                            regretScore <= 3 ? "text-emerald-400" :
                                                regretScore <= 6 ? "text-amber-400" : "text-red-400"
                                        )}>
                                            {regretScore}<span className="text-[10px] text-zinc-600 ml-1">/10</span>
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1} max={10} step={1}
                                        value={regretScore}
                                        onChange={e => setRegretScore(Number(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, ${regretScore <= 3 ? '#10b981' : regretScore <= 6 ? '#f59e0b' : '#ef4444'
                                                } ${(regretScore - 1) / 9 * 100}%, #27272a ${(regretScore - 1) / 9 * 100}%)`
                                        }}
                                    />
                                    <div className="flex justify-between px-0.5">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                            <span key={n} className={cn(
                                                "text-[7px] font-black transition-colors",
                                                regretScore === n
                                                    ? n <= 3 ? "text-emerald-400" : n <= 6 ? "text-amber-400" : "text-red-400"
                                                    : "text-zinc-700"
                                            )}>{n}</span>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-zinc-600 italic uppercase tracking-widest text-center">
                                        {regretScore <= 3 ? "Low · Neutral observation" :
                                            regretScore <= 6 ? "Moderate · Mild tension detected" :
                                                "High · Significant regret signal"}
                                    </p>
                                </div>

                                {/* ── Confirm / Discard ── */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleSaveSession()}
                                        disabled={isSaving}
                                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-[10px] italic"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Confirm & Log Telemetry</>}
                                    </button>
                                    <button
                                        onClick={() => setScrapedData(null)}
                                        className="px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
                                    >
                                        Discard
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Manual Entry Form (Collapsible) */}
                        {showManual && (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="space-y-8 p-6 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.01]"
                                onSubmit={(e) => { e.preventDefault(); handleSaveSession(); }}
                            >
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground italic">
                                            <FileText className="w-4 h-4 text-white" /> Content Title
                                        </label>
                                        <input
                                            type="text"
                                            value={mTitle}
                                            onChange={(e) => setMTitle(e.target.value)}
                                            placeholder="Manually identify resource..."
                                            className="w-full bg-zinc-900/50 border-none ring-1 ring-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black italic"
                                        />
                                    </div>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground italic">
                                                <Clock className="w-4 h-4 text-emerald-500" /> Duration (MIN)
                                            </label>
                                            <input
                                                type="text"
                                                value={mDuration}
                                                onChange={(e) => setMDuration(e.target.value)}
                                                placeholder="20"
                                                className="w-full bg-zinc-900/50 border-none ring-1 ring-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black italic"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground italic">
                                                <Users className="w-4 h-4 text-purple-500" /> Performer
                                            </label>
                                            <input
                                                type="text"
                                                value={mPerformer}
                                                onChange={(e) => setMPerformer(e.target.value)}
                                                placeholder="Unit Identifier..."
                                                className="w-full bg-zinc-900/50 border-none ring-1 ring-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black italic"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground italic">
                                            <Tag className="w-4 h-4 text-blue-500" /> Tags (Comma Separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={mTags}
                                            onChange={(e) => setMTags(e.target.value)}
                                            placeholder="POV, SOLO, ETC..."
                                            className="w-full bg-zinc-900/50 border-none ring-1 ring-white/10 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black italic"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-5 p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
                                    <div className="flex items-center justify-between font-black text-[10px]">
                                        <label className="flex items-center gap-2 uppercase tracking-[0.2em] text-zinc-500 italic">
                                            <HeartCrack className="w-4 h-4 text-red-500" /> Impact Score
                                        </label>
                                        <span className="text-emerald-500">{regretScore}.0</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={regretScore}
                                        onChange={(e) => setRegretScore(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>

                                <button
                                    disabled={isSaving}
                                    className="w-full py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/30 font-black uppercase tracking-[0.3em] rounded-2xl transition-all text-[10px] italic flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Commit Manual Telemetry"}
                                </button>
                            </motion.form>
                        )}
                    </div>
                </div>

                {/* Lab Stats */}
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="p-8 rounded-[2.5rem] border bg-white/[0.03] space-y-8 flex flex-col justify-between"
                >
                    <div>
                        <h3 className="font-black flex items-center gap-2 shrink-0 italic uppercase tracking-tighter text-zinc-300">
                            <TrendingUp className="w-4 h-4 text-emerald-500" /> Data Feed Highlights
                        </h3>
                        <div className="space-y-5 mt-8">
                            {[
                                { label: "Cycle Duration", value: "18.4m", change: "-4.2" },
                                { label: "Primary Vector", value: "Late Night", change: "" },
                                { label: "Impact Factor", value: "7.2 / 10", change: "+0.3" },
                                { label: "Log Frequency", value: "0.34 / Day", change: "-0.1" },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap">{item.label}</span>
                                    <div className="text-right">
                                        <div className={cn("font-black tracking-tight transition-all duration-300 text-sm italic uppercase", item.label === "Primary Vector" && privacyMode && "blur-sm select-none")}>
                                            {item.value}
                                        </div>
                                        {item.change && <div className="text-[9px] font-black text-emerald-500">{item.change} %</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-8">
                        <Link href="/analytics" className="w-full block py-4 bg-zinc-800/50 hover:bg-zinc-700/50 text-[10px] uppercase font-black tracking-[0.4em] rounded-2xl transition-all border border-white/5 italic text-center text-white">
                            FULL METRICS
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default DashboardPage
