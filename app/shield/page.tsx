"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
    Shield, ShieldCheck, Activity, Trophy, AlertTriangle,
    Zap, Wind, Dumbbell, Droplets, BookOpen, ArrowRight,
    CheckCircle2, Clock, HeartCrack, AlertCircle, Flame,
    RefreshCw, ExternalLink, ShieldAlert, Bot, User as UserIcon, Send, Scan, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/providers/UserProvider"
import { useMode } from "@/components/providers/ModeProvider"
import { supabase } from "@/lib/supabaseClient"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

// ── Tactical Interventions ────────────────────────────────────────────────────
const INTERVENTIONS = [
    { id: 'pu', icon: Dumbbell, task: "Do 20 Push-Ups right now", xp: 10, color: "text-blue-500" },
    { id: 'cw', icon: Droplets, task: "Drink a full glass of cold water", xp: 10, color: "text-cyan-500" },
    { id: 'sq', icon: Dumbbell, task: "Do 30 Air Squats", xp: 10, color: "text-violet-500" },
    { id: 'bx', icon: Wind, task: "Box breathing: 4×4×4×4 for 2 minutes", xp: 10, color: "text-emerald-500" },
    { id: 'wa', icon: ArrowRight, task: "Go outside for a 5-minute walk", xp: 10, color: "text-amber-500" },
    { id: 'jn', icon: BookOpen, task: "Write 3 things you are grateful for", xp: 10, color: "text-pink-500" },
    { id: 'sh', icon: Droplets, task: "Take a cold shower (30 seconds minimum)", xp: 10, color: "text-cyan-400" },
    { id: 'br', icon: Wind, task: "5-minute deep breathing meditation", xp: 10, color: "text-indigo-500" },
]

// ── Voice of Reason Quotes ────────────────────────────────────────────────────
const QUOTES = [
    "Control the urge, or it controls you.",
    "Every urge you defeat makes the next one weaker.",
    "You don't need the hit. You need the freedom.",
    "Discipline is choosing between what you want now and what you want most.",
    "The 5-minute pleasure is not worth the 5-day mental fog.",
    "Your future self is watching this decision in real time.",
    "One battle at a time. You are winning this one.",
    "Success is the sum of small battles won against your own weakness.",
    "You are one decision away from a completely different life.",
    "The urge always peaks and passes. Outlast it.",
]

// ── XP writer helper ──────────────────────────────────────────────────────────
async function addXP(userId: string, amount: number): Promise<boolean> {
    const { data: profile } = await supabase
        .from('profiles').select('xp').eq('id', userId).single()
    const newXP = (profile?.xp ?? 0) + amount
    const { error } = await supabase
        .from('profiles').update({ xp: newXP }).eq('id', userId)
    if (error) console.error('addXP error:', error)
    return !error
}

