"use client"

import React, { useEffect, useState } from "react"
import { Settings, LogOut, Moon, Lock, Save, User as UserIcon, Pencil, Loader2, Sparkles, ExternalLink } from "lucide-react"
import { useMode } from "@/components/providers/ModeProvider"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function SettingsPage() {
    const { privacyMode, togglePrivacyMode } = useMode()
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const [userId, setUserId] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string>("")
    const [createdAt, setCreatedAt] = useState<Date | null>(null)
    const [daysToWrapped, setDaysToWrapped] = useState<number>(0)
    const [hoursToWrapped, setHoursToWrapped] = useState<number>(0)
    const [wrappedLoading, setWrappedLoading] = useState(false)

    // Display name
    const [displayName, setDisplayName] = useState("")
    const [savingName, setSavingName] = useState(false)

    // Privacy settings states
    const [statsVisibility, setStatsVisibility] = useState("global")
    const [prefsVisibility, setPrefsVisibility] = useState("global")
    const [savingPrivacy, setSavingPrivacy] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserId(user.id)
                setUserEmail(user.email || "")
                const { data } = await supabase
                    .from('profiles')
                    .select('show_stats_publicly, show_preferences_publicly, display_name, username, created_at')
                    .eq('id', user.id)
                    .single()
                if (data) {
                    setStatsVisibility(data.show_stats_publicly || 'global')
                    setPrefsVisibility(data.show_preferences_publicly || 'global')
                    setDisplayName(data.display_name || data.username?.split('@')[0] || '')
                    if (data.created_at) {
                        const created = new Date(data.created_at);
                        setCreatedAt(created);
                        calculateNextWrapped(created);
                    }
                }
            }
        }
        fetchSettings()
    }, [])

    const calculateNextWrapped = (created: Date) => {
        const now = new Date();
        const next = new Date(created);
        while (next <= now) {
            next.setMonth(next.getMonth() + 1);
        }
        const diffMs = next.getTime() - now.getTime();
        setDaysToWrapped(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        setHoursToWrapped(Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    }

    const generateWrapped = () => {
        window.open('/wrapped', '_blank', 'noopener,noreferrer');
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/")
    }

    const saveDisplayName = async () => {
        if (!userId || !displayName.trim()) return
        setSavingName(true)
        const { error } = await supabase.from('profiles')
            .update({ display_name: displayName.trim() })
            .eq('id', userId)
        if (error) {
            console.error('display_name update error:', error)
            toast.error(error.message)
        } else {
            toast.success("Display name updated.")
        }
        setSavingName(false)
    }

    const savePrivacySettings = async () => {
        if (!userId) return;
        setSavingPrivacy(true);
        const { error } = await supabase.from('profiles')
            .update({
                show_stats_publicly: statsVisibility,
                show_preferences_publicly: prefsVisibility
            })
            .eq('id', userId);

        if (error) {
            console.error('Privacy settings save error:', error)
            toast.error(error.message)
        } else {
            toast.success("Privacy configurations saved.")
        }
        setSavingPrivacy(false);
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-zinc-400" />
                    Settings
                </h1>
                <p className="text-muted-foreground">Manage your account and platform parameters.</p>
            </header>

            <div className="space-y-6">
                {/* Appearance Group */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                        <Moon className="w-4 h-4" /> Appearance
                    </h3>
                    <div className="rounded-2xl border bg-card/50 backdrop-blur-sm divide-y">
                        <div className="p-4 flex justify-between items-center transition-colors hover:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                    <Moon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Dark Mode</p>
                                    <p className="text-xs text-muted-foreground">Toggle the dark/light theme</p>
                                </div>
                            </div>
                            <Switch
                                checked={theme === "dark"}
                                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                            />
                        </div>
                        <div className="p-4 flex justify-between items-center transition-colors hover:bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Local Privacy Blur</p>
                                    <p className="text-xs text-muted-foreground">Blur sensitive data visually on this device</p>
                                </div>
                            </div>
                            <Switch
                                checked={privacyMode}
                                onCheckedChange={togglePrivacyMode}
                            />
                        </div>
                    </div>
                </div>

                {/* Platform Privacy Group */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Global Privacy
                    </h3>
                    <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-4 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-zinc-300">Stats Visibility</label>
                            <p className="text-[10px] text-zinc-500">Controls who can see your streak and XP.</p>
                            <div className="flex bg-zinc-900/50 p-1 rounded-xl w-fit border border-white/5">
                                {['private', 'friends', 'global'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setStatsVisibility(v)}
                                        className={cn(
                                            "px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                                            statsVisibility === v ? "bg-white/10 text-white" : "text-zinc-600 hover:text-white"
                                        )}
                                    >{v}</button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-zinc-300">Preferences Visibility</label>
                            <p className="text-[10px] text-zinc-500">Controls who can see your Top Tags and Top Performers.</p>
                            <div className="flex bg-zinc-900/50 p-1 rounded-xl w-fit border border-white/5">
                                {['private', 'friends', 'global'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setPrefsVisibility(v)}
                                        className={cn(
                                            "px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                                            prefsVisibility === v ? "bg-white/10 text-white" : "text-zinc-600 hover:text-white"
                                        )}
                                    >{v}</button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={savePrivacySettings}
                                disabled={savingPrivacy}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black text-xs uppercase rounded-xl transition-all shadow-lg flex items-center gap-2"
                            >
                                {savingPrivacy
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Save className="w-4 h-4" />
                                }
                                {savingPrivacy ? "Saving..." : "Save Privacy"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Account Group */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> Account
                    </h3>
                    <div className="rounded-2xl border bg-card/50 backdrop-blur-sm divide-y">

                        {/* Display Name */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Pencil className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Display Name</p>
                                    <p className="text-xs text-muted-foreground">Shown in rankings and on your profile</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                                    placeholder={userEmail.split('@')[0] || 'Enter display name...'}
                                    className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-black italic focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                                <button
                                    onClick={saveDisplayName}
                                    disabled={savingName}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl transition-all flex items-center gap-2 shrink-0"
                                >
                                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                            </div>
                            {userEmail && (
                                <p className="text-[10px] text-zinc-600 italic">Account email: {userEmail}</p>
                            )}
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="w-full p-4 flex justify-between items-center transition-colors hover:bg-red-500/10 text-red-500 group"
                        >
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-500 group-hover:bg-red-500/20">
                                    <LogOut className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Logout</p>
                                    <p className="text-xs opacity-70">Sign out of your session securely</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Grip Wrapped Group */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" /> Monthly Review
                    </h3>
                    <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20">
                            <Sparkles className="w-8 h-8 text-purple-500" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase italic tracking-tighter text-white">Grip Wrapped</h4>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black italic mt-1">AI-Powered 30-Day Retrospective</p>
                        </div>
                        
                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 w-full">
                            <p className="text-sm font-medium text-zinc-400">
                                Your next Grip Wrapped will be available in:
                            </p>
                            <div className="flex justify-center gap-4 mt-3">
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-black italic text-white">{daysToWrapped}</span>
                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Days</span>
                                </div>
                                <span className="text-2xl font-black italic text-zinc-700">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl font-black italic text-white">{hoursToWrapped}</span>
                                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Hours</span>
                                </div>
                            </div>
                        </div>

                        {/* Force dev generation */}
                        <button
                            onClick={generateWrapped}
                            className="text-[10px] text-purple-500 hover:text-purple-400 font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            Open Grip Wrapped <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="pt-8 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Grip Control v1.0.0-beta</p>
                    <p className="text-[10px] text-muted-foreground">Encrypted & Private</p>
                </div>
            </div>

        </div>
    )
}
