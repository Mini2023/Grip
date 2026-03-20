"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Activity, Sparkles, Shield, Flame, TrendingUp, TrendingDown, Minus,
    Download, X as XIcon, Calendar,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import html2canvas from "html2canvas"

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Types                                                                 */
/* ═══════════════════════════════════════════════════════════════════════ */
interface WeekdayData { day: string; count: number }

interface TriggerItem {
    name: string; count: number
    weekdays: WeekdayData[]; peak_day: string
}
interface ArtistItem {
    name: string; count: number
    weekdays: WeekdayData[]; peak_day: string
}

interface ComputedData {
    total_sessions: number
    top_triggers: TriggerItem[]
    top_artists: ArtistItem[]
    media_types: { type: string; count: number; percent: number }[]
    weekly_this_month: number[]
    weekly_prev_month: number[]
    behavior_change_percent: number
    longest_streak_days: number
    total_relapses: number
    main_relapse_trigger: string
    top_relapse_triggers: { name: string; count: number }[]
}

interface Stories {
    intro_text: string; trigger_story: string; behavior_text: string
    artist_story: string; media_text: string; streak_text: string
    relapse_story: string; summary_text: string
    next_mission_title: string; next_mission_text: string
}

interface WrappedV2 { computed: ComputedData; stories: Stories }

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Themes                                                                */
/* ═══════════════════════════════════════════════════════════════════════ */
type ThemeKey = "intro" | "emerald" | "orange" | "outro"
const THEMES: Record<ThemeKey, { rgb: string; accent: string }> = {
    intro:   { rgb: "168, 85, 247", accent: "text-purple-400" },
    emerald: { rgb: "16, 185, 129",  accent: "text-emerald-400" },
    orange:  { rgb: "249, 115, 22",  accent: "text-orange-400" },
    outro:   { rgb: "168, 85, 247", accent: "text-purple-400" },
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Animation helpers                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */
const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
})
const scalePop = (delay = 0) => ({
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
})
const staggerItem = (i: number) => ({
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: 0.3 + i * 0.1, duration: 0.4 },
})

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Custom SVG Line Graph (replaces Recharts for smooth animation)        */
/* ═══════════════════════════════════════════════════════════════════════ */
function AnimatedLineGraph({ data, prevData, isActive }: {
    data: number[]; prevData: number[]; isActive: boolean
}) {
    const W = 320; const H = 140; const PAD = 24
    const maxVal = Math.max(...data, ...prevData, 1)

    const toPoints = (vals: number[]) =>
        vals.map((v, i) => ({
            x: PAD + (i / (vals.length - 1)) * (W - PAD * 2),
            y: H - PAD - (v / maxVal) * (H - PAD * 2),
        }))

    const toPath = (pts: { x: number; y: number }[]) =>
        pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

    const currentPts = toPoints(data)
    const prevPts = toPoints(prevData)

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm h-auto">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(pct => (
                <line key={pct} x1={PAD} x2={W - PAD}
                    y1={H - PAD - pct * (H - PAD * 2)} y2={H - PAD - pct * (H - PAD * 2)}
                    stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            ))}
            {/* X labels */}
            {data.map((_, i) => (
                <text key={i} x={currentPts[i].x} y={H - 4}
                    textAnchor="middle" fill="#52525b" fontSize={9} fontWeight={800}
                >W{i + 1}</text>
            ))}
            {/* Previous month line (dim) */}
            <motion.path d={toPath(prevPts)} fill="none" stroke="#3f3f46" strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isActive ? { pathLength: 1, opacity: 0.5 } : { pathLength: 0, opacity: 0 }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            />
            {/* Current month line */}
            <motion.path d={toPath(currentPts)} fill="none" stroke="#10b981" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isActive ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
            />
            {/* Glow version of line */}
            <motion.path d={toPath(currentPts)} fill="none" stroke="#10b981" strokeWidth={6}
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isActive ? { pathLength: 1, opacity: 0.15 } : { pathLength: 0, opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                filter="blur(4px)"
            />
            {/* Dots */}
            {currentPts.map((p, i) => (
                <motion.circle key={i} cx={p.x} cy={p.y} r={4}
                    fill="#10b981" stroke="#000" strokeWidth={1.5}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                    transition={{ delay: 0.8 + i * 0.15, duration: 0.3 }}
                />
            ))}
            {/* Value labels */}
            {currentPts.map((p, i) => (
                <motion.text key={`v${i}`} x={p.x} y={p.y - 12}
                    textAnchor="middle" fill="#10b981" fontSize={10} fontWeight={800}
                    initial={{ opacity: 0 }}
                    animate={isActive ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 1.0 + i * 0.15, duration: 0.3 }}
                >{data[i]}</motion.text>
            ))}
        </svg>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Expandable weekday detail (for Trigger/Artist slides)                 */
