"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, X, Loader2, Network } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

// Dynamic import: react-force-graph-2d only works client-side (canvas)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Types                                                                 */
/* ═══════════════════════════════════════════════════════════════════════ */
interface GraphNode {
    id: string
    label: string
    type: "tag" | "artist" | "media"
    count: number
    connections: number
    x?: number; y?: number
}

interface GraphLink {
    source: string | GraphNode
    target: string | GraphNode
    weight: number
}

interface NodeDetail {
    topConnections: { id: string; label: string; weight: number }[]
}

interface ConstellationData {
    nodes: GraphNode[]
    links: GraphLink[]
    details: Record<string, NodeDetail>
    meta: { total_sessions: number; total_nodes: number; total_links: number }
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Color config                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */
const NODE_COLORS: Record<string, { fill: string; glow: string; label: string }> = {
    tag: { fill: "#10b981", glow: "rgba(16,185,129,0.6)", label: "Tag" },
    artist: { fill: "#3b82f6", glow: "rgba(59,130,246,0.6)", label: "Artist" },
    media: { fill: "#e4e4e7", glow: "rgba(228,228,231,0.4)", label: "Media Type" },
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  Page                                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function ConstellationMapPage() {
    const router = useRouter()
    const fgRef = useRef<any>(null)
    const [data, setData] = useState<ConstellationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
    const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set())
    const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
    const isMobile = dimensions.width < 768

    /* ── Window dimensions ───────────────────────────────────────────── */
    useEffect(() => {
        const update = () => setDimensions({ width: window.innerWidth, height: window.innerHeight })
        update()
        window.addEventListener("resize", update)
        return () => window.removeEventListener("resize", update)
    }, [])

    /* ── Fetch data ──────────────────────────────────────────────────── */
    useEffect(() => {
        const go = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { setError("Not authenticated."); setLoading(false); return }
                const res = await fetch("/api/constellation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id }),
                })
                const json = await res.json()
                if (json.error) throw new Error(json.detail || json.error)
                setData(json)
            } catch (e: any) {
                console.error(e)
                setError(e.message || "Failed to load constellation data")
            } finally {
                setLoading(false)
            }
        }
        go()
    }, [])

    /* ── Node click: highlight + focus + panel ───────────────────────── */
    const handleNodeClick = useCallback((node: any) => {
        // Find connected nodes
        if (!data) return
        const nodeId = node.id as string
        const connectedIds = new Set<string>([nodeId])
        const connectedLinkKeys = new Set<string>()

        for (const link of data.links) {
            const srcId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id
            const tgtId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id
            if (srcId === nodeId || tgtId === nodeId) {
                connectedIds.add(srcId)
                connectedIds.add(tgtId)
                connectedLinkKeys.add(`${srcId}|${tgtId}`)
            }
        }

        setHighlightNodes(connectedIds)
        setHighlightLinks(connectedLinkKeys)
        setSelectedNode(node as GraphNode)

        // Camera focus
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 800)
            fgRef.current.zoom(3, 800)
        }
    }, [data])

    /* ── Background click: deselect ──────────────────────────────────── */
    const handleBackgroundClick = useCallback(() => {
        setSelectedNode(null)
        setHighlightNodes(new Set())
        setHighlightLinks(new Set())
        if (fgRef.current) {
            fgRef.current.centerAt(0, 0, 800)
            fgRef.current.zoom(1, 800)
        }
    }, [])

    /* ── Node hover (cursor only — no connection highlighting) ────────── */
    const handleNodeHover = useCallback((node: any) => {
        if (typeof document !== "undefined") {
            document.body.style.cursor = node ? "pointer" : "default"
        }
    }, [])

    /* ── Custom canvas rendering ─────────────────────────────────────── */
    const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const nodeData = node as GraphNode
        const colors = NODE_COLORS[nodeData.type] || NODE_COLORS.tag
        const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(nodeData.id)
        const baseSize = Math.max(3, Math.min(12, Math.sqrt(nodeData.count) * 2.5))

        ctx.save()

        // Glow
        if (isHighlighted) {
            ctx.beginPath()
            ctx.arc(node.x!, node.y!, baseSize + 4, 0, 2 * Math.PI)
            ctx.fillStyle = colors.glow
            ctx.globalAlpha = 0.3
            ctx.fill()
            ctx.globalAlpha = 1
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(node.x!, node.y!, baseSize, 0, 2 * Math.PI)
        ctx.fillStyle = isHighlighted ? colors.fill : 'rgba(63,63,70,0.4)'
        ctx.fill()

        // Ring
        ctx.strokeStyle = isHighlighted ? colors.fill : 'rgba(63,63,70,0.2)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Label (only when zoomed in enough or highlighted)
        if (globalScale > 1.5 || (isHighlighted && highlightNodes.size > 0)) {
            ctx.font = `${Math.max(8, 11 / globalScale)}px "Inter", system-ui, sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "top"
            ctx.fillStyle = isHighlighted ? "#e4e4e7" : "rgba(161,161,170,0.3)"
            ctx.fillText(nodeData.label, node.x!, node.y! + baseSize + 3)
        }

        ctx.restore()
    }, [highlightNodes])

    const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
        const src = link.source as GraphNode
        const tgt = link.target as GraphNode
        if (!src.x || !src.y || !tgt.x || !tgt.y) return

        const linkKey = `${src.id}|${tgt.id}`
        const linkKeyRev = `${tgt.id}|${src.id}`
        const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(linkKey) || highlightLinks.has(linkKeyRev)
        const weight = (link as GraphLink).weight || 1

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(src.x, src.y)
        ctx.lineTo(tgt.x, tgt.y)

        if (isHighlighted) {
            // Glowing line
            ctx.strokeStyle = `rgba(16, 185, 129, ${Math.min(0.6, 0.1 + weight * 0.05)})`
            ctx.lineWidth = Math.min(3, 0.5 + weight * 0.3)
            ctx.shadowColor = "rgba(16, 185, 129, 0.4)"
            ctx.shadowBlur = 6
        } else {
            ctx.strokeStyle = "rgba(63, 63, 70, 0.08)"
            ctx.lineWidth = 0.3
        }

        ctx.stroke()
        ctx.restore()
    }, [highlightLinks])

    /* ── Render states ───────────────────────────────────────────────── */
    if (error) {
        return (
            <div className="fixed inset-0 bg-[#060608] flex flex-col items-center justify-center p-6 text-center z-[9999]">
                <p className="text-red-500 font-black italic uppercase tracking-widest text-lg mb-4">Error</p>
                <p className="text-zinc-500 max-w-md">{error}</p>
                <button onClick={() => router.back()}
                    className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-black uppercase tracking-widest text-xs">
                    Go Back
                </button>
            </div>
        )
    }

    if (loading || !data) {
        return (
            <div className="fixed inset-0 bg-[#060608] flex flex-col items-center justify-center p-6 space-y-6 z-[9999]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                    <Network className="w-12 h-12 text-emerald-500" />
                </motion.div>
                <p className="text-emerald-400 font-black italic uppercase tracking-[0.2em] text-sm">
                    Mapping Neural Constellation...
                </p>
                <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-emerald-500 rounded-full"
                        animate={{ width: ["0%", "60%", "85%"] }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                    />
                </div>
            </div>
        )
    }

    const detail = selectedNode ? data.details[selectedNode.id] : null
    const selectedColors = selectedNode ? NODE_COLORS[selectedNode.type] : null

    return (
        <div className="fixed inset-0 bg-[#060608] z-[9999] overflow-hidden">
            {/* ── Header bar ─────────────────────────────────────────── */}
            <div className={`absolute top-0 left-0 right-0 z-50 flex items-center justify-between ${isMobile ? 'px-3 py-3' : 'px-5 py-4'}`}>
                <div className="flex items-center gap-2">
                    <Network className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-emerald-500`} />
                    <h1 className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-black uppercase tracking-[0.3em] text-zinc-400 italic`}>
                        {isMobile ? 'Constellation' : 'Neural Constellation'}
                    </h1>
                    {!isMobile && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-700 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                            {data.meta.total_nodes} Nodes · {data.meta.total_links} Links
                        </span>
                    )}
                </div>
                <button onClick={() => router.back()}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 group">
                    <X className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                </button>
            </div>

            {/* ── Legend ──────────────────────────────────────────────── */}
            <div className={`absolute z-50 flex items-center bg-black/60 backdrop-blur-md border border-white/5 rounded-2xl ${isMobile ? 'bottom-3 left-3 right-3 justify-center gap-3 px-3 py-2' : 'bottom-6 left-6 gap-4 px-4 py-2.5'}`}>
                {Object.entries(NODE_COLORS).map(([type, colors]) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <div className={`${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full`} style={{ backgroundColor: colors.fill }} />
                        <span className={`${isMobile ? 'text-[7px]' : 'text-[9px]'} font-black uppercase tracking-widest text-zinc-500`}>{colors.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Graph canvas ────────────────────────────────────────── */}
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={{
                    nodes: data.nodes as any[],
                    links: data.links as any[],
                }}
                backgroundColor="#060608"
                nodeCanvasObject={paintNode}
                linkCanvasObject={paintLink}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                onBackgroundClick={handleBackgroundClick}
                nodeRelSize={6}
                linkDirectionalParticles={0}
                d3AlphaDecay={0.08}
                d3VelocityDecay={0.5}
                warmupTicks={150}
                cooldownTicks={80}
                cooldownTime={3000}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
            />

            {/* ── Detail Panel (responsive: side panel desktop, bottom sheet mobile) ── */}
            <AnimatePresence>
                {selectedNode && detail && (
                    <motion.div
                        initial={isMobile ? { y: 400, opacity: 0 } : { x: 400, opacity: 0 }}
                        animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                        exit={isMobile ? { y: 400, opacity: 0 } : { x: 400, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className={isMobile
                            ? 'absolute left-2 right-2 bottom-12 z-50 max-h-[55vh]'
                            : 'absolute top-16 right-4 bottom-16 w-80 z-50'
                        }
                    >
                        <div className={`h-full bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col gap-4 overflow-y-auto no-scrollbar shadow-2xl shadow-black/50 ${isMobile ? 'p-4' : 'p-6 gap-6'}`}>
                            {/* Close */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleBackgroundClick() }}
                                className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-zinc-500" />
                            </button>

                            {/* Node identity */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColors?.fill }} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] italic"
                                        style={{ color: selectedColors?.fill }}>
                                        {selectedColors?.label}
                                    </span>
                                </div>
                                <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-black italic uppercase tracking-tighter text-white capitalize`}>
                                    {selectedNode.label}
                                </h2>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`${isMobile ? 'p-3' : 'p-4'} bg-white/[0.03] border border-white/5 rounded-2xl text-center`}>
                                    <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-black italic text-white`}>{selectedNode.count}</p>
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-1">Total Logs</p>
                                </div>
                                <div className={`${isMobile ? 'p-3' : 'p-4'} bg-white/[0.03] border border-white/5 rounded-2xl text-center`}>
                                    <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-black italic text-white`}>{selectedNode.connections}</p>
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 mt-1">Connections</p>
                                </div>
                            </div>

                            {/* Top Connections */}
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">
                                    Strongest Connections
                                </h3>
                                {detail.topConnections.length === 0 && (
                                    <p className="text-xs text-zinc-700 italic">No connections found.</p>
                                )}
                                {detail.topConnections.map((conn, i) => {
                                    const connType = conn.id.split(':')[0] as string
                                    const connColors = NODE_COLORS[connType] || NODE_COLORS.tag
                                    return (
                                        <div key={conn.id}
                                            className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer active:bg-white/[0.06]"
                                            onClick={() => {
                                                const node = data.nodes.find(n => n.id === conn.id)
                                                if (node) handleNodeClick(node)
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: connColors.fill }} />
                                                <span className="text-sm font-bold text-zinc-300 capitalize">{conn.label}</span>
                                            </div>
                                            <span className="text-xs font-black italic" style={{ color: connColors.fill }}>
                                                {conn.weight}×
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Node ID debug info */}
                            {!isMobile && (
                                <div className="mt-auto pt-4 border-t border-white/5">
                                    <p className="text-[8px] font-mono text-zinc-800 break-all">
                                        {selectedNode.id}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
