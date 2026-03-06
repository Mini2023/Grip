"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Trophy, Settings, Users, BarChart3, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const BottomNav = () => {
    const pathname = usePathname()

    const navItems = [
        { name: "Dash", href: "/", icon: LayoutDashboard },
        { name: "Shield", href: "/shield", icon: Shield },
        { name: "Quests", href: "/quests", icon: Trophy },
        { name: "Stats", href: "/analytics", icon: BarChart3 },
        { name: "Social", href: "/social", icon: Users },
    ]

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-card/80 backdrop-blur-md flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] z-50">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors",
                        pathname === item.href
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <item.icon className="w-6 h-6" />
                    <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
            ))}
        </nav>
    )
}

export default BottomNav
