// src/hooks/useSidebarOffset.ts
// Devuelve la clase Tailwind de padding-left que compensa el sidebar en desktop.
// Úsalo en el div raíz de cada página para que el sidebar no tape el contenido.
import { useEffect, useState } from 'react'
import { useSidebar } from '../context/SidebarContext'

export function useSidebarOffset(): string {
    const { collapsed } = useSidebar()
    // collapsed → w-14 (56px)  → pl-14
    // expanded  → w-56 (224px) → pl-56
    return collapsed
        ? 'md:pl-14 md:transition-[padding] md:duration-300'
        : 'md:pl-56 md:transition-[padding] md:duration-300'
}

/**
 * Devuelve el valor en px del borde izquierdo del sidebar para usarlo en
 * elementos con `position: fixed` donde las clases Tailwind no pueden aplicarse
 * (los inline styles siempre ganan en especificidad sobre las clases CSS).
 *
 * Uso: `style={{ left: sidebarLeft }}`
 */
export function useSidebarLeft(): string {
    const { collapsed } = useSidebar()
    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
    )

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)')
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    if (!isDesktop) return '0px'
    return collapsed ? '56px' : '224px'
}
