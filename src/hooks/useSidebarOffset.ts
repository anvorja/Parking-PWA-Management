// src/hooks/useSidebarOffset.ts
// Devuelve la clase Tailwind de padding-left que compensa el sidebar en desktop.
// Úsalo en el div raíz de cada página para que el sidebar no tape el contenido.
import { useSidebar } from '../context/SidebarContext'

export function useSidebarOffset(): string {
    const { collapsed } = useSidebar()
    // collapsed → w-14 (56px)  → pl-14
    // expanded  → w-56 (224px) → pl-56
    return collapsed
        ? 'md:pl-14 md:transition-[padding] md:duration-300'
        : 'md:pl-56 md:transition-[padding] md:duration-300'
}
