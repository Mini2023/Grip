"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
    Shield, ShieldCheck, Activity, Trophy, AlertTriangle,
    Zap, Wind, Dumbbell, Droplets, BookOpen, ArrowRight,
    CheckCircle2, Clock, HeartCrack, AlertCircle, Flame,
    RefreshCw, ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/providers/UserProvider"
import { useMode } from "@/components/providers/ModeProvider"
import { supabase } from "@/lib/supabaseClient"
import { motion, AnimatePresence } from "framer-motion"
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
    const { user, sessions, userXP, refreshUserStats } = useUser()
    const { isDeepShieldActive, activateDeepShield, setRelapseModalOpen } = useMode()
    const router = useRouter()

    // ── Derive streak from sessions ───────────────────────────────────────────
    const streakMinutes = useMemo(() => {
        if (!sessions || sessions.length === 0) return 0
        const sorted = [...sessions].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const diffMs = Date.now() - new Date(sorted[0].created_at).getTime()
        return Math.max(0, Math.floor(diffMs / 60000))
    }, [sessions])

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
                    {/* Cost of Failure banner */}
                    <div className="relative z-10 px-5 py-3 bg-red-500/5 border border-red-500/10 rounded-2xl max-w-sm mx-auto">
                        <p className="text-[10px] text-red-400 font-black italic uppercase tracking-widest">
                            ⚠ Relapse would reset your <span className="text-red-300">{time.days}d {time.hours}h</span> streak
                        </p>
                    </div>
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
                    "{QUOTES[quoteIdx]}"
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
                            Click "New Task" to receive your tactical intervention.
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
        </div>
    )
}
