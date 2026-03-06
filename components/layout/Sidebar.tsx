"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Trophy, Settings, Shield, Beaker, Users, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMode } from "@/components/providers/ModeProvider"

const Sidebar = () => {
    const pathname = usePathname()
    const { mode } = useMode()

    const navItems = [
        { name: "Lab", href: "/", icon: LayoutDashboard },
        { name: "Shield", href: "/shield", icon: Shield },
        { name: "Quests", href: "/quests", icon: Trophy },
        { name: "Analytics", href: "/analytics", icon: BarChart3 },
        { name: "Social", href: "/social", icon: Users },
        { name: "Settings", href: "/settings", icon: Settings },
    ]

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r bg-card text-card-foreground">
            <div className="p-6 flex items-center gap-2 font-bold text-xl tracking-tight">
                {mode === "shield" ? (
                    <Shield className="w-6 h-6 text-blue-500" />
                ) : (
                    <Beaker className="w-6 h-6 text-emerald-500" />
                )}
                <span>Grip Control</span>
            </div>
            <nav className="flex-1 px-4 space-y-2 py-4">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                            pathname === item.href
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>
            <div className="p-4 border-t text-xs text-muted-foreground text-center">
                v1.0.0
            </div>
        </aside>
    )
}

export default Sidebar