/* ═══════════════════════════════════════════════════════════════════════ */
function WeekdayDetail({ weekdays, peakDay }: { weekdays: WeekdayData[]; peakDay: string }) {
    const maxCount = Math.max(...weekdays.map(w => w.count), 1)
    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
        >
            <div className="pt-3 pb-1 px-1">
                <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                        Wochenverteilung · Peak: {peakDay}
                    </span>
                </div>
                <div className="flex items-end gap-1 h-12">
                    {weekdays.map((w) => (
                        <div key={w.day} className="flex-1 flex flex-col items-center gap-0.5">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(4, (w.count / maxCount) * 32)}px` }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="w-full rounded-sm bg-emerald-500/30"
                                style={{ minHeight: 3 }}
                            />
                            <span className="text-[8px] font-bold text-zinc-600">{w.day}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Intro                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */
function IntroSlide({ stories, computed }: { stories: Stories; computed: ComputedData }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400/60 mb-4">
                Retrospective
            </motion.p>
            <motion.h1 {...scalePop(0.2)} className="text-6xl sm:text-8xl font-black italic uppercase tracking-tighter text-white mb-4"
                style={{ textShadow: '0 0 50px rgba(168,85,247,0.3)' }}>
                Grip Wrapped
            </motion.h1>
            <motion.p {...fadeUp(0.4)} className="text-5xl sm:text-7xl font-black italic text-purple-400 mb-6"
                style={{ textShadow: '0 4px 30px rgba(168,85,247,0.5)' }}>
                {computed.total_sessions}
            </motion.p>
            <motion.p {...fadeUp(0.5)} className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/60 mb-8">
                Sessions Tracked
            </motion.p>
            <motion.p {...fadeUp(0.6)} className="text-lg text-zinc-400 max-w-md leading-relaxed">
                {stories.intro_text}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Top Triggers (expandable)                                      */
/* ═══════════════════════════════════════════════════════════════════════ */
function TriggerSlide({ stories, computed }: { stories: Stories; computed: ComputedData }) {
    const [expanded, setExpanded] = useState<string | null>(null)

    const handleItemClick = (e: React.MouseEvent, name: string) => {
        e.stopPropagation()
        setExpanded(prev => prev === name ? null : name)
    }

    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 mb-2">The Lab</motion.p>
            <motion.h2 {...fadeUp(0.15)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-8"
                style={{ textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                Top Triggers
            </motion.h2>
            <div className="w-full max-w-sm space-y-2 mb-8">
                {computed.top_triggers.map((t, i) => (
                    <motion.div key={t.name} {...staggerItem(i)}>
                        <button
                            onClick={(e) => handleItemClick(e, t.name)}
                            className="w-full flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-5 py-3 hover:bg-emerald-500/10 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-emerald-400 font-black italic text-lg">#{i + 1}</span>
                                <span className="text-white font-bold capitalize">{t.name}</span>
                            </div>
                            <span className="text-emerald-400/60 font-black text-sm">{t.count}×</span>
                        </button>
                        <AnimatePresence>
                            {expanded === t.name && (
                                <WeekdayDetail weekdays={t.weekdays} peakDay={t.peak_day} />
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
            <motion.p {...fadeUp(0.8)} className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">
                Tap a trigger for details
            </motion.p>
            <motion.p {...fadeUp(0.85)} className="text-base text-zinc-400 max-w-md leading-relaxed">
                {stories.trigger_story}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Behavior (custom SVG graph)                                    */
/* ═══════════════════════════════════════════════════════════════════════ */
function BehaviorSlide({ stories, computed, isActive }: { stories: Stories; computed: ComputedData; isActive: boolean }) {
    const pct = computed.behavior_change_percent
    const TrendIcon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus
    const trendColor = pct > 0 ? "text-red-400" : pct < 0 ? "text-emerald-400" : "text-zinc-400"

    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 mb-2">The Lab</motion.p>
            <motion.h2 {...fadeUp(0.15)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                Behavior
            </motion.h2>
            <motion.div {...scalePop(0.25)} className={`flex items-center gap-2 mb-6 ${trendColor}`}>
                <TrendIcon className="w-6 h-6" />
                <span className="text-3xl font-black italic">{pct > 0 ? '+' : ''}{pct}%</span>
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">vs. Vormonat</span>
            </motion.div>
            <motion.div {...fadeUp(0.35)} className="w-full flex justify-center mb-4">
                <AnimatedLineGraph
                    data={computed.weekly_this_month}
                    prevData={computed.weekly_prev_month}
                    isActive={isActive}
                />
            </motion.div>
            <motion.div {...fadeUp(0.5)} className="flex gap-6 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] bg-emerald-500 rounded-full" />
                    <span className="text-[9px] font-bold uppercase text-zinc-500">Diesen Monat</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] bg-zinc-600 rounded-full" />
                    <span className="text-[9px] font-bold uppercase text-zinc-500">Vormonat</span>
                </div>
            </motion.div>
            <motion.p {...fadeUp(0.6)} className="text-base text-zinc-400 max-w-md leading-relaxed">
                {stories.behavior_text}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Top Artists (expandable)                                       */
/* ═══════════════════════════════════════════════════════════════════════ */
function ArtistSlide({ stories, computed }: { stories: Stories; computed: ComputedData }) {
    const [expanded, setExpanded] = useState<string | null>(null)

    const handleItemClick = (e: React.MouseEvent, name: string) => {
        e.stopPropagation()
        setExpanded(prev => prev === name ? null : name)
    }

    if (computed.top_artists.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 mb-2">The Lab</motion.p>
                <motion.h2 {...fadeUp(0.15)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-8"
                    style={{ textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>Top Artists</motion.h2>
                <motion.p {...fadeUp(0.3)} className="text-zinc-500 italic">Keine verwertbaren Artist-Daten.</motion.p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 mb-2">The Lab</motion.p>
            <motion.h2 {...fadeUp(0.15)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-10"
                style={{ textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                Top Artists
            </motion.h2>
            <div className="space-y-3 w-full max-w-sm mb-8">
                {computed.top_artists.map((a, i) => (
                    <motion.div key={a.name} {...staggerItem(i)}>
                        <button
                            onClick={(e) => handleItemClick(e, a.name)}
                            className="w-full flex items-center gap-4 hover:bg-emerald-500/5 rounded-2xl p-3 transition-colors text-left"
                        >
                            <span className="text-4xl font-black italic text-emerald-400"
                                style={{ textShadow: '0 2px 15px rgba(16,185,129,0.4)' }}>
                                #{i + 1}
                            </span>
                            <div className="text-left">
                                <p className="text-lg font-black italic uppercase text-white capitalize">{a.name}</p>
                                <p className="text-xs font-bold text-emerald-400/50">{a.count} Sessions</p>
                            </div>
                        </button>
                        <AnimatePresence>
                            {expanded === a.name && (
                                <WeekdayDetail weekdays={a.weekdays} peakDay={a.peak_day} />
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
            <motion.p {...fadeUp(0.6)} className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">
                Tap an artist for details
            </motion.p>
            <motion.p {...fadeUp(0.65)} className="text-base text-zinc-400 max-w-md leading-relaxed">
                {stories.artist_story}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Media Types                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */
function MediaSlide({ stories, computed, isActive }: { stories: Stories; computed: ComputedData; isActive: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 mb-2">The Lab</motion.p>
            <motion.h2 {...fadeUp(0.15)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-10"
                style={{ textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
                Media Types
            </motion.h2>
            <div className="w-full max-w-xs space-y-4 mb-8">
                {computed.media_types.map((m, i) => (
                    <motion.div key={m.type} {...staggerItem(i)} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-white font-bold">{m.type}</span>
                            <span className="text-emerald-400 font-black italic">{m.percent}%</span>
                        </div>
                        <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={isActive ? { width: `${m.percent}%` } : { width: 0 }}
                                transition={{ delay: 0.5 + i * 0.15, duration: 0.8, ease: "easeOut" }}
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ boxShadow: '0 0 10px rgba(16,185,129,0.4)' }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
            <motion.p {...fadeUp(0.8)} className="text-base text-zinc-400 max-w-md leading-relaxed">
                {stories.media_text}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Streak Hero                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */
function StreakSlide({ stories, computed }: { stories: Stories; computed: ComputedData }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/60 mb-2">The Shield</motion.p>
            <motion.h2 {...fadeUp(0.15)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(249,115,22,0.3)' }}>
                Longest Streak
            </motion.h2>
            <motion.div {...scalePop(0.3)} className="mb-4">
                <p className="text-8xl sm:text-[10rem] font-black italic text-orange-400 leading-none"
                    style={{ textShadow: '0 4px 40px rgba(249,115,22,0.5)' }}>
                    {computed.longest_streak_days}
                </p>
            </motion.div>
            <motion.p {...fadeUp(0.5)} className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400/50 mb-8">
                Tage Clean
            </motion.p>
            <motion.p {...fadeUp(0.6)} className="text-base text-zinc-400 max-w-md leading-relaxed">
                {stories.streak_text}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Relapses                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */
function RelapseSlide({ stories, computed }: { stories: Stories; computed: ComputedData }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.p {...fadeUp(0.1)} className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/60 mb-2">The Shield</motion.p>
            <motion.h2 {...fadeUp(0.15)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-8"
                style={{ textShadow: '0 0 30px rgba(249,115,22,0.3)' }}>
                Relapses
            </motion.h2>
            <div className="grid grid-cols-2 gap-5 max-w-sm w-full mb-6">
                <motion.div {...scalePop(0.3)} className="p-5 bg-red-500/5 rounded-2xl border border-red-500/15 text-center">
                    <p className="text-5xl font-black italic text-red-400" style={{ textShadow: '0 2px 15px rgba(239,68,68,0.4)' }}>
                        {computed.total_relapses}
                    </p>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-red-400/50 mt-2">Total Lapses</p>
                </motion.div>
                <motion.div {...scalePop(0.4)} className="p-5 bg-orange-500/5 rounded-2xl border border-orange-500/15 text-center flex flex-col justify-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-orange-400/50 mb-1">Prime Adversary</p>
                    <p className="text-lg font-black italic text-orange-400 capitalize">{computed.main_relapse_trigger}</p>
                </motion.div>
            </div>
            {computed.top_relapse_triggers.length > 1 && (
                <motion.div {...fadeUp(0.5)} className="mb-6 flex flex-wrap justify-center gap-2">
                    {computed.top_relapse_triggers.slice(1).map((t) => (
                        <span key={t.name} className="px-3 py-1 bg-orange-500/10 border border-orange-500/15 text-orange-400 text-xs font-black uppercase italic rounded-xl capitalize">
                            {t.name} ({t.count}×)
                        </span>
                    ))}
                </motion.div>
            )}
            <motion.p {...fadeUp(0.6)} className="text-base text-zinc-400 max-w-md leading-relaxed">
                {stories.relapse_story}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Summary                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */
function SummarySlide({ stories }: { stories: Stories }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.div {...scalePop(0.1)} className="mb-6">
                <Shield className="w-12 h-12 text-purple-400" style={{ filter: 'drop-shadow(0 0 15px rgba(168,85,247,0.5))' }} />
            </motion.div>
            <motion.h2 {...fadeUp(0.2)} className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white mb-8"
                style={{ textShadow: '0 0 30px rgba(168,85,247,0.3)' }}>
                Zusammenfassung
            </motion.h2>
            <motion.p {...fadeUp(0.4)} className="text-lg text-zinc-300 max-w-lg leading-relaxed">
                {stories.summary_text}
            </motion.p>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide: Mission (final — with export buttons)                          */
/* ═══════════════════════════════════════════════════════════════════════ */
function MissionSlide({ stories, onSavePng }: { stories: Stories; onSavePng: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <motion.div {...scalePop(0.1)} className="mb-6">
                <Flame className="w-12 h-12 text-purple-400" style={{ filter: 'drop-shadow(0 0 15px rgba(168,85,247,0.5))' }} />
            </motion.div>
            <motion.p {...fadeUp(0.15)} className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-400/60 mb-4">Dein Auftrag</motion.p>
            <motion.h2 {...fadeUp(0.25)} className="text-4xl sm:text-6xl font-black italic uppercase tracking-tighter text-white mb-8"
                style={{ textShadow: '0 0 40px rgba(168,85,247,0.3)' }}>
                {stories.next_mission_title}
            </motion.h2>
            <motion.p {...fadeUp(0.45)} className="text-lg text-zinc-300 max-w-lg leading-relaxed mb-10">
                {stories.next_mission_text}
            </motion.p>
            <motion.div {...fadeUp(0.65)} className="flex gap-4 flex-wrap justify-center">
                <button
                    onClick={(e) => { e.stopPropagation(); window.close() }}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
                >
                    <XIcon className="w-3.5 h-3.5" /> Close Wrapped
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onSavePng() }}
                    className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
                >
                    <Download className="w-3.5 h-3.5" /> Save as PNG
                </button>
            </motion.div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Export card (hidden, rendered for html2canvas)                         */
/* ═══════════════════════════════════════════════════════════════════════ */
const ExportCard = React.forwardRef<HTMLDivElement, { data: WrappedV2 }>(({ data }, ref) => {
    const c = data.computed; const s = data.stories
    return (
        <div ref={ref} style={{
            width: 600, padding: 48, background: '#09090b',
            fontFamily: 'system-ui, -apple-system, sans-serif', color: '#fff',
            position: 'fixed', top: -9999, left: -9999, zIndex: -1,
        }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <p style={{ color: '#a78bfa', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 8 }}>
                    Retrospective
                </p>
                <h1 style={{ fontSize: 48, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.05em', marginBottom: 4 }}>
                    Grip Wrapped
                </h1>
                <p style={{ color: '#71717a', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    30-Day Summary · {new Date().toLocaleDateString('de-DE')}
                </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
                    <p style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: '#34d399' }}>{c.total_sessions}</p>
                    <p style={{ fontSize: 8, fontWeight: 900, color: 'rgba(16,185,129,0.5)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Sessions</p>
                </div>
                <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 16, padding: 20, textAlign: 'center' }}>
                    <p style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: '#fb923c' }}>{c.longest_streak_days}</p>
                    <p style={{ fontSize: 8, fontWeight: 900, color: 'rgba(249,115,22,0.5)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Max Streak</p>
                </div>
            </div>
            <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 9, fontWeight: 900, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 8 }}>Top Triggers</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {c.top_triggers.slice(0, 3).map(t => (
                        <span key={t.name} style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 12, fontWeight: 900, fontStyle: 'italic', color: '#6ee7b7', textTransform: 'uppercase' }}>
                            #{t.name}
                        </span>
                    ))}
                </div>
            </div>
            <div style={{ padding: 20, background: 'rgba(113,113,122,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: '#a1a1aa' }}>{s.summary_text}</p>
            </div>
            <div style={{ textAlign: 'center', marginTop: 24 }}>
                <p style={{ fontSize: 9, fontWeight: 900, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Grip Control · {new Date().getFullYear()}</p>
            </div>
        </div>
    )
})
ExportCard.displayName = "ExportCard"

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Slide registry                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */
interface SlideConfig {
    theme: ThemeKey
    render: (d: WrappedV2, isActive: boolean, onSavePng: () => void) => React.ReactNode
}

const SLIDES: SlideConfig[] = [
    { theme: "intro",   render: (d)          => <IntroSlide    stories={d.stories} computed={d.computed} /> },
    { theme: "emerald", render: (d)          => <TriggerSlide  stories={d.stories} computed={d.computed} /> },
    { theme: "emerald", render: (d, active)  => <BehaviorSlide stories={d.stories} computed={d.computed} isActive={active} /> },
    { theme: "emerald", render: (d)          => <ArtistSlide   stories={d.stories} computed={d.computed} /> },
    { theme: "emerald", render: (d, active)  => <MediaSlide    stories={d.stories} computed={d.computed} isActive={active} /> },
    { theme: "orange",  render: (d)          => <StreakSlide   stories={d.stories} computed={d.computed} /> },
    { theme: "orange",  render: (d)          => <RelapseSlide  stories={d.stories} computed={d.computed} /> },
    { theme: "outro",   render: (d)          => <SummarySlide  stories={d.stories} /> },
    { theme: "outro",   render: (d, _, save) => <MissionSlide  stories={d.stories} onSavePng={save} /> },
]

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Main Page                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function WrappedPage() {
    const [data, setData] = useState<WrappedV2 | null>(null)
    const [current, setCurrent] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [direction, setDirection] = useState(1)
    const [paused, setPaused] = useState(false)
    const [progress, setProgress] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const touchStartX = useRef(0)
    const exportRef = useRef<HTMLDivElement>(null)

    const SLIDE_DURATION = 8000

    /* ── Fetch ───────────────────────────────────────────────────────── */
    useEffect(() => {
        const go = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { setError("Not authenticated."); setLoading(false); return }
                const res = await fetch('/api/grip-wrapped', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id }),
                })
                const json = await res.json()
                if (json.error) throw new Error(json.detail || json.error)
                setData(json)
            } catch (e: any) {
                console.error(e)
                setError(e.message || "Generation failed")
            } finally {
                setLoading(false)
            }
        }
        go()
    }, [])

    /* ── Navigation ──────────────────────────────────────────────────── */
    const goNext = useCallback(() => {
        setDirection(1); setProgress(0)
        setCurrent(p => Math.min(p + 1, SLIDES.length - 1))
    }, [])

    const goPrev = useCallback(() => {
        setDirection(-1); setProgress(0)
        setCurrent(p => Math.max(p - 1, 0))
    }, [])

    /* ── Auto-progress ───────────────────────────────────────────────── */
    useEffect(() => {
        if (loading || !data || paused) return
        const iv = setInterval(() => {
            setProgress(p => {
                const next = p + (50 / SLIDE_DURATION) * 100
                if (next >= 100) { goNext(); return 0 }
                return next
            })
        }, 50)
        return () => clearInterval(iv)
    }, [loading, data, paused, current, goNext])

    /* ── Keyboard ────────────────────────────────────────────────────── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext() }
            if (e.key === "ArrowLeft") { e.preventDefault(); goPrev() }
            if (e.key === "Escape") window.close()
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [goNext, goPrev])

    /* ── Click zones ─────────────────────────────────────────────────── */
    const handleClick = (e: React.MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        if (e.clientX - rect.left < rect.width / 2) goPrev()
        else goNext()
    }

    const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; setPaused(true) }
    const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - touchStartX.current
        if (diff > 50) goPrev(); else if (diff < -50) goNext()
        setPaused(false)
    }

    /* ── Export as PNG ────────────────────────────────────────────────── */
    const handleSavePng = async () => {
        if (!exportRef.current) return
        try {
            const canvas = await html2canvas(exportRef.current, {
                backgroundColor: '#09090b',
                scale: 2,
            })
            const link = document.createElement('a')
            link.download = `grip-wrapped-${new Date().toISOString().slice(0, 7)}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
        } catch (err) {
            console.error('PNG export failed:', err)
        }
    }

    /* ── Slide transitions ───────────────────────────────────────────── */
    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? "80%" : "-80%", opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? "-80%" : "80%", opacity: 0 }),
    }

    /* ── Error state ─────────────────────────────────────────────────── */
    if (error) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 text-center z-[9999]">
                <p className="text-red-500 font-black italic uppercase tracking-widest text-lg mb-4">Error</p>
                <p className="text-zinc-500 max-w-md">{error}</p>
                <button onClick={() => window.close()}
                    className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-black uppercase tracking-widest text-xs">
                    Close
                </button>
            </div>
        )
    }

    /* ── Loading state ───────────────────────────────────────────────── */
    if (loading || !data) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 space-y-6 z-[9999]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Activity className="w-10 h-10 text-purple-500" />
                </motion.div>
                <p className="text-purple-400 font-black italic uppercase tracking-[0.2em] text-sm">
                    Compiling your 30-Day Retrospective...
                </p>
                <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-purple-500 rounded-full"
                        animate={{ width: ["0%", "70%", "90%"] }}
                        transition={{ duration: 6, ease: "easeInOut" }}
                    />
                </div>
            </div>
        )
    }

    const activeTheme = THEMES[SLIDES[current].theme]

    return (
        <div className="fixed inset-0 bg-black z-[9999] overflow-hidden select-none" style={{ touchAction: "pan-y" }}>
            {/* Hidden export card for html2canvas */}
            <ExportCard ref={exportRef} data={data} />

            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-3 pt-3">
                {SLIDES.map((_, i) => (
                    <div key={i} className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-[width] duration-75"
                            style={{
                                backgroundColor: `rgb(${activeTheme.rgb})`,
                                width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Ambient glow */}
            <AnimatePresence mode="wait">
                <motion.div key={`glow-${current}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[200px] opacity-25"
                        style={{ backgroundColor: `rgb(${activeTheme.rgb})` }} />
                    <div className="absolute bottom-[-5%] right-[10%] w-[300px] h-[300px] rounded-full blur-[160px] opacity-15"
                        style={{ backgroundColor: `rgb(${activeTheme.rgb})` }} />
                </motion.div>
            </AnimatePresence>

            {/* Click zone (ABOVE slide content for tap/click navigation) */}
            <div ref={containerRef} className="absolute inset-0 z-40 cursor-pointer"
                onClick={handleClick}
                onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
                onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
            />

            {/* Slide content (below click zone — buttons use pointer-events-auto) */}
            <div className="absolute inset-0 z-30 flex items-center justify-center pt-6 pb-10 pointer-events-none">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div key={current} custom={direction}
                        variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {SLIDES[current].render(data, current === SLIDES.indexOf(SLIDES[current]), handleSavePng)}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Nav hint */}
            <div className="absolute bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-700">
                    Tap to navigate · {current + 1} / {SLIDES.length}
                </p>
            </div>
        </div>
    )
}
