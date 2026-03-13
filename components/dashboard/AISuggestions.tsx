
"use client"

import React, { useState } from 'react';
import { useUser } from '@/components/providers/UserProvider';
import { BrainCircuit, Loader2, Sparkles, User, Tag, Play, ExternalLink, Search, Image as ImageIcon, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Suggestion {
    recommended_videos: { title: string; reason: string; search_query: string }[];
    recommended_actors: { name: string; category: string; search_query: string }[];
    recommended_tags: { display_name: string; pornhub_query: string; rule34_query: string }[];
}

const AISuggestions = () => {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion | null>(null);

    const getSearchUrl = (query: string) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    
    const getRule34Url = (query: string) => {
        // Safe Booru-formatting for Rule34: replace spaces with + for the URL query
        const formatted = query.trim().replace(/\s+/g, '+').toLowerCase();
        return `https://rule34.xxx/index.php?page=post&s=list&tags=${formatted}`;
    };

    const getPornhubUrl = (query: string) => `https://www.pornhub.com/video/search?search=${encodeURIComponent(query)}`;

    const fetchSuggestions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            if (!res.ok) throw new Error('Failed to fetch suggestions');

            const data = await res.json();
            setSuggestions(data);
            toast.success('Intelligence analysis complete.');
        } catch (error) {
            console.error(error);
            toast.error('AI integration unavailable. Check configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-5 sm:p-6 md:p-8 rounded-[2rem] sm:rounded-[2.5rem] border bg-card/40 backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h2 className="font-black flex items-center gap-2 text-zinc-100 italic text-sm uppercase tracking-widest">
                    <BrainCircuit className="w-5 h-5 text-purple-500" />
                    AI Intelligence Overlay
                </h2>
                {!suggestions && !loading && (
                    <button
                        onClick={fetchSuggestions}
                        className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Analyze Profile
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-12 flex flex-col items-center justify-center gap-4"
                    >
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Running Neural Pattern Analysis...</p>
                    </motion.div>
                ) : suggestions ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {/* Videos */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2 italic">
                                <Play className="w-3 h-3" /> Recommended Vectors
                            </h3>
                            <div className="space-y-3">
                                {suggestions.recommended_videos.map((v, i) => (
                                    <a
                                        key={i}
                                        href={getSearchUrl(v.search_query)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 group transition-all hover:scale-[1.02] hover:bg-white/[0.05] hover:border-purple-500/30 hover:ring-1 hover:ring-purple-500/20 cursor-pointer relative overflow-hidden h-full"
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <p className="text-xs font-black text-white italic truncate uppercase flex-1">{v.title}</p>
                                            <ExternalLink className="w-3 h-3 text-zinc-800 group-hover:text-purple-500 transition-colors shrink-0 mt-1" />
                                        </div>
                                        <p className="text-[9px] text-zinc-500 leading-relaxed uppercase tracking-tight line-clamp-2 mb-4">{v.reason}</p>
                                        
                                        <div className="flex flex-col sm:flex-row gap-2 pt-3 mt-auto border-t border-white/5">
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(getRule34Url(v.search_query), '_blank'); }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all group/btn shadow-lg"
                                            >
                                                <ImageIcon className="w-2.5 h-2.5 text-zinc-600 group-hover/btn:text-emerald-500 transition-colors" />
                                                <span className="text-zinc-600 group-hover/btn:text-emerald-500 transition-colors">Rule34</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(getPornhubUrl(v.search_query), '_blank'); }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/[0.03] hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/30 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all group/btn shadow-lg"
                                            >
                                                <Video className="w-2.5 h-2.5 text-zinc-600 group-hover/btn:text-orange-500 transition-colors" />
                                                <span className="text-zinc-600 group-hover/btn:text-orange-500 transition-colors">Pornhub</span>
                                            </button>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Actors */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 italic">
                                <User className="w-3 h-3" /> Personnel Radar
                            </h3>
                            <div className="space-y-3">
                                {suggestions.recommended_actors.map((a, i) => (
                                    <a
                                        key={i}
                                        href={getSearchUrl(a.search_query)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 group transition-all hover:scale-[1.02] hover:bg-white/[0.05] hover:border-blue-500/30 hover:ring-1 hover:ring-blue-500/20 cursor-pointer h-full"
                                    >
                                        <div className="flex items-center justify-between gap-2 w-full mb-3">
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[10px] font-black text-white uppercase italic flex items-center gap-2 truncate">
                                                    {a.name}
                                                    <Search className="w-2.5 h-2.5 text-zinc-700 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                                </span>
                                                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-tighter truncate">{a.category}</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-zinc-800 group-hover:text-blue-500 transition-colors" />
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-2 pt-3 mt-auto border-t border-white/5">
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(getRule34Url(a.search_query), '_blank'); }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all group/btn shadow-lg"
                                            >
                                                <ImageIcon className="w-2.5 h-2.5 text-zinc-600 group-hover/btn:text-emerald-500 transition-colors" />
                                                <span className="text-zinc-600 group-hover/btn:text-emerald-500 transition-colors">Rule34</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(getPornhubUrl(a.search_query), '_blank'); }}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/[0.03] hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/30 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all group/btn shadow-lg"
                                            >
                                                <Video className="w-2.5 h-2.5 text-zinc-600 group-hover/btn:text-orange-500 transition-colors" />
                                                <span className="text-zinc-600 group-hover/btn:text-orange-500 transition-colors">Pornhub</span>
                                            </button>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 italic">
                                <Tag className="w-3 h-3" /> Pattern Tags
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {suggestions.recommended_tags.map((t, i) => (
                                    <div key={i} className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4 group/tag transition-all hover:bg-white/[0.05] hover:border-emerald-500/30">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-[10px] font-black text-white hover:text-emerald-500 uppercase italic tracking-widest transition-colors">
                                                #{t.display_name}
                                            </span>
                                            <Tag className="w-3 h-3 text-zinc-800 group-hover/tag:text-emerald-500 transition-colors" />
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <button
                                                onClick={() => window.open(`https://rule34.xxx/index.php?page=post&s=list&tags=${t.rule34_query.replace(/ /g, '+')}`, '_blank')}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-xl text-[7px] font-black uppercase tracking-tighter transition-all group/btn  shadow-lg shadow-black/20"
                                            >
                                                <ImageIcon className="w-2.5 h-2.5 text-zinc-600 group-hover/btn:text-emerald-500 transition-colors" />
                                                <span className="text-zinc-600 group-hover/btn:text-emerald-500 transition-colors">Rule34</span>
                                            </button>
                                            <button
                                                onClick={() => window.open(`https://www.pornhub.com/video/search?search=${encodeURIComponent(t.pornhub_query)}`, '_blank')}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-white/[0.03] hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/30 rounded-xl text-[7px] font-black uppercase tracking-tighter transition-all group/btn shadow-lg shadow-black/20"
                                            >
                                                <Video className="w-2.5 h-2.5 text-zinc-600 group-hover/btn:text-orange-500 transition-colors" />
                                                <span className="text-zinc-600 group-hover/btn:text-orange-500 transition-colors">Pornhub</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-white/5 flex justify-center">
                            <button
                                onClick={fetchSuggestions}
                                className="flex items-center gap-2 text-[8px] font-black text-zinc-600 hover:text-purple-400 uppercase tracking-widest transition-colors"
                            >
                                <Sparkles className="w-3 h-3" /> Recalibrate Intelligence
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest italic">
                            No active intelligence data. Click &quot;Analyze Profile&quot; to begin.
                        </p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AISuggestions;
