import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ModeProvider } from "@/components/providers/ModeProvider"
import Sidebar from "@/components/layout/Sidebar"
import Navbar from "@/components/layout/Navbar"
import BottomNav from "@/components/layout/BottomNav"
import { cn } from "@/lib/utils"
import { UserProvider } from "@/components/providers/UserProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Grip Control",
    description: "High-Performance Tracking & Recovery Dashboard",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Grip Control",
    },
}

export const viewport: Viewport = {
    themeColor: "#09090b",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
}

import { ThemeProvider } from "@/components/providers/ThemeProvider"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "sonner"

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cn(inter.className, "bg-background text-foreground antialiased selection:bg-primary/20 overflow-x-hidden")}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ModeProvider>
                        <UserProvider>
                            <TooltipProvider>
                                <Toaster position="top-right" theme="dark" />
                                <div className="flex h-[100dvh] overflow-hidden">
                                    {/* Sidebar (Desktop only) */}
                                    <Sidebar />

                                    <div className="flex-1 flex flex-col min-w-0 h-full relative">
                                        {/* Navbar (Stays on top) */}
                                        <Navbar />

                                        {/* Main Content Area */}
                                        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8 max-w-7xl mx-auto w-full">
                                            {children}
                                        </main>

                                        {/* Bottom Navigation (Mobile only) */}
                                        <BottomNav />
                                    </div>
                                </div>
                            </TooltipProvider>
                        </UserProvider>
                    </ModeProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
