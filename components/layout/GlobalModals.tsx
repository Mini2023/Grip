
"use client"

import React, { useState } from "react"
import { useMode } from "@/components/providers/ModeProvider"
import { useUser } from "@/components/providers/UserProvider"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { HeartCrack, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export const GlobalModals = () => {
    const { relapseModalOpen, setRelapseModalOpen } = useMode()
    const { user, refreshUserStats } = useUser()
    const [score, setScore] = useState(8)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleReportRelapse = async (score: number) => {
        if (!user) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('sessions').insert({
                user_id: user.id,
                title: 'Relapse Logged',
                url: 'Manual Report',
                duration_minutes: '0',
                regret_score: score,
                categories: ['Relapse'],
                content_type: 'Real Life',
                thumbnail_url: '',
                performer: 'Self',
            });

            if (error) throw error;

            toast.error("Streak reset. System recalibrating.");
            setRelapseModalOpen(false);
            await refreshUserStats();
            router.refresh();
        } catch (err: any) {
            toast.error("Failed to log relapse.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={relapseModalOpen} onOpenChange={setRelapseModalOpen}>
            <DialogContent className="max-w-md bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                <DialogHeader className="space-y-3">
                    <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <HeartCrack className="w-8 h-8 text-red-500" />
                    </div>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-center text-white">System Breach Detected</DialogTitle>
                </DialogHeader>
                <div className="space-y-8 py-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-black text-center tracking-widest leading-relaxed">
                        Honesty is the first step back to control. <br /> Identify the impact magnitude of this event.
                    </p>

                    <div className="space-y-4">
                        <div className="flex justify-between font-black text-[10px] text-zinc-400">
                            <span>REGRET INDEX</span>
                            <span className="text-red-500 italic font-black">{score}.0</span>
                        </div>
                        <input
                            type="range" min="1" max="10" step="1" value={score}
                            onChange={e => setScore(Number(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none accent-red-500 cursor-pointer"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            disabled={loading}
                            onClick={() => handleReportRelapse(score)}
                            className="w-full py-4 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-500 font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-900/30 text-[10px] italic flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><AlertCircle className="w-4 h-4" /> Confirm Relapse & Reset Streak</>}
                        </button>
                        <DialogClose asChild>
                            <button className="w-full py-3 text-[10px] font-black uppercase text-zinc-600 hover:text-white transition-colors">Abort Report</button>
                        </DialogClose>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
