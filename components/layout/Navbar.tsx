"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Shield, Beaker, Bell, Search, BarChart3 } from "lucide-react"
import { useMode } from "@/components/providers/ModeProvider"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/providers/UserProvider"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent } from "@/components/ui/dialog"

const Navbar = () => {
    const { isDeepShieldActive, deepShieldUntil } = useMode()
    const { userXP, notifications, unreadCount, markAllRead } = useUser()
    const [searchOpen, setSearchOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [timeLeft, setTimeLeft] = useState("")

    React.useEffect(() => {
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

    return (
        <>
            <header className="h-16 border-b border-white/5 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-4">
                    {/* Branding */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 font-black text-lg italic text-blue-500 uppercase tracking-tighter hover:opacity-80 transition-opacity">
                            <Shield className={cn("w-5 h-5", isDeepShieldActive && "animate-pulse")} />
                            <span>Grip</span>
                        </Link>
                        {isDeepShieldActive && (
                            <div className="bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-[10px] font-black text-red-500 italic animate-pulse">
                                LOCK: {timeLeft}
                            </div>
                        )}
                    </div>

                    {/* Level Tag (Desktop) */}
                    <div className="hidden md:flex items-center">
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-500 uppercase tracking-widest italic">
                            Lvl {userXP.level}
                        </div>
                    </div>
                </div>

                {/* Global XP Bar (Desktop Center) */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1 w-64">
                    <div className="flex justify-between w-full text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">
                        <span>Performance Rating</span>
                        <span>{userXP.totalXP} XP</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${userXP.progressToNextLevel}%` }}
                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Search */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="p-2 hover:bg-white/5 rounded-xl transition-all text-zinc-400 hover:text-white"
                    >
                        <Search className="w-4 h-4 md:w-5 md:h-5" />
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setNotifOpen(!notifOpen)}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all text-zinc-400 hover:text-white relative"
                        >
                            <Bell className="w-4 h-4 md:w-5 md:h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-zinc-950" />
                            )}
                        </button>

                        <AnimatePresence>
                            {notifOpen && (
                                <>
                                    <div className="fixed inset-0 z-[-1]" onClick={() => setNotifOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-20 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50"
                                    >
                                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic text-zinc-400">Incoming Intel</h4>
                                            <button
                                                onClick={markAllRead}
                                                className="text-[8px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                                            {notifications.length > 0 ? (
                                                notifications.map(n => (
                                                    <div key={n.id} className={cn("p-4 transition-colors hover:bg-white/5 cursor-pointer", !n.read && "bg-blue-500/[0.02]")}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[10px] font-black text-white italic uppercase">{n.title}</span>
                                                            <span className="text-[8px] text-zinc-600">{n.time}</span>
                                                        </div>
                                                        <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-tight">{n.message}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-10 text-center opacity-30 italic">
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No active notifications</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Profile Avatar */}
                    <Link
                        href="/profile"
                        className="w-9 h-9 shrink-0 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-white/10 cursor-pointer hover:border-blue-500/50 transition-all flex items-center justify-center font-black text-[10px] text-white italic shadow-lg"
                    >
                        ME
                    </Link>
                </div>
            </header>

            {/* Global Search Dialog */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-white/10 bg-zinc-900 shadow-2xl rounded-[2rem] sm:rounded-[2.5rem] top-[15%] sm:top-[20%]">
                    <div className="relative p-6 border-b border-white/5">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            autoFocus
                            placeholder="SEARCH PROTOCOLS, USERS, SYSTEMS..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent pl-12 pr-4 py-2 outline-none text-white font-black italic uppercase tracking-tighter text-lg placeholder:text-zinc-700"
                        />
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <section>
                                <h5 className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] px-4 mb-3 italic">Active Modules</h5>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Lab (Dashboard)', icon: Beaker, href: '/' },
                                        { label: 'Shield Protocol', icon: Shield, href: '/shield' },
                                        { label: 'Analytics', icon: BarChart3, href: '/analytics' },
                                        { label: 'View Social Feed', icon: Bell, href: '/social' }
                                    ].map(item => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            onClick={() => setSearchOpen(false)}
                                            className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all group"
                                        >
                                            <item.icon className="w-4 h-4 text-zinc-500 group-hover:text-blue-500" />
                                            <span className="text-[10px] font-black text-zinc-400 uppercase italic tracking-tighter group-hover:text-white">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                    <div className="p-4 bg-zinc-950/50 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">
                        <span>ESC to clear</span>
                        <span>Grip Control v2.0</span>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default Navbar
