"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
    TrendingUp, PieChart as PieIcon, BarChart3, Layers, Activity,
    HeartCrack, Users, ShieldCheck, Zap, BrainCircuit, AlertCircle,
    Clock, Camera, PenTool
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useMode } from "@/components/providers/ModeProvider"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useUser } from "@/components/providers/UserProvider"
import { Loader2 } from "lucide-react"

// --- CONSTANTS ---
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6"];

const REGRET_TRIGGERS_FALLBACK = [
    { tag: "Solo POV", score: 9.2, color: "bg-red-500/20 text-red-500" },
    { tag: "Late Night", score: 8.5, color: "bg-orange-500/20 text-orange-400" },
    { tag: "Boredom", score: 7.8, color: "bg-amber-500/20 text-amber-500" },
]

const AnalyticsPage = () => {
    const { privacyMode, setMode, setRelapseModalOpen } = useMode()
    const { user, loading: authLoading, sessions } = useUser()
    const router = useRouter()

    const [period, setPeriod] = useState("7D")
    const [metric, setMetric] = useState("duration")
    const [isMobile, setIsMobile] = useState(false)
    const [tagA, setTagA] = useState("POV")
    const [tagB, setTagB] = useState("Amateur")
    const loading = false

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login")
            return
        }
    }, [user, authLoading, router])

    const filteredSessions = useMemo(() => {
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case "7D":
                startDate.setDate(now.getDate() - 7);
                break;
            case "30D":
                startDate.setDate(now.getDate() - 30);
                break;
            case "90D":
                startDate.setDate(now.getDate() - 90);
                break;
            case "1Y":
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case "ALL":
            default:
                return sessions; // No filtering needed for "ALL"
        }

        return sessions.filter(session => new Date(session.created_at) >= startDate);
    }, [sessions, period]);

    const processedData = useMemo(() => {
        if (!filteredSessions.length) return { trend: [], categories: [], types: [], topPerformers: [], allTags: [], metrics: { totalDuration: 0, avgRegret: 0, count: 0, prob: 0 } };

        const trendMap: Record<string, any> = {};
        const categoriesMap: Record<string, number> = {};
        const typesMap: Record<string, number> = {};
        // ── Performer grouping fix: use a map, not a list ──────────────────────
        const performersMap: Record<string, number> = {};

        filteredSessions.forEach(s => {
            const date = new Date(s.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
            if (!trendMap[date]) trendMap[date] = { date, duration: 0, regret: 0, frequency: 0, tagA: 0, tagB: 0 };

            const dur = parseInt(s.duration_minutes) || 0;
            trendMap[date].duration += dur;
            trendMap[date].regret = (trendMap[date].regret * trendMap[date].frequency + (s.regret_score || 0)) / (trendMap[date].frequency + 1);
            trendMap[date].frequency += 1;

            if (Array.isArray(s.categories)) {
                s.categories.forEach((t: string) => {
                    const tag = t.trim();
                    categoriesMap[tag] = (categoriesMap[tag] || 0) + 1;
                    // Dynamic tag comparison: match tagA / tagB (case-insensitive)
                    if (tag.toLowerCase().includes(tagA.toLowerCase())) trendMap[date].tagA += 1;
                    if (tag.toLowerCase().includes(tagB.toLowerCase())) trendMap[date].tagB += 1;
                });
            }

            const cType = s.content_type || 'Real Life';
            typesMap[cType] = (typesMap[cType] || 0) + 1;
            // Group performers: accumulate count per unique name
            if (s.performer && s.performer.trim()) {
                const name = s.performer.trim();
                performersMap[name] = (performersMap[name] || 0) + 1;
            }
        });

        const trend = Object.values(trendMap);
        const categories = Object.entries(categoriesMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value], i) => ({ name: privacyMode ? "****" : name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

        const types = Object.entries(typesMap).map(([name, value], i) => ({
            name, value, color: name === "Real Life" ? "#3b82f6" : "#10b981"
        }));

        // Sorted, grouped performers (no duplicates)
        const topPerformers = Object.entries(performersMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name: privacyMode ? "****" : name, count }));

        // All unique tags for dropdowns
        const allTags = Object.keys(categoriesMap).sort();

        const totalDuration = filteredSessions.reduce((sum, s) => sum + (parseInt(s.duration_minutes) || 0), 0);
        const avgRegret = filteredSessions.reduce((sum, s) => sum + (s.regret_score || 0), 0) / filteredSessions.length;

        return { trend, categories, types, topPerformers, allTags, metrics: { totalDuration, avgRegret, count: filteredSessions.length, prob: Math.min(avgRegret * 10, 100) } };
    }, [filteredSessions, privacyMode, tagA, tagB]);

    if (loading || authLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Syncing Telemetry...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-24 overflow-x-hidden">
            {/* Header with Global Filter */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-emerald-500 italic uppercase">
                        <BarChart3 className="w-8 h-8" />
                        Intelligence Lab
                    </h1>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">Strategic behavioral telemetry overlay.</p>
                </div>

                <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 self-start shadow-inner no-scrollbar overflow-x-auto max-w-full">
                    {["7D", "30D", "90D", "1Y", "ALL"].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-3 md:px-5 py-2 rounded-lg text-[10px] md:text-sm font-black transition-all uppercase tracking-tighter md:tracking-widest whitespace-nowrap",
                                period === p ? "bg-emerald-500 text-emerald-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "text-zinc-500 hover:text-white"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </header>

            {/* Top Grid: Metric Analysis & Distribution */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Metric Analysis Card */}
                <div className="lg:col-span-2 p-6 rounded-3xl border bg-card/40 backdrop-blur-md shadow-2xl space-y-6 max-w-[calc(100vw-32px)] md:max-w-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h2 className="font-black flex items-center gap-2 text-zinc-100 italic text-[10px] md:text-sm">
                                <Activity className="w-4 h-4 text-blue-500" />
                                <span className="uppercase tracking-widest">Metric Drift</span>
                            </h2>
                            <select
                                value={metric}
                                onChange={(e) => setMetric(e.target.value)}
                                className="bg-zinc-800/50 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/5 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                <option value="duration">Duration</option>
                                <option value="regret">Regret Index</option>
                                <option value="frequency">Frequency</option>
                            </select>
                        </div>
                        {!isMobile && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-black border border-blue-500/20">
                                DATA SET: {period}
                            </span>
                        )}
                    </div>

                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={processedData.trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#525252"
                                    fontSize={isMobile ? 8 : 9}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={12}
                                    interval={isMobile ? "preserveStartEnd" : 0}
                                />
                                <YAxis
                                    stroke="#525252"
                                    fontSize={isMobile ? 8 : 9}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={12}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={metric}
                                    stroke={metric === 'duration' ? "#3b82f6" : metric === 'regret' ? "#ef4444" : "#10b981"}
                                    strokeWidth={isMobile ? 3 : 4}
                                    dot={!isMobile ? { fill: '#09090b', strokeWidth: 3, r: 5 } : false}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                    animationDuration={1500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Type Mix — Real Life vs Animation */}
                <div className="lg:col-span-1 p-6 rounded-3xl border bg-card/40 backdrop-blur-md shadow-2xl flex flex-col items-center justify-between max-w-[calc(100vw-32px)] md:max-w-none">
                    <div className="w-full flex items-center justify-between mb-2">
                        <h2 className="font-black flex items-center gap-2 text-zinc-100 italic text-[10px] md:text-sm">
                            <Layers className="w-4 h-4 text-emerald-500" />
                            <span className="uppercase tracking-widest">Type Mix</span>
                        </h2>
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Content Type</span>
                    </div>
                    <div className="h-[200px] md:h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={processedData.types}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={isMobile ? 40 : 60}
                                    outerRadius={isMobile ? 65 : 85}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {processedData.types.map((entry: any, index: number) => (
                                        <Cell key={`type-cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                                />
                                {!isMobile && (
                                    <Legend
                                        verticalAlign="bottom"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }}
                                    />
                                )}
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-black text-muted-foreground uppercase tracking-widest italic">
                        <span>Dominant: {processedData.types[0]?.name || "N/A"}</span>
                        <span className="text-emerald-500">
                            {processedData.types[0] && processedData.metrics.count > 0
                                ? Math.round((processedData.types[0].value / processedData.metrics.count) * 100)
                                : 0}% SHARE
                        </span>
                    </div>
                </div>
            </div>

            {/* Middle Grid: Category Drift & Spotlight */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Behavioral Shift — dynamic Tag A vs Tag B */}
                <div className="lg:col-span-2 p-6 rounded-3xl border bg-card/40 backdrop-blur-md shadow-2xl space-y-6 max-w-[calc(100vw-32px)] md:max-w-none">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h2 className="font-black flex items-center gap-2 text-zinc-100 italic text-[10px] md:text-sm">
                            <Layers className="w-4 h-4 text-emerald-500" />
                            <span className="uppercase tracking-widest">Behavioral Shift</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <select
                                value={tagA}
                                onChange={e => setTagA(e.target.value)}
                                className="bg-zinc-800/80 text-[10px] font-black uppercase text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 outline-none cursor-pointer max-w-[120px] truncate"
                            >
                                {(processedData.allTags.length ? processedData.allTags : ['POV', 'Amateur', 'Solo', 'Teen', 'Milf']).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <span className="text-zinc-600 font-black text-xs">vs</span>
                            <select
                                value={tagB}
                                onChange={e => setTagB(e.target.value)}
                                className="bg-zinc-800/80 text-[10px] font-black uppercase text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 outline-none cursor-pointer max-w-[120px] truncate"
                            >
                                {(processedData.allTags.length ? processedData.allTags : ['Amateur', 'POV', 'Solo', 'Teen', 'Milf']).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={processedData.trend}>
                                <defs>
                                    <linearGradient id="colorTagA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorTagB" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="date" stroke="#525252" fontSize={isMobile ? 8 : 9} tickLine={false} axisLine={false} interval={isMobile ? "preserveStartEnd" : 0} />
                                <YAxis stroke="#525252" fontSize={isMobile ? 8 : 9} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }} />
                                {!isMobile && <Legend iconType="rect" wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />}
                                <Area type="monotone" dataKey="tagA" name={tagA} stroke="#3b82f6" fillOpacity={1} fill="url(#colorTagA)" />
                                <Area type="monotone" dataKey="tagB" name={tagB} stroke="#10b981" fillOpacity={1} fill="url(#colorTagB)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Performer Spotlight — grouped, no duplicates */}
                <div className="lg:col-span-1 p-6 rounded-3xl border bg-card/40 backdrop-blur-md shadow-2xl space-y-6 max-w-[calc(100vw-32px)] md:max-w-none">
                    <h2 className="font-black flex items-center gap-2 text-zinc-100 italic text-[10px] md:text-sm">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="uppercase tracking-widest">Spotlight Personnel</span>
                    </h2>
                    <div className="space-y-3">
                        {processedData.topPerformers.map((p: any, i: number) => (
                            <div key={p.name} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-purple-500/40 transition-all cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-[9px] font-black text-zinc-500 group-hover:bg-purple-500 group-hover:text-purple-950 transition-colors shrink-0 italic">
                                        #{i + 1}
                                    </div>
                                    <span className={cn("text-[10px] md:text-xs font-black uppercase tracking-tighter text-zinc-300", privacyMode && "blur-sm select-none")}>{p.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-white italic">{p.count}x</div>
                                </div>
                            </div>
                        ))}
                        {!processedData.topPerformers.length && (
                            <p className="text-[10px] text-zinc-600 italic uppercase tracking-widest text-center py-8">No performers logged yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Micro-Stats */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                {[
                    { label: "Trigger Link", value: `${Math.round(processedData.metrics.avgRegret * 8)}%`, trend: "-2%", icon: BrainCircuit, color: "text-blue-500" },
                    { label: "Extraction", value: `${Math.round(processedData.metrics.totalDuration / Math.max(1, filteredSessions.length))}m`, trend: "-5%", icon: Activity, color: "text-amber-500" },
                    { label: "Efficiency", value: processedData.metrics.avgRegret < 5 ? "High" : "Alert", trend: "STBL", icon: ShieldCheck, color: "text-emerald-500" },
                    { label: "Probability", value: `${Math.round(processedData.metrics.prob)}%`, trend: "-2%", icon: AlertCircle, color: "text-red-500" },
                ].map((metric, i) => (
                    <div key={metric.label} className="p-4 md:p-5 rounded-2xl border bg-card/40 backdrop-blur-md border-white/5 flex flex-col gap-3 group hover:border-white/10 transition-colors max-w-full overflow-hidden">
                        <div className="flex justify-between items-start">
                            <div className={cn("p-2 rounded-xl bg-white/5 shrink-0", metric.color)}>
                                <metric.icon className="w-4 h-4 md:w-5 h-5" />
                            </div>
                            <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                metric.trend.startsWith('-') ? "bg-emerald-500/10 text-emerald-500" : metric.trend === "STBL" ? "bg-zinc-800 text-zinc-400" : "bg-amber-500/10 text-amber-500"
                            )}>
                                {metric.trend}
                            </span>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <span className={cn(
                                "text-[8px] uppercase font-black text-zinc-500 tracking-widest transition-all duration-300 block truncate",
                                metric.label.includes("Trigger") && privacyMode && "blur-sm select-none"
                            )}>
                                {metric.label}
                            </span>
                            <div className="text-base md:text-2xl font-black text-white italic truncate">{metric.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Distribution Analysis Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Distribution Analysis</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Category Breakdown — full width now that Type Mix is removed */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-[2.5rem] border bg-card/20 backdrop-blur-3xl space-y-6 md:col-span-2"
                    >
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 italic flex items-center gap-2">
                            <PieIcon className="w-4 h-4 text-blue-500" /> Category Breakdown
                        </h3>
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={processedData.categories}
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {processedData.categories.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                                        itemStyle={{ fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', fontSize: '10px' }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value) => <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400 italic">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                </div>

                {/* Final Info Card */}
                <div
                    onClick={() => setRelapseModalOpen(true)}
                    className="p-6 rounded-[2.5rem] border border-red-500/20 bg-red-500/5 backdrop-blur-md flex flex-col md:flex-row items-center gap-6 max-w-[calc(100vw-32px)] md:max-w-none cursor-pointer hover:bg-red-500/10 transition-colors group"
                >
                    <div className="p-4 rounded-2xl bg-red-500/20 shrink-0 group-hover:scale-110 transition-transform">
                        <HeartCrack className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="text-center md:text-left space-y-2">
                        <h3 className="font-black text-zinc-100 uppercase tracking-tighter italic flex items-center gap-2 justify-center md:justify-start">
                            <AlertCircle className="w-4 h-4" /> Strategic Protocol Alert
                        </h3>
                        <p className="text-[10px] md:text-xs text-zinc-400 max-w-2xl leading-relaxed uppercase tracking-tighter">
                            Historical data indicates <span className="text-white font-black italic">{period} Period</span> late-night vectors with
                            <span className={cn("text-red-400 font-black italic", privacyMode && "blur-sm")}> {processedData.categories[0]?.name || "Detected Triggers"} </span>
                            yield a <span className="text-red-500 font-black italic">{Math.round(processedData.metrics.prob)}% Adverse Impact</span> rating. Engage Shield 120min pre-sleep.
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setMode('shield');
                            router.push('/');
                        }}
                        className="whitespace-nowrap px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/30 md:ml-auto italic"
                    >
                        LOCK SHIELD
                    </button>
                </div>

                {/* History Integration */}
                <div className="pt-8 flex justify-center">
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="group relative px-10 py-5 rounded-3xl bg-zinc-900 border border-white/10 hover:border-emerald-500/50 transition-all overflow-hidden">
                                <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <div className="relative flex items-center gap-3">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                    <span className="text-xs font-black uppercase tracking-[0.4em] italic text-zinc-400 group-hover:text-white transition-colors">View Full History Logs</span>
                                </div>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                                <div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Archives <span className="text-emerald-500">Protocol</span></h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">Full telemetry logs history</p>
                                </div>
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-zinc-900/30">
                                            <th className="p-5 font-black text-[10px] uppercase tracking-widest text-zinc-500 italic">Timeline</th>
                                            <th className="p-5 font-black text-[10px] uppercase tracking-widest text-zinc-500 italic">Preview</th>
                                            <th className="p-5 font-black text-[10px] uppercase tracking-widest text-zinc-500 italic">Extraction</th>
                                            <th className="p-5 font-black text-[10px] uppercase tracking-widest text-zinc-500 italic">Classifiers</th>
                                            <th className="p-5 font-black text-[10px] uppercase tracking-widest text-zinc-500 italic">Vector Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sessions.slice().reverse().map((log, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-5 font-mono text-[11px] text-zinc-400">{new Date(log.created_at).toLocaleString()}</td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-16 h-10 rounded-lg bg-zinc-800 border border-white/5 overflow-hidden relative shrink-0 shadow-lg">
                                                            <img
                                                                src={log.thumbnail_url ? `/api/proxy-image?url=${encodeURIComponent(log.thumbnail_url)}` : "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=200&h=120&fit=crop"}
                                                                alt="Log Preview"
                                                                className={cn("w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity", privacyMode && "blur-sm")}
                                                            />
                                                            <div className="absolute inset-0 bg-black/20" />
                                                        </div>
                                                        {log.content_type === "Real Life" ? (
                                                            <Camera className="w-4 h-4 text-blue-500" />
                                                        ) : (
                                                            <PenTool className="w-4 h-4 text-emerald-500" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-2 font-black text-white italic text-xs uppercase tracking-tighter">
                                                        <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                                        {log.duration_minutes} MIN
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className={cn("flex flex-wrap gap-1.5", privacyMode && "blur-sm")}>
                                                        {(log.categories || []).map((tag: string) => (
                                                            <span key={tag} className="text-[9px] px-2 py-0.5 rounded-lg bg-zinc-900 border border-white/5 font-black uppercase tracking-tighter text-zinc-500 italic">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest italic",
                                                        log.regret_score > 7 ? "text-red-500" : log.regret_score > 4 ? "text-amber-500" : "text-emerald-500"
                                                    )}>
                                                        SCORE: {log.regret_score}.0
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-6 bg-zinc-900/50 border-t border-white/5 flex justify-center">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 italic">End of telemetry stream.</p>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )
}

export default AnalyticsPage
