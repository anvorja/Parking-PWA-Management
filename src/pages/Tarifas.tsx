// src/pages/Tarifas.tsx
// HU-013 — Gestión de Tarifas (solo ADMINISTRADOR)
// Vista de tarjetas: una por tipo de vehículo con la tarifa activa por hora.
// Permite editar el valor directamente desde la tarjeta.

import React, { useEffect, useState } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import { useTarifas } from '../hooks/useTarifas'
import { useAuth } from '../hooks/useAuth'
import { useApp } from '../hooks/useApp'
import { TarifaResponse } from '../services/tarifaService'
import BottomNav from '../components/BottomNav'
import { useSidebarOffset } from '../hooks/useSidebarOffset'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(valor)
}

function iconoTipo(nombre: string): string {
    return nombre.toUpperCase() === 'MOTO' ? 'two_wheeler' : 'directions_car'
}

function colorTipo(nombre: string): { bg: string; accent: string; border: string } {
    return nombre.toUpperCase() === 'MOTO'
        ? { bg: '#f0fdf4', accent: 'var(--color-success-text)', border: 'var(--color-success-border)' }
        : { bg: '#eff6ff', accent: '#2563eb', border: '#bfdbfe' }
}

// ─── Modal de creación ────────────────────────────────────────────────────────

interface CrearModalProps {
    open: boolean
    opcionesPermitidas: { id: number; nombre: string }[]
    isSaving: boolean
    onGuardar: (idTipoVehiculo: number, valor: number) => Promise<void>
    onCancelar: () => void
}

