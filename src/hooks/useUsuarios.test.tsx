// src/hooks/useUsuarios.test.tsx

import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useUsuarios } from './useUsuarios'

function ComponenteSinProvider() {
    useUsuarios()
    return null
}

describe('useUsuarios', () => {
    it('lanza error cuando se usa fuera de un UsuarioProvider', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => render(<ComponenteSinProvider />)).toThrow(
            'useUsuarios debe ser usado dentro de un UsuarioProvider'
        )

        consoleSpy.mockRestore()
    })
})
