// src/providers/SalidaProvider.tsx
// HU-009: buscar ingreso por id (QR)
// HU-010: buscar ingreso por placa (manual)
// HU-011: confirmar salida + costo calculado en backend
// FASE 3 offline: si no hay red al confirmar, encola en outbox con timestamp local

import React, { useState, useCallback, useEffect, ReactNode } from 'react'
import { SalidaContext, ToastSalidaState, ModoBusqueda } from '../contexts/SalidaContext'
import { salidaService, IngresoDetalle, SalidaResponse } from '../services/salidaService'
import { outboxService } from '../services/outboxService'
import { useApp } from '../hooks/useApp'

export const SalidaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isOnline } = useApp()

    const [modoBusqueda, setModoBusqueda]         = useState<ModoBusqueda>('qr')
    const [ingresoEncontrado, setIngresoEncontrado] = useState<IngresoDetalle | null>(null)
    const [salidaConfirmada, setSalidaConfirmada]   = useState<SalidaResponse | null>(null)
    const [isBuscando, setIsBuscando]               = useState(false)
    const [isConfirmando, setIsConfirmando]         = useState(false)
    const [toast, setToast]                         = useState<ToastSalidaState | null>(null)

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 4000)
        return () => clearTimeout(t)
    }, [toast])

    const clearToast = useCallback(() => setToast(null), [])

    // ── Resetear estado ───────────────────────────────────────────────────────

    const resetear = useCallback(() => {
        setIngresoEncontrado(null)
        setSalidaConfirmada(null)
    }, [])

    // ── HU-009: buscar por id (leído del QR) ─────────────────────────────────

    const buscarPorId = useCallback(async (id: number) => {
        if (!isOnline) {
            setToast({ message: 'Sin conexión — la búsqueda por QR requiere conexión', type: 'error' })
            return
        }
        setIsBuscando(true)
        setSalidaConfirmada(null)
        try {
            const ingreso = await salidaService.obtenerPorId(id)
            if (ingreso.estadoIngreso.toUpperCase() !== 'INGRESADO') {
                setToast({ message: `El vehículo ${ingreso.placa} ya registró su salida`, type: 'error' })
                return
            }
            setIngresoEncontrado(ingreso)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'No se encontró el ingreso'
            setToast({ message: msg, type: 'error' })
            setIngresoEncontrado(null)
        } finally {
            setIsBuscando(false)
        }
    }, [isOnline])

    // ── HU-010: buscar por placa (salida manual) ──────────────────────────────

    const buscarPorPlaca = useCallback(async (placa: string) => {
        if (!isOnline) {
            setToast({ message: 'Sin conexión — la búsqueda requiere conexión', type: 'error' })
            return
        }
        if (!placa.trim()) {
            setToast({ message: 'Ingresa la placa del vehículo', type: 'error' })
            return
        }
        setIsBuscando(true)
        setSalidaConfirmada(null)
        try {
            const ingreso = await salidaService.buscarActivoPorPlaca(placa)
            setIngresoEncontrado(ingreso)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'No se encontró un ingreso activo para esa placa'
            setToast({ message: msg, type: 'error' })
            setIngresoEncontrado(null)
        } finally {
            setIsBuscando(false)
        }
    }, [isOnline])

    // ── HU-011: confirmar salida ───────────────────────────────────────────────

    const confirmarSalida = useCallback(async () => {
        if (!ingresoEncontrado) return

        setIsConfirmando(true)
        const fechaHoraSalida = new Date().toISOString()

        try {
            if (isOnline) {
                // Online: confirmar directamente en el backend
                const resultado = await salidaService.confirmarSalida(
                    ingresoEncontrado.idIngreso,
                    { fechaHoraSalida }
                )
                setSalidaConfirmada(resultado)
                setIngresoEncontrado(null)
                setToast({ message: `Salida registrada — Cobro: $${resultado.valorCobrado.toLocaleString('es-CO')}`, type: 'success' })
            } else {
                // Offline: encolar en outbox con el timestamp local
                await outboxService.enqueue('SALIDA', {
                    idIngreso:       ingresoEncontrado.idIngreso,
                    fechaHoraSalida,
                })
                setIngresoEncontrado(null)
                setToast({
                    message: 'Sin conexión — la salida se sincronizará automáticamente al recuperar la red',
                    type: 'success',
                })
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al registrar la salida'
            setToast({ message: msg, type: 'error' })
        } finally {
            setIsConfirmando(false)
        }
    }, [ingresoEncontrado, isOnline])

    return (
        <SalidaContext.Provider value={{
            modoBusqueda,
            setModoBusqueda,
            ingresoEncontrado,
            salidaConfirmada,
            isBuscando,
            isConfirmando,
            buscarPorId,
            buscarPorPlaca,
            confirmarSalida,
            resetear,
            toast,
            clearToast,
        }}>
            {children}
        </SalidaContext.Provider>
    )
}