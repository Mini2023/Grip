"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type Mode = "lab" | "shield"

interface ModeContextType {
    mode: Mode
    toggleMode: () => void
    setMode: (mode: Mode) => void
    privacyMode: boolean
    togglePrivacyMode: () => void
    deepShieldUntil: number | null
    activateDeepShield: (minutes: number) => void
    isDeepShieldActive: boolean
    relapseModalOpen: boolean
    setRelapseModalOpen: (open: boolean) => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export function ModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<Mode>("lab")
    const [privacyMode, setPrivacyMode] = useState<boolean>(false)
    const [deepShieldUntil, setDeepShieldUntil] = useState<number | null>(null)
    const [relapseModalOpen, setRelapseModalOpen] = useState(false)

    const isDeepShieldActive = deepShieldUntil ? Date.now() < deepShieldUntil : false

    // Load from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem("grip-mode") as Mode
        if (savedMode) {
            setModeState(savedMode)
        }
        const savedPrivacy = localStorage.getItem("grip-privacy") === "true"
        setPrivacyMode(savedPrivacy)

        const savedDeepUntil = localStorage.getItem("grip-deep-until")
        if (savedDeepUntil) {
            const until = parseInt(savedDeepUntil)
            if (Date.now() < until) {
                setDeepShieldUntil(until)
            }
        }
    }, [])

    const setMode = (newMode: Mode) => {
        if (isDeepShieldActive) return
        setModeState(newMode)
        localStorage.setItem("grip-mode", newMode)
    }

    const toggleMode = () => {
        if (isDeepShieldActive) return
        const newMode = mode === "lab" ? "shield" : "lab"
        setMode(newMode)
    }

    const activateDeepShield = (minutes: number) => {
        const until = Date.now() + minutes * 60000
        setDeepShieldUntil(until)
        setModeState("shield")
        localStorage.setItem("grip-deep-until", String(until))
        localStorage.setItem("grip-mode", "shield")
    }

    const togglePrivacyMode = () => {
        const newVal = !privacyMode
        setPrivacyMode(newVal)
        localStorage.setItem("grip-privacy", String(newVal))
    }

    return (
        <ModeContext.Provider value={{
            mode,
            toggleMode,
            setMode,
            privacyMode,
            togglePrivacyMode,
            deepShieldUntil,
            activateDeepShield,
            isDeepShieldActive,
            relapseModalOpen,
            setRelapseModalOpen
        }}>
            {children}
        </ModeContext.Provider>
    )
}

export function useMode() {
    const context = useContext(ModeContext)
    if (context === undefined) {
        throw new Error("useMode must be used within a ModeProvider")
    }
    return context
}