export default function ShieldPage() {
    const { user, sessions, userXP, refreshUserStats, streakMinutes } = useUser()
    const { isDeepShieldActive, activateDeepShield, setRelapseModalOpen } = useMode()
    const router = useRouter()

    const [urgeModalOpen, setUrgeModalOpen] = useState(false)
    const [urgeMode, setUrgeMode] = useState<'drill' | 'empathy'>('drill')
    const [messages, setMessages] = useState<{role: string, content: string}[]>([])
    const [chatInput, setChatInput] = useState("")
    const [chatLoading, setChatLoading] = useState(false)
    const chatEndRef = React.useRef<HTMLDivElement>(null)

    const [autopsyLoading, setAutopsyLoading] = useState(false)
    const [autopsyReport, setAutopsyReport] = useState<string | null>(null)

    const topRiskTags = useMemo(() => {
        if (!sessions || sessions.length === 0) return [];
        const tagCounts: Record<string, number> = {};
        const ignoredTags = ['4k', '1080p', 'hd', 'unknown'];
        
        sessions.forEach(s => {
            if (Array.isArray(s.categories)) {
                s.categories.forEach((tag: string) => {
                    const normalized = tag.toLowerCase().trim();
                    if (!ignoredTags.includes(normalized) && normalized.length > 1) {
                        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
                    }
                });
            }
        });

        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag]) => tag);
    }, [sessions]);

    const handleRunAutopsy = async () => {
        if (!user || !sessions || sessions.length === 0) {
            toast.error("Keine ausreichenden Daten für eine Autopsie vorhanden.");
            return;
        }

        setAutopsyLoading(true);
        setAutopsyReport(null);

        try {
            const recentSessions = [...sessions]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 50)
                .map(s => ({
                    timestamp: s.created_at,
                    tags: s.categories,
                    regret: s.regret_score,
                    type: s.content_type
                }));

            const res = await fetch('/api/ai-autopsy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionsData: recentSessions })
            });
            const data = await res.json();
            
            if (data.report) {
                setAutopsyReport(data.report);
            } else {
                toast.error("Autopsie fehlgeschlagen: " + (data.error || "Unbekannter Fehler"));
            }
        } catch (error) {
            console.error("Autopsie Fehler:", error);
            toast.error("Kritischer Fehler bei der Autopsie.");
        } finally {
            setAutopsyLoading(false);
        }
    }

    useEffect(() => {
        if (urgeModalOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, urgeModalOpen])

    const handleSendUrgeMessage = async (overrideText?: string) => {
        const textToSend = overrideText || chatInput;
        if (!textToSend.trim() || !user) return;
        const newMessages = [...messages, { role: 'user', content: textToSend }];
        setMessages(newMessages);
        if (!overrideText) setChatInput("");
        setChatLoading(true);

        try {
            const res = await fetch('/api/urge-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    toneMode: urgeMode,
                    userId: user.id
                })
            });
            const data = await res.json();
            if (data.role && data.content) {
                setMessages(prev => [...prev, { role: data.role, content: data.content }]);
            } else {
                toast.error("Urge Protocol error: " + (data.error || "Unknown"));
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to reach Urge Protocol.");
        } finally {
            setChatLoading(false);
        }
    }

    const time = useMemo(() => ({
        days: Math.floor(streakMinutes / 1440),
        hours: Math.floor((streakMinutes % 1440) / 60),
        minutes: streakMinutes % 60,
    }), [streakMinutes])

    // ── Relapse Risk ──────────────────────────────────────────────────────────
    const hoursClean = Math.floor(streakMinutes / 60)
    const riskPct = Math.min(100, Math.round((hoursClean / 72) * 100))
    const riskColor = riskPct < 30 ? 'text-emerald-500' : riskPct < 60 ? 'text-amber-500' : 'text-red-500'
    const riskLabel = riskPct < 30 ? 'Low Risk' : riskPct < 60 ? 'Moderate Risk' : 'High Risk'

    // ── Guardian Streak ───────────────────────────────────────────────────────
    const guardianDays = useMemo(() => {
        if (!sessions.length) return 0
        let streak = 0
        const sorted = [...sessions].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        for (const s of sorted) {
            if ((s.regret_score || 0) > 7) break
            streak++
        }
        return streak
    }, [sessions])

    // ── Intervention State ────────────────────────────────────────────────────
    const [currentTask, setCurrentTask] = useState<typeof INTERVENTIONS[0] | null>(null)
    const [taskDone, setTaskDone] = useState(false)
    const [taskLoading, setTaskLoading] = useState(false)

    const rollTask = useCallback(() => {
        const idx = Math.floor(Math.random() * INTERVENTIONS.length)
        setCurrentTask(INTERVENTIONS[idx])
        setTaskDone(false)
    }, [])

    const completeTask = async () => {
        if (!user || !currentTask || taskDone) return
        setTaskLoading(true)
        const ok = await addXP(user.id, currentTask.xp)
        if (ok) {
            setTaskDone(true)
            toast.success(`+${currentTask.xp} XP — Objective complete. Discipline reinforced.`)
            await refreshUserStats()
        } else {
            toast.error("Failed to save XP. Check RLS on profiles.")
        }
        setTaskLoading(false)
    }

    // ── Voice of Reason ───────────────────────────────────────────────────────
    const [quoteIdx, setQuoteIdx] = useState(0)
    useEffect(() => {
        const t = setInterval(() => setQuoteIdx(i => (i + 1) % QUOTES.length), 8000)
        return () => clearInterval(t)
    }, [])

    // ── Quick Escape ──────────────────────────────────────────────────────────
    const handleQuickEscape = async () => {
        // Log urge as neutralized in DB
        if (user) {
            const { error } = await supabase.from('sessions').insert({
                user_id: user.id,
                title: 'Urge Neutralized',
                url: '',
                duration_minutes: '0',
                regret_score: 0,
                categories: ['Neutralized'],
                content_type: 'Real Life',
                thumbnail_url: '',
                performer: '',
            })
            if (!error) {
                toast.success("Urge logged as neutralized.")
                await refreshUserStats()
            } else {
                console.error('Quick Escape log error:', error.message)
            }
        }
        window.open('https://en.wikipedia.org/wiki/Special:Random', '_blank', 'noopener')
    }

    if (!user) return null

    const circumference = 251.2
    const riskOffset = circumference - (circumference * riskPct) / 100

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-32 max-w-5xl mx-auto">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3 text-blue-500 uppercase">
                        <Shield className="w-8 h-8" /> Defensive <span className="text-white">Vector</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                        Sovereignty Protocol: <span className="text-emerald-500">Engaged</span>
                    </p>
                </div>
                {/* XP from DB — via userXP from UserProvider */}
                <div className="flex items-center gap-3 bg-zinc-900/50 px-5 py-3 rounded-2xl border border-white/5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Performance Rating</p>
                        <p className="text-sm font-black text-white italic">
                            LVL {userXP.level} — <span className="text-amber-500">{userXP.totalXP} XP</span>
                        </p>
                    </div>
                </div>
            </header>

            {/* ── EMERGENCY: URGE PROTOCOL ── */}
            <div className="flex justify-center mt-6 mb-8">
                <button 
                    onClick={() => setUrgeModalOpen(true)}
                    className="group relative px-6 md:px-10 py-5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 rounded-[2rem] shadow-[0_0_30px_rgba(239,68,68,0.1)] hover:shadow-[0_0_50px_rgba(239,68,68,0.2)] transition-all flex items-center gap-4 overflow-hidden w-full md:w-auto"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/10 to-red-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/30">
                        <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
                    </div>
                    <div className="text-left relative z-10">
                        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-red-500">EMERGENCY: URGE PROTOCOL</h2>
                        <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-black flex items-center gap-2">
                            <Bot className="w-3 h-3" /> AI Shield Companion · Tap to engage
                        </p>
                    </div>
                </button>
            </div>

            {/* ── Top Grid ──────────────────────────────────────────────────── */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                {/* Integrity Streak Counter */}
                <div className="lg:col-span-2 p-10 rounded-[2.5rem] border bg-card/40 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 relative z-10">Integrity Streak</h2>
                    <div className="flex items-end gap-3 md:gap-6 relative z-10">
                        {[
                            { val: time.days.toString(), label: 'Days' },
                            { val: time.hours.toString().padStart(2, '0'), label: 'Hrs' },
                            { val: time.minutes.toString().padStart(2, '0'), label: 'Min' },
                        ].map((t, i) => (
                            <React.Fragment key={t.label}>
                                {i > 0 && <span className="text-4xl md:text-6xl font-light text-zinc-800 mb-6">:</span>}
                                <div className="flex flex-col items-center">
                                    <span className="text-6xl md:text-8xl font-black text-white italic tracking-tighter leading-none">{t.val}</span>
                                    <span className={cn("text-[10px] font-black mt-2 tracking-widest uppercase", i === 0 ? "text-blue-500" : "text-zinc-500")}>{t.label}</span>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                    {/* Report Lapse Action */}
                    <button
                        onClick={() => setRelapseModalOpen(true)}
                        className="relative z-10 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-sm mx-auto group/relapse hover:bg-red-500/20 transition-all active:scale-95"
                    >
                        <p className="text-[10px] text-red-500 font-black italic uppercase tracking-widest flex items-center gap-2">
                            <HeartCrack className="w-3.5 h-3.5 group-hover/relapse:animate-pulse" />
                            Report Lapse & Reset <span className="text-red-400">{time.days}d {time.hours}h</span> Streak
                        </p>
                    </button>
                </div>

                {/* Relapse Risk + Guardian Streak + Quick Escape */}
                <div className="p-6 rounded-[2.5rem] border bg-card/30 backdrop-blur-md space-y-5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" /> Relapse Risk Index
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 shrink-0">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="40" cy="40" r="34" fill="transparent" stroke="currentColor" strokeWidth="7" className="text-zinc-800" />
                                <circle cx="40" cy="40" r="34" fill="transparent" stroke="currentColor" strokeWidth="7"
                                    strokeDasharray={circumference} strokeDashoffset={riskOffset}
                                    className={cn(riskColor, 'transition-all duration-1000')} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={cn('text-xl font-black italic', riskColor)}>{riskPct}%</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className={cn('text-xs font-black uppercase tracking-widest italic', riskColor)}>{riskLabel}</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">{hoursClean}h clean. Risk peaks at 72h.</p>
                        </div>
                    </div>
                    {/* Guardian Streak */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Guardian Streak</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-white italic">{guardianDays}</span>
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">clean</span>
                        </div>
                    </div>
                    {/* Quick Escape */}
                    <button
                        onClick={handleQuickEscape}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-all"
                    >
                        <ShieldCheck className="w-4 h-4" /> Quick Escape + Log Neutralized
                    </button>
                </div>
            </div>

            {/* ── Relapse Autopsy Module ── */}
            <div className="p-8 rounded-[2.5rem] border bg-card/40 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 italic flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-500" /> Current Risk Profile
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-8 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500/80 italic flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> High Risk Triggers:
                    </span>
                    {topRiskTags.length > 0 ? (
                        topRiskTags.map(tag => (
                            <span key={tag} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl italic">
                                {tag}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black italic">No sufficient data</span>
                    )}
                </div>

                {!autopsyReport ? (
                    <button
                        onClick={handleRunAutopsy}
                        disabled={autopsyLoading}
                        className="w-full relative px-6 py-5 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 rounded-3xl transition-all flex items-center justify-center gap-3 overflow-hidden z-10"
                    >
                        {autopsyLoading ? (
                            <>
                                <Activity className="w-5 h-5 text-orange-500 animate-pulse" />
                                <span className="text-xs text-orange-500 font-black uppercase tracking-[0.2em] italic animate-pulse">
                                    Analyzing dopamine patterns...
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0 border border-orange-500/30">
                                    <Scan className="w-5 h-5 text-orange-500" />
                                </div>
                                <span className="text-sm text-orange-500 font-black uppercase tracking-[0.2em] italic">
                                    Run Deep AI Autopsy
                                </span>
                            </>
                        )}
                    </button>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 w-full max-w-2xl mx-auto">
                        <div className="p-8 md:p-10 bg-zinc-950 rounded-[2.5rem] border border-orange-500/20 shadow-[0_0_50px_rgba(249,115,22,0.1)] relative">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 left-10 w-32 h-1 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />
                            <div className="absolute -top-3 left-6">
                                <span className="bg-zinc-950 text-orange-500 px-3 py-1 font-black italic uppercase tracking-[0.3em] text-[8px] border border-orange-500/20 rounded-full">
                                    Deep Analysis Complete
                                </span>
                            </div>

                            <ReactMarkdown
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-black italic uppercase tracking-tighter text-orange-500 mb-6 pb-4 border-b border-orange-500/20" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-lg font-black italic uppercase tracking-widest text-orange-400 mt-10 mb-5 flex items-center gap-3 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-sm font-black italic uppercase tracking-widest text-orange-300 mt-6 mb-3" {...props} />,
                                    p: ({ node, ...props }) => <p className="text-[12px] font-medium leading-relaxed text-zinc-300 mb-5" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="space-y-4 mb-6" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="space-y-4 mb-6 list-decimal list-inside text-orange-500 font-black italic" {...props} />,
                                    li: ({ node, ...props }) => (
                                        <li className="flex items-start gap-3 text-[12px] font-medium leading-relaxed text-zinc-300 group">
                                            <ChevronRight className="w-4 h-4 text-orange-500 shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
                                            <span className="flex-1" {...props} />
                                        </li>
                                    ),
                                    strong: ({ node, ...props }) => <strong className="font-black text-white italic tracking-wide" {...props} />,
                                    em: ({ node, ...props }) => <em className="text-orange-200 italic" {...props} />,
                                    blockquote: ({ node, ...props }) => (
                                        <blockquote className="border-l-2 border-orange-500/50 pl-4 py-1 my-5 bg-orange-500/5 rounded-r-xl" {...props} />
                                    ),
                                }}
                            >
                                {autopsyReport}
                            </ReactMarkdown>
                        </div>
                        <button
                            onClick={() => setAutopsyReport(null)}
                            className="w-full py-4 bg-zinc-900 border border-white/5 hover:bg-orange-600/10 hover:border-orange-500/30 text-zinc-500 hover:text-orange-500 uppercase tracking-widest font-black text-[10px] rounded-2xl transition-all italic flex items-center justify-center gap-2"
                        >
                            <Scan className="w-3.5 h-3.5" /> Dismiss Report
                        </button>
                    </div>
                )}
            </div>

            {/* ── Voice of Reason ────────────────────────────────────────────── */}
            <motion.div
                key={quoteIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.6 }}
                className="p-8 rounded-[2.5rem] border border-emerald-500/10 bg-emerald-500/[0.03] text-center space-y-3"
            >
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-500/60 italic">Voice of Reason</p>
                <p className="text-lg md:text-2xl font-black italic tracking-tight text-zinc-100 leading-snug">
                    &quot;{QUOTES[quoteIdx]}&quot;
                </p>
                <button
                    onClick={() => setQuoteIdx(i => (i + 1) % QUOTES.length)}
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1 mx-auto"
                >
                    <RefreshCw className="w-3 h-3" /> Next
                </button>
            </motion.div>

            {/* ── Tactical Intervention Card ─────────────────────────────────── */}
            <div className="p-8 rounded-[2.5rem] border bg-card/40 backdrop-blur-md shadow-2xl space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="font-black flex items-center gap-2 text-zinc-100 italic text-sm uppercase tracking-widest">
                        <Flame className="w-5 h-5 text-orange-500" /> Tactical Intervention
                    </h2>
                    <button
                        onClick={rollTask}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> New Task
                    </button>
                </div>

                {!currentTask ? (
                    <div className="text-center py-10 space-y-4">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">
                            Click &quot;New Task&quot; to receive your tactical intervention.
                        </p>
                        <button
                            onClick={rollTask}
                            className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-900/30 text-[10px]"
                        >
                            Generate Intervention
                        </button>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentTask.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-5 p-6 bg-white/[0.03] border border-white/5 rounded-2xl">
                                <div className={cn("w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center shrink-0", currentTask.color)}>
                                    <currentTask.icon className="w-7 h-7" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-lg font-black text-white italic tracking-tight">{currentTask.task}</p>
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                        +{currentTask.xp} XP on completion
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    disabled={taskDone || taskLoading}
                                    onClick={completeTask}
                                    className={cn(
                                        "flex-1 py-4 font-black uppercase tracking-widest rounded-2xl text-[10px] transition-all flex items-center justify-center gap-2",
                                        taskDone
                                            ? "bg-emerald-500/10 text-emerald-500 cursor-default border border-emerald-500/20"
                                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                                    )}
                                >
                                    {taskDone
                                        ? <><CheckCircle2 className="w-4 h-4" /> Completed — +{currentTask.xp} XP</>
                                        : taskLoading
                                            ? "Saving..."
                                            : <><CheckCircle2 className="w-4 h-4" /> Mark Complete</>
                                    }
                                </button>
                                <button
                                    onClick={rollTask}
                                    className="px-5 py-4 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
                                >
                                    Skip
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

            {/* ── Deep Shield Hard-Lock ──────────────────────────────────────── */}
            <div className={cn(
                "p-8 rounded-[2.5rem] border shadow-2xl transition-all duration-500 relative overflow-hidden",
                isDeepShieldActive ? "bg-red-500/10 border-red-500/50" : "bg-card/40 border-white/10"
            )}>
                <div className="space-y-4 relative z-10">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 italic flex items-center gap-2">
                        <Zap className={cn("w-4 h-4", isDeepShieldActive ? "text-red-500 animate-pulse" : "text-amber-500")} />
                        {isDeepShieldActive ? "Status: Deep Protocol Active" : "Strategic Hard-Lock"}
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium leading-relaxed">
                        {isDeepShieldActive
                            ? "Access to Lab & Analytics suspended. Locked for maximum focus."
                            : "Engage Deep Shield to temporarily disable all distractions."}
                    </p>
                </div>
                {!isDeepShieldActive ? (
                    <div className="grid grid-cols-3 gap-2 py-4 relative z-10">
                        {[10, 30, 60].map(mins => (
                            <button key={mins} onClick={() => activateDeepShield(mins)}
                                className="py-3 rounded-2xl bg-zinc-900 border border-white/5 hover:border-blue-500/50 text-[10px] font-black text-white italic uppercase tracking-tighter transition-all hover:scale-105 active:scale-95">
                                {mins} MIN
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center space-y-2 relative z-10">
                        <div className="text-4xl font-black text-red-500 italic tracking-tighter animate-pulse">LOCKED</div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic opacity-50">Manual Override Disabled</p>
                    </div>
                )}
            </div>

            {/* ── URGE PROTOCOL MODAL ── */}
            <Dialog open={urgeModalOpen} onOpenChange={setUrgeModalOpen}>
                <DialogContent className="sm:max-w-xl bg-zinc-950 border border-red-500/20 text-white p-0 overflow-hidden flex flex-col h-[85vh] sm:h-[650px] shadow-[0_0_80px_rgba(239,68,68,0.15)] rounded-[2.5rem]">
                    {/* Header */}
                    <div className="p-6 border-b border-red-500/10 bg-red-950/20 relative shrink-0">
                        <div className="absolute top-0 right-0 p-4 z-50">
                            <DialogClose asChild>
                                <button className="p-2 rounded-full bg-black/50 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-colors border border-white/5">
                                    <AlertTriangle className="w-4 h-4" />
                                </button>
                            </DialogClose>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-red-500 flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 animate-pulse" />
                            Urge Protocol
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/60 mt-1">
                            Emergency AI Shield Companion
                        </p>
                        
                        {/* Mode Toggle Tabs */}
                        <div className="flex gap-2 p-1.5 bg-zinc-900/80 rounded-2xl mt-5 border border-white/5 max-w-sm">
                            <button 
                                onClick={() => setUrgeMode('drill')}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic",
                                    urgeMode === 'drill' 
                                        ? "bg-red-600 text-white shadow-lg shadow-red-900/30" 
                                        : "text-zinc-500 hover:text-red-400"
                                )}
                            >
                                Drill Instructor
                            </button>
                            <button 
                                onClick={() => setUrgeMode('empathy')}
                                className={cn(
                                    "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic",
                                    urgeMode === 'empathy' 
                                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30" 
                                        : "text-zinc-500 hover:text-emerald-400"
                                )}
                            >
                                Therapist
                            </button>
                        </div>
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-950">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
                                <div className="space-y-4 opacity-50 flex flex-col items-center">
                                    <Bot className="w-16 h-16 text-zinc-800" />
                                    <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 italic max-w-xs">
                                        {urgeMode === 'drill' 
                                            ? "Stop being weak. Tell me your urge so we can execute it." 
                                            : "I am here. Describe what you are feeling right now."}
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-sm">
                                    <button 
                                        onClick={() => handleSendUrgeMessage("Hilf mir!")}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic border",
                                            urgeMode === 'drill'
                                                ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                        )}
                                    >
                                        Hilf mir!
                                    </button>
                                    <button 
                                        onClick={() => handleSendUrgeMessage("Ich brauche Motivation")}
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all italic border",
                                            urgeMode === 'drill'
                                                ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                        )}
                                    >
                                        Ich brauche Motivation
                                    </button>
                                </div>
                            </div>
                        ) : (
                            messages.map((m, i) => (
                                <div key={i} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[90%] sm:max-w-[85%] rounded-3xl p-4 space-y-2 border",
                                        m.role === 'user' 
                                            ? "bg-zinc-900 border-white/10 rounded-tr-sm" 
                                            : cn(
                                                "bg-gradient-to-b rounded-tl-sm", 
                                                urgeMode === 'drill' 
                                                    ? "from-red-950/30 to-zinc-950 border-red-500/20 text-red-50" 
                                                    : "from-emerald-950/30 to-zinc-950 border-emerald-500/20 text-emerald-50"
                                            )
                                    )}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {m.role === 'user' ? (
                                                <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center">
                                                    <UserIcon className="w-3 h-3 text-zinc-400" />
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full flex items-center justify-center",
                                                    urgeMode === 'drill' ? "bg-red-500/20" : "bg-emerald-500/20"
                                                )}>
                                                    <Bot className={cn("w-3 h-3", urgeMode === 'drill' ? "text-red-500" : "text-emerald-500")} />
                                                </div>
                                            )}
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-50 italic">
                                                {m.role === 'user' ? 'Operator' : (urgeMode === 'drill' ? 'Sergeant AI' : 'Guide AI')}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed">
                                            {m.content}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        {chatLoading && (
                            <div className="flex w-full justify-start">
                                <div className="max-w-[85%] rounded-3xl p-5 bg-zinc-900/30 border border-white/5 rounded-tl-sm">
                                    <div className="flex space-x-2 items-center h-4">
                                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} className="h-4" />
                    </div>
                    
                    {/* Input Field */}
                    <div className="p-4 sm:p-5 bg-zinc-950 border-t border-white/5 shrink-0">
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSendUrgeMessage(); }}
                            className={cn(
                                "flex items-center gap-3 bg-zinc-900 p-2.5 rounded-2xl border transition-colors",
                                urgeMode === 'drill' ? "focus-within:border-red-500/50 border-white/5" : "focus-within:border-emerald-500/50 border-white/5"
                            )}
                        >
                            <input 
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="State your weakness..."
                                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-white placeholder:text-zinc-600 px-3 italic w-full"
                                disabled={chatLoading}
                            />
                            <button 
                                type="submit"
                                disabled={!chatInput.trim() || chatLoading}
                                className={cn(
                                    "p-3.5 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-2",
                                    urgeMode === 'drill' 
                                        ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20" 
                                        : "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                                )}
                            >
                                <Send className="w-4 h-4" />
                                <span className="hidden sm:inline">Send</span>
                            </button>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
