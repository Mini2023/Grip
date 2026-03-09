"use client"

import React, { useMemo } from "react"
import {
    Trophy, CheckCircle2, Circle, Clock, Flame,
    Beaker, Shield, Zap, Target, Award,
    ChevronRight, Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/providers/UserProvider"
import { motion } from "framer-motion"

interface Quest {
    id: string
    title: string
    description: string
    xp: number
    category: 'Daily' | 'Weekly' | 'Legacy'
    progress: number
    threshold: number
    completed: boolean
    icon: any
}

const INITIAL_QUESTS: Quest[] = [
    // DAILY
    {
        id: 'd1',
        title: 'Neural Reset',
        description: 'Perform a 60s Breathing Exercise in Shield mode.',
        xp: 20,
        category: 'Daily',
        progress: 0,
        threshold: 1,
        completed: false,
        icon: Zap
    },
    {
        id: 'd2',
        title: 'Mood Baseline',
        description: 'Log your current emotional state in the Lab.',
        xp: 20,
        category: 'Daily',
        progress: 1,
        threshold: 1,
        completed: true,
        icon: Beaker
    },
    {
        id: 'd3',
        title: 'Morning Guard',
        description: 'Keep Shield active for the first 4 hours of the day.',
        xp: 30,
        category: 'Daily',
        progress: 0,
        threshold: 1,
        completed: false,
        icon: Shield
    },
    // WEEKLY
    {
        id: 'w1',
        title: 'Weekly Sovereignty',
        description: 'Maintain a 7-day Shield streak.',
        xp: 100,
        category: 'Weekly',
        progress: 4,
        threshold: 7,
        completed: false,
        icon: Shield
    },
    {
        id: 'w2',
        title: 'Data Collector',
        description: 'Submit 5 detailed logs in the Extraction Lab.',
        xp: 100,
        category: 'Weekly',
        progress: 2,
        threshold: 5,
        completed: false,
        icon: Beaker
    },
    // LEGACY
    {
        id: 'l1',
        title: 'Badge Hunter',
        description: 'Unlock 5 unique Collector badges.',
        xp: 500,
        category: 'Legacy',
        progress: 2,
        threshold: 5,
        completed: false,
        icon: Award
    },
    {
        id: 'l2',
        title: 'Quest Master Path',
        description: 'Complete 20 quests to reach ultimate mastery.',
        xp: 1000,
        category: 'Legacy',
        progress: 1, // Start with the one completed mock quest
        threshold: 20,
        completed: false,
        icon: Trophy
    }
]

export default function QuestsPage() {
    const { user, sessions, loading: userLoading } = useUser()

    const quests = useMemo(() => {
        return INITIAL_QUESTS.map(q => {
            let progress = q.progress;
            let completed = q.completed;

            if (q.id === 'w2') { // Data Collector
                progress = sessions.length;
                completed = progress >= q.threshold;
            }

            // Logic for other quests can be added here

            return {
                ...q,
                progress: completed ? q.threshold : progress,
                completed
            };
        });
    }, [sessions]);

    const totalCompleted = useMemo(() => quests.filter(q => q.completed).length, [quests])

    const sortedQuests = useMemo(() => {
        return [...quests].sort((a, b) => {
            if (a.completed === b.completed) return 0
            return a.completed ? 1 : -1
        })
    }, [quests])

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-4xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3 text-amber-500 uppercase">
                        <Target className="w-8 h-8" />
                        Mission <span className="text-white opacity-80 font-medium">Control</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Active Operation: <span className="text-amber-500">Quest Protocol</span></p>
                </div>

                <div className="flex items-center gap-6 bg-zinc-900/50 p-6 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Completed</p>
                        <div className="text-3xl font-black text-white italic tracking-tighter">{totalCompleted}</div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Mastery Rank</p>
                        <div className="text-3xl font-black text-amber-500 italic tracking-tighter">LVL {Math.floor(totalCompleted / 5) + 1}</div>
                    </div>
                </div>
            </header>

            <div className="grid gap-8">
                {['Daily', 'Weekly', 'Legacy'].map((cat) => (
                    <section key={cat} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-400 italic flex items-center gap-2">
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    cat === 'Daily' ? "bg-blue-500" : cat === 'Weekly' ? "bg-emerald-500" : "bg-purple-500"
                                )} />
                                {cat} Objectives
                            </h2>
                        </div>

                        <div className="grid gap-3">
                            {sortedQuests.filter(q => q.category === cat).map((quest) => (
                                <motion.div
                                    key={quest.id}
                                    layout
                                    className={cn(
                                        "group p-5 rounded-[2rem] border transition-all duration-500 relative overflow-hidden",
                                        quest.completed
                                            ? "bg-zinc-900/20 border-white/5 opacity-60 scale-[0.98]"
                                            : "bg-card/40 border-white/10 hover:border-white/20 hover:bg-card/60 shadow-xl"
                                    )}
                                >
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 outline outline-1 outline-offset-4 outline-transparent group-hover:outline-white/10",
                                            quest.completed ? "bg-zinc-800 text-zinc-600" : "bg-zinc-800 text-white"
                                        )}>
                                            <quest.icon className="w-6 h-6" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h3 className={cn(
                                                    "font-bold text-sm md:text-base uppercase tracking-tight italic truncate",
                                                    quest.completed ? "text-zinc-500 line-through" : "text-white"
                                                )}>
                                                    {quest.title}
                                                </h3>
                                                <span className={cn(
                                                    "text-[10px] font-black italic uppercase shrink-0",
                                                    quest.completed ? "text-zinc-600" : "text-amber-500"
                                                )}>
                                                    +{quest.xp} XP
                                                </span>
                                            </div>
                                            <p className="text-[10px] md:text-xs text-zinc-500 font-medium leading-relaxed">
                                                {quest.description}
                                            </p>

                                            {/* Progress Bar */}
                                            {!quest.completed && quest.threshold > 1 && (
                                                <div className="mt-4 space-y-1.5">
                                                    <div className="flex justify-between text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                                                        <span>Progress</span>
                                                        <span>{quest.progress} / {quest.threshold}</span>
                                                    </div>
                                                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(quest.progress / quest.threshold) * 100}%` }}
                                                            className="h-full bg-amber-600"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                                                quest.completed
                                                    ? "bg-emerald-500/10 text-emerald-500 cursor-default"
                                                    : "bg-white/5 text-zinc-500 border border-white/5"
                                            )}
                                        >
                                            {quest.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </div>
                                    </div>

                                    {/* Success Glow */}
                                    {quest.completed && (
                                        <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}