function CrearModal({ open, opcionesPermitidas, isSaving, onGuardar, onCancelar }: CrearModalProps) {
    const [idTipo, setIdTipo] = useState(opcionesPermitidas[0]?.id || 1)
    const [valor, setValor]   = useState('')
    const [error, setError]   = useState('')

    useEffect(() => {
        if (open) { setIdTipo(opcionesPermitidas[0]?.id || 1); setValor(''); setError('') }
    }, [open])

    const handleGuardar = async () => {
        setError('')
        const num = Number(valor.replace(/\./g, '').replace(',', '.'))
        if (isNaN(num) || num <= 0) { setError('Ingresa un valor válido mayor a cero'); return }
        try { await onGuardar(idTipo, num) } catch { /* toast gestionado en provider */ }
    }

    return (
        <Dialog open={open} onOpenChange={val => { if (!val && !isSaving) onCancelar() }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-[17px]">Nueva tarifa</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3.5">
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                            Tipo de Vehículo
                        </label>
                        <Select value={String(idTipo)} onValueChange={val => setIdTipo(Number(val))}>
                            <SelectTrigger className="w-full h-[46px] rounded-[10px] border-[1.5px] border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] text-[14px] text-[color:var(--color-text-primary)]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {opcionesPermitidas.map(op => (
                                    <SelectItem key={op.id} value={String(op.id)}>{op.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                            Valor (COP / Hora)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-muted)' }}>$</span>
                            <input
                                type="number" value={valor} onChange={e => setValor(e.target.value)}
                                min="1" step="500" placeholder="Ej: 3000"
                                style={{ width: '100%', padding: '12px 12px 12px 28px', borderRadius: '10px', border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`, background: 'var(--color-surface-alt)', fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
                                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                                onBlur={e => { e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)' }}
                            />
                        </div>
                        {error && <p style={{ fontSize: '12px', color: 'var(--color-danger)', margin: '6px 0 0' }}>{error}</p>}
                    </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                    <button onClick={onCancelar} disabled={isSaving} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={isSaving} style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isSaving ? '#93c5fd' : 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isSaving
                            ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Guardando...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>Guardar</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Modal de edición ─────────────────────────────────────────────────────────

interface EditModalProps {
    tarifa: TarifaResponse
    isSaving: boolean
    onGuardar: (valor: number) => Promise<void>
    onCancelar: () => void
}

function EditModal({ tarifa, isSaving, onGuardar, onCancelar }: EditModalProps) {
    const [valor, setValor] = useState(String(tarifa.valor))
    const [error, setError] = useState('')

    const handleGuardar = async () => {
        setError('')
        const num = Number(valor.replace(/\./g, '').replace(',', '.'))
        if (isNaN(num) || num <= 0) { setError('Ingresa un valor válido mayor a cero'); return }
        try { await onGuardar(num) } catch { /* toast ya gestionado en provider */ }
    }

    return (
        <Dialog open onOpenChange={val => { if (!val && !isSaving) onCancelar() }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-[17px]">Editar tarifa — {tarifa.tipoVehiculo}</DialogTitle>
                    <DialogDescription>Valor actual: {formatCOP(tarifa.valor)} / {tarifa.unidadTarifa.toLowerCase()}</DialogDescription>
                </DialogHeader>

                <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                        Nuevo valor (COP / hora)
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-muted)' }}>$</span>
                        <input
                            type="number" value={valor} onChange={e => setValor(e.target.value)} min="1" step="500"
                            style={{ width: '100%', padding: '12px 12px 12px 28px', borderRadius: '10px', border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`, background: 'var(--color-surface-alt)', fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                            onBlur={e => { e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)' }}
                        />
                    </div>
                    {error && <p style={{ fontSize: '12px', color: 'var(--color-danger)', margin: '6px 0 0' }}>{error}</p>}
                </div>

                <div className="flex gap-2.5 pt-1">
                    <button onClick={onCancelar} disabled={isSaving} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={isSaving} style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isSaving ? '#93c5fd' : 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isSaving
                            ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Guardando...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>Guardar</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps { message: string; type: 'success' | 'error'; onClose: () => void }
function Toast({ message, type, onClose }: ToastProps) {
    return (
        <div
            className="fixed top-4 left-4 right-4 md:left-auto md:right-5 md:min-w-[280px] md:max-w-[380px] z-[100] flex items-center gap-2.5"
            style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '14px 16px', border: type === 'success' ? '1px solid var(--color-success-border)' : '1px solid var(--color-danger-border-light)', animation: 'slideDown 0.3s ease-out' }}
        >
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-dark)' }}>
                    {type === 'success' ? 'check_circle' : 'error'}
                </span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', flex: 1 }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0, display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
            <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    )
}

// ─── Tarjeta de tarifa ────────────────────────────────────────────────────────

interface TarifaCardProps {
    tarifa: TarifaResponse
    esAdmin: boolean
    onEditar: (tarifa: TarifaResponse) => void
}

function TarifaCard({ tarifa, esAdmin, onEditar }: TarifaCardProps) {
    const colores = colorTipo(tarifa.tipoVehiculo)
    return (
        <Card
            className="shadow-sm hover:shadow-md transition-shadow duration-200"
            style={{ border: `1.5px solid ${colores.border}` }}
        >
            {/* Cabecera: icono + nombre + badge Activa */}
            <CardHeader className="border-b pb-4 flex-row items-center gap-3">
                <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: '44px', height: '44px', background: colores.bg }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: colores.accent }}>
                        {iconoTipo(tarifa.tipoVehiculo)}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-[13px]">
                        {tarifa.tipoVehiculo.charAt(0) + tarifa.tipoVehiculo.slice(1).toLowerCase()}
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                        por {tarifa.unidadTarifa.toLowerCase()}
                    </CardDescription>
                </div>
                <CardAction>
                    <Badge variant="success">
                        <span className="size-1.5 rounded-full bg-current opacity-80 shrink-0" />
                        Activa
                    </Badge>
                </CardAction>
            </CardHeader>

            {/* Valor vigente */}
            <CardContent className="flex flex-col gap-3">
                <div
                    className="text-center rounded-xl py-4"
                    style={{ background: colores.bg }}
                >
                    <p className="text-[11px] font-bold uppercase tracking-wide m-0 mb-1" style={{ color: colores.accent }}>
                        Tarifa vigente
                    </p>
                    <p className="text-[32px] font-black m-0" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
                        {formatCOP(tarifa.valor)}
                    </p>
                    <p className="text-[12px] m-0 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        por hora
                    </p>
                </div>

                {/* Botón editar — solo ADMIN */}
                {esAdmin && (
                    <button
                        onClick={() => onEditar(tarifa)}
                        className="w-full py-[11px] rounded-[10px] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer"
                        style={{ border: `1.5px solid ${colores.border}`, background: '#fff', color: colores.accent }}
                        onMouseEnter={e => { e.currentTarget.style.background = colores.bg }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                        Cambiar tarifa
                    </button>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const Tarifas: React.FC = () => {
    const { tarifas, isLoading, crear, editar, isSaving, toast, clearToast } = useTarifas()
    const { user } = useAuth()
    const { estadoRed } = useApp()
    const sidebarOffset = useSidebarOffset()
    const esAdmin = user?.rol === 'ADMINISTRADOR'

    const [editTarget, setEditTarget] = useState<TarifaResponse | null>(null)
    const [crearModal, setCrearModal] = useState(false)

    // Solo se debe poder crear tarifa si falta alguna
    const TIPOS_SISTEMA = [
        { id: 1, nombre: 'CARRO' },
        { id: 2, nombre: 'MOTO' }
    ]
    const tiposConTarifa = new Set(tarifas.map(t => t.idTipoVehiculo))
    const opcionesFaltantes = TIPOS_SISTEMA.filter(ts => !tiposConTarifa.has(ts.id))
    const puedeCrear = esAdmin && opcionesFaltantes.length > 0

    const handleGuardarCrear = async (idTipoVehiculo: number, valor: number) => {
        await crear({ idTipoVehiculo, idUnidadTarifa: 1, valor }) // idUnidadTarifa 1 asume "HORA"
        setCrearModal(false)
    }

    const handleGuardarEditar = async (valor: number) => {
        if (!editTarget) return
        await editar(editTarget.idTarifa, { valor })
        setEditTarget(null)
    }

    return (
        <IonPage>
            <div className={`relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-white ${sidebarOffset}`}>

                {/* Header */}
                <header
                    className="flex items-center gap-3 px-4 py-3 md:px-8 md:py-4 border-b border-[color:var(--color-border)] bg-white"
                    style={{
                        position: 'sticky',
                        top: 'var(--network-banner-height, 0px)',
                        zIndex: 20,
                    }}
                >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 className="text-[16px] md:text-[20px] font-bold m-0" style={{ color: 'var(--color-text-primary)' }}>Configuración de Tarifas</h1>
                        <p className="text-[11px] md:text-[13px] m-0" style={{ color: 'var(--color-text-muted)' }}>
                            {esAdmin ? 'Administrador — puedes editar las tarifas' : 'Solo lectura'}
                        </p>
                    </div>
                    {/* Indicador de estado de red */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        fontSize: '11px', fontWeight: 600,
                        color: estadoRed === 'online' ? 'var(--color-success-dark)' : estadoRed === 'offline' ? 'var(--color-danger-dark)' : 'var(--color-info)',
                    }}>
                        <div style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: estadoRed === 'online' ? 'var(--color-success)' : estadoRed === 'offline' ? 'var(--color-danger)' : 'var(--color-info-light)',
                        }} />
                        {estadoRed === 'online' ? 'En línea' : estadoRed === 'offline' ? 'Sin conexión' : 'Sincronizando'}
                    </div>
                    {puedeCrear && (
                        <button
                            onClick={() => setCrearModal(true)}
                            style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                        </button>
                    )}
                </header>

                <IonContent fullscreen style={{ '--background': 'var(--color-surface-alt)' }}>
                    <div className="p-4 pb-24 md:p-8 md:pb-8 flex flex-col gap-4">

                        {/* Aviso para AUXILIAR */}
                        {!esAdmin && (
                            <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#d97706' }}>info</span>
                                <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
                                    Solo los administradores pueden modificar las tarifas.
                                </p>
                            </div>
                        )}

                        {/* Skeleton */}
                        {isLoading ? (
                            [1, 2].map(n => (
                                <div key={n} style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid var(--color-surface-subtle)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {[['40%', '30%'], ['100%', '50px'], ['100%', '40px']].map(([w, h], i) => (
                                        <div key={i} style={{ width: w, height: h, background: 'var(--color-surface-subtle)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                    ))}
                                    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
                                </div>
                            ))
                        ) : tarifas.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: '12px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>payments</span>
                                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
                                    No hay tarifas activas configuradas.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tarifas.map(tarifa => (
                                    <TarifaCard
                                        key={tarifa.idTarifa}
                                        tarifa={tarifa}
                                        esAdmin={esAdmin}
                                        onEditar={setEditTarget}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Nota informativa */}
                        {!isLoading && tarifas.length > 0 && (
                            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-text-muted)', marginTop: '1px', flexShrink: 0 }}>info</span>
                                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    Al guardar un nuevo valor, la tarifa anterior queda inactiva automáticamente.
                                    El cálculo de costo al registrar una salida usará siempre la tarifa activa en ese momento.
                                </p>
                            </div>
                        )}
                    </div>
                </IonContent>

                <BottomNav />

                {/* Modal creación — siempre montado, Dialog controla visibilidad */}
                <CrearModal
                    open={crearModal}
                    opcionesPermitidas={opcionesFaltantes}
                    isSaving={isSaving}
                    onGuardar={handleGuardarCrear}
                    onCancelar={() => setCrearModal(false)}
                />

                {/* Modal edición */}
                {editTarget && (
                    <EditModal
                        tarifa={editTarget}
                        isSaving={isSaving}
                        onGuardar={handleGuardarEditar}
                        onCancelar={() => setEditTarget(null)}
                    />
                )}

                {/* Toast */}
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </IonPage>
    )
}

export default Tarifas