// src/context/SidebarContext.tsx
// Estado global del sidebar desktop: expandido (224px) o colapsado (56px icon-only)
import React, { createContext, useCallback, useContext, useState } from 'react'

interface SidebarContextType {
    collapsed: boolean
    toggle: () => void
}

const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    toggle: () => {},
})

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(
        () => localStorage.getItem('sidebar-collapsed') === 'true'
    )

    const toggle = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev
            localStorage.setItem('sidebar-collapsed', String(next))
            return next
        })
    }, [])

    return (
        <SidebarContext.Provider value={{ collapsed, toggle }}>
            {children}
        </SidebarContext.Provider>
    )
}

export const useSidebar = () => useContext(SidebarContext)
