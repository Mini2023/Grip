"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Shield, Lock, Mail, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push("/")
            router.refresh()
        }
    }

    const handleSignUp = async () => {
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) {
            setError(error.message)
        } else {
            setError("Check your email for the confirmation link.")
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8 relative z-10"
            >
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20">
                        <Shield className="w-10 h-10 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">
                            GRIP <span className="text-blue-500">CONTROL</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Accessing Sovereign Protocol</p>
                    </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic ml-1">Vector Identifier (Email)</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-black italic text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="your-id@protocol.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic ml-1">Access Key (Password)</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-black italic text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-500 uppercase tracking-widest italic text-center">
                                {error}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 italic"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initiate Login"}
                        </button>
                    </form>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest text-zinc-600 bg-transparent px-2">OR</div>
                    </div>

                    <button
                        onClick={handleSignUp}
                        type="button"
                        className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black uppercase tracking-[0.3em] rounded-2xl border border-white/5 transition-all text-[10px] italic"
                    >
                        Register New Vector
                    </button>
                </div>

                <p className="text-center text-[8px] font-black uppercase tracking-[0.4em] text-zinc-700">
                    Encrypted Connection | Sovereign System v4.1.2
                </p>
            </motion.div>
        </div>
    )
}
