// src/pages/Ubicaciones.tsx
// HU-014: listado de ubicaciones con mapa visual
// HU-012: crear nueva ubicación (solo ADMIN)
// HU-015: editar ubicación (solo ADMIN)
// HU-016: desactivar ubicación (solo ADMIN)

import React, { useState, useMemo } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import { useUbicaciones } from '../hooks/useUbicaciones'
import { useAuth } from '../hooks/useAuth'
import { useApp } from '../hooks/useApp'
import { UbicacionResponse, CrearUbicacionRequest, EditarUbicacionRequest } from '../services/ubicacionService'
import BottomNav from '../components/BottomNav'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPOS_VEHICULO = [
    { id: 1, nombre: 'CARRO' },
    { id: 2, nombre: 'MOTO' },
]

function getEstadoColor(estado: string | undefined): { bg: string; text: string; dot: string } {
    switch ((estado ?? '').toUpperCase()) {
        case 'DISPONIBLE': return { bg: '#ecfdf5', text: 'var(--color-success-dark)', dot: 'var(--color-success)' }
        case 'OCUPADO': return { bg: '#fef2f2', text: 'var(--color-danger-dark)', dot: 'var(--color-danger)' }
        case 'INACTIVO': return { bg: '#f1f5f9', text: '#475569', dot: 'var(--color-text-secondary)' }
        default: return { bg: '#f1f5f9', text: 'var(--color-text-secondary)', dot: 'var(--color-text-muted)' }
    }
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px',
}
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1.5px solid var(--color-border)', background: 'var(--color-surface-alt)',
    fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────

interface UbicacionModalProps {
    titulo: string
    inicial: { nombre: string; idTipoVehiculoNativo: number; capacidad: number }
    isSaving: boolean
    tieneIngresos?: boolean
    onGuardar: (data: CrearUbicacionRequest | EditarUbicacionRequest) => Promise<void>
    onCancelar: () => void
}

function UbicacionModal({ titulo, inicial, isSaving, tieneIngresos, onGuardar, onCancelar }: UbicacionModalProps) {
    const [nombre, setNombre] = useState(inicial.nombre)
    const [idTipo, setIdTipo] = useState(inicial.idTipoVehiculoNativo)
    const [capacidad, setCapacidad] = useState(String(inicial.capacidad))
    const [error, setError] = useState('')

    const handleGuardar = async () => {
        setError('')
        if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
        const cap = parseInt(capacidad, 10)
        if (isNaN(cap) || cap < 1) { setError('La capacidad debe ser al menos 1'); return }
        try {
            await onGuardar({ nombre: nombre.trim().toUpperCase(), idTipoVehiculoNativo: idTipo, capacidad: cap })
        } catch { /* toast gestionado en provider */ }
    }

    const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer' }

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
        >
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', width: '100%', maxWidth: '480px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
                <div style={{ width: '40px', height: '4px', background: 'var(--color-border)', borderRadius: '9999px', margin: '0 auto 16px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{titulo}</h3>
                    <button onClick={onCancelar} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#f1f5f9', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-danger-dark)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                        <label style={labelStyle}>Nombre / Código</label>
                        <input
                            type="text" value={nombre} onChange={e => setNombre(e.target.value.toUpperCase())}
                            maxLength={50} placeholder="Ej: A51"
                            style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700 }}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                            onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Tipo de vehículo nativo</label>
                        {tieneIngresos && (
                            <p style={{ fontSize: '11px', color: '#d97706', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                                No se puede cambiar con vehículos activos
                            </p>
                        )}
                        <div style={{ position: 'relative' }}>
                            <select
                                value={idTipo} onChange={e => setIdTipo(Number(e.target.value))}
                                disabled={tieneIngresos}
                                style={{ ...selectStyle, opacity: tieneIngresos ? 0.6 : 1 }}
                                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                                onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
                            >
                                {TIPOS_VEHICULO.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>expand_more</span>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Capacidad</label>
                        <input
                            type="number" value={capacidad} onChange={e => setCapacidad(e.target.value)}
                            min="1" max="10" style={inputStyle}
                            onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                            onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                            Un espacio de carro puede admitir hasta 4 motos cuando está vacío.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                    <button onClick={onCancelar} disabled={isSaving} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={isSaving} style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isSaving ? '#93c5fd' : 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isSaving
                            ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Guardando...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>Guardar</>}
                    </button>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        </div>
    )
}

// ─── Bottom sheet de opciones ─────────────────────────────────────────────────

interface OpcionesModalProps {
    ubicacion: UbicacionResponse
    onEditar: () => void
    onDesactivar: () => void
    onReactivar: () => void
    onCerrar: () => void
}

function OpcionesModal({ ubicacion, onEditar, onDesactivar, onReactivar, onCerrar }: OpcionesModalProps) {
    const colores = getEstadoColor(ubicacion.estadoNombre ?? '')
    
    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) onCerrar() }}
        >
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: '480px', position: 'relative' }}>
                <div style={{ width: '40px', height: '4px', background: 'var(--color-border)', borderRadius: '9999px', margin: '0 auto 16px' }} />
                
                <div style={{ position: 'absolute', top: '24px', right: '20px', background: colores.bg, color: colores.text, border: `1px solid ${colores.dot}`, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {ubicacion.estadoNombre}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--color-primary)' }}>
                            {ubicacion.tipoVehiculoNativo === 'MOTO' ? 'two_wheeler' : 'directions_car'}
                        </span>
                    </div>
                    <div>
                        <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-text-primary)', margin: 0, paddingRight: '80px' }}>{ubicacion.nombre}</p>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                            {ubicacion.tipoVehiculoNativo} · Cap. {ubicacion.capacidad}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ubicacion.estadoNombre === 'INACTIVO' ? (
                        <button
                            onClick={onReactivar}
                            style={{ width: '100%', padding: '13px', borderRadius: '12px', border: '1.5px solid #bbf7d0', background: '#fff', color: '#16a34a', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings_backup_restore</span>
                            Reactivar espacio
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onEditar}
                                style={{ width: '100%', padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>edit</span>
                                Editar datos
                            </button>
                            <button
                                onClick={onDesactivar}
                                style={{ width: '100%', padding: '13px', borderRadius: '12px', border: '1.5px solid #fee2e2', background: '#fff', color: 'var(--color-danger)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>location_off</span>
                                Desactivar espacio
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Modal confirmación desactivar ────────────────────────────────────────────

interface DesactivarModalProps {
    ubicacion: UbicacionResponse
    isSaving: boolean
    onConfirmar: () => void
    onCancelar: () => void
}

function DesactivarModal({ ubicacion, isSaving, onConfirmar, onCancelar }: DesactivarModalProps) {
    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
        >
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--color-danger)' }}>location_off</span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', margin: '0 0 8px' }}>¿Desactivar espacio?</h3>
                <div style={{ background: 'var(--color-surface-alt)', borderRadius: '12px', padding: '12px', margin: '0 0 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{ubicacion.nombre}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>{ubicacion.tipoVehiculoNativo} · Cap. {ubicacion.capacidad}</p>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
                    El espacio quedará inactivo y no aparecerá en el formulario de ingreso.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onCancelar} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        Cancelar
                    </button>
                    <button onClick={onConfirmar} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: isSaving ? '#fca5a5' : 'var(--color-danger)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {isSaving
                            ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            : 'Desactivar'}
                    </button>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        </div>
    )
}

// ─── Modal confirmación reactivar ──────────────────────────────────────────────

interface ReactivarModalProps {
    ubicacion: UbicacionResponse
    isSaving: boolean
    onConfirmar: () => void
    onCancelar: () => void
}

function ReactivarModal({ ubicacion, isSaving, onConfirmar, onCancelar }: ReactivarModalProps) {
    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={e => { if (e.target === e.currentTarget) onCancelar() }}
        >
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--color-success)' }}>settings_backup_restore</span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', margin: '0 0 8px' }}>¿Reactivar espacio?</h3>
                <div style={{ background: 'var(--color-surface-alt)', borderRadius: '12px', padding: '12px', margin: '0 0 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{ubicacion.nombre}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>{ubicacion.tipoVehiculoNativo} · Cap. {ubicacion.capacidad}</p>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>
                    El espacio volverá a estar disponible para el ingreso de vehículos.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onCancelar} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                        Cancelar
                    </button>
                    <button onClick={onConfirmar} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: isSaving ? '#6ee7b7' : 'var(--color-success)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {isSaving
                            ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            : 'Reactivar'}
                    </button>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        </div>
    )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps { message: string; type: 'success' | 'error'; onClose: () => void }
function Toast({ message, type, onClose }: ToastProps) {
    return (
        <div style={{ position: 'fixed', top: '16px', left: '16px', right: '16px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '14px 16px', border: type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca', animation: 'slideDown 0.3s ease-out' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: type === 'success' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: type === 'success' ? '#16a34a' : 'var(--color-danger-dark)' }}>
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

// ─── Componente principal ─────────────────────────────────────────────────────

const Ubicaciones: React.FC = () => {
    const { ubicaciones, isLoading, crear, editar, desactivar, reactivar, isSaving, toast, clearToast } = useUbicaciones()
    const { user } = useAuth()
    const { estadoRed } = useApp()
    const esAdmin = user?.rol === 'ADMINISTRADOR'

    const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CARRO' | 'MOTO'>('TODOS')
    const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'DISPONIBLE' | 'OCUPADO' | 'INACTIVO'>('TODOS')
    const [crearModal, setCrearModal] = useState(false)
    // opcionesTarget: abre el bottom sheet con las opciones (editar / desactivar)
    const [opcionesTarget, setOpcionesTarget] = useState<UbicacionResponse | null>(null)
    // editFormTarget: abre el formulario de edición con datos precargados
    const [editFormTarget, setEditFormTarget] = useState<UbicacionResponse | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<UbicacionResponse | null>(null)
    const [reactivateTarget, setReactivateTarget] = useState<UbicacionResponse | null>(null)

    const ubicacionesFiltradas = useMemo(() => {
        return ubicaciones.filter(u => {
            const pasaTipo = filtroTipo === 'TODOS' || u.tipoVehiculoNativo === filtroTipo
            const pasaEstado = filtroEstado === 'TODOS' || (u.estadoNombre?.toUpperCase() ?? '') === filtroEstado
            return pasaTipo && pasaEstado
        })
    }, [ubicaciones, filtroTipo, filtroEstado])

    const libres = ubicaciones.filter(u => u.disponible).length
    const ocupados = ubicaciones.filter(u => (u.estadoNombre?.toUpperCase() ?? '') === 'OCUPADO').length

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white">

                {/* Header */}
                <header style={{
                    position: 'sticky',
                    top: 'var(--network-banner-height, 0px)',
                    zIndex: 20,
                    borderBottom: '1px solid var(--color-border)', background: '#fff', padding: '12px 16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>grid_view</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Mapa del Parqueadero</h1>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                                {isLoading ? 'Cargando...' : `${libres} libres · ${ocupados} ocupados · ${ubicaciones.length} total`}
                            </p>
                        </div>
                        {/* Indicador de estado de red */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '11px', fontWeight: 600,
                            color: estadoRed === 'online' ? 'var(--color-success-dark)' : estadoRed === 'offline' ? 'var(--color-danger-dark)' : '#1e40af',
                        }}>
                            <div style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                background: estadoRed === 'online' ? 'var(--color-success)' : estadoRed === 'offline' ? 'var(--color-danger)' : '#3b82f6',
                            }} />
                            {estadoRed === 'online' ? 'En línea' : estadoRed === 'offline' ? 'Sin conexión' : 'Sincronizando'}
                        </div>
                        {esAdmin && (
                            <button
                                onClick={() => setCrearModal(true)}
                                style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                            </button>
                        )}
                    </div>

                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(['TODOS', 'CARRO', 'MOTO'] as const).map(t => (
                            <button key={t} onClick={() => setFiltroTipo(t)} style={{ padding: '4px 10px', borderRadius: '9999px', border: `1px solid ${filtroTipo === t ? 'var(--color-primary)' : 'var(--color-border)'}`, background: filtroTipo === t ? 'var(--color-primary)' : '#fff', color: filtroTipo === t ? '#fff' : 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                {t === 'TODOS' ? 'Todos' : t.charAt(0) + t.slice(1).toLowerCase()}
                            </button>
                        ))}
                        <div style={{ width: '1px', background: 'var(--color-border)', margin: '0 2px' }} />
                        {(['TODOS', 'DISPONIBLE', 'OCUPADO', 'INACTIVO'] as const).map(e => (
                            <button key={e} onClick={() => setFiltroEstado(e)} style={{ padding: '4px 10px', borderRadius: '9999px', border: `1px solid ${filtroEstado === e ? 'var(--color-primary)' : 'var(--color-border)'}`, background: filtroEstado === e ? 'var(--color-primary)' : '#fff', color: filtroEstado === e ? '#fff' : 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                {e === 'TODOS' ? 'Todos' : e.charAt(0) + e.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </header>

                <IonContent fullscreen style={{ '--background': 'var(--color-surface-alt)' }}>
                    <div style={{ padding: '12px 16px', paddingBottom: '100px' }}>
                        {isLoading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} style={{ aspectRatio: '1', background: '#f1f5f9', borderRadius: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                                ))}
                                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
                            </div>
                        ) : ubicacionesFiltradas.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: '12px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>grid_view</span>
                                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>No hay ubicaciones con los filtros seleccionados</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {ubicacionesFiltradas.map(ub => {
                                    const colores = getEstadoColor(ub.estadoNombre ?? '')
                                    const tipoIcon = ub.tipoVehiculoNativo === 'MOTO' ? 'two_wheeler' : 'directions_car'
                                    return (
                                        <div
                                            key={ub.id}
                                            style={{ background: '#fff', borderRadius: '10px', border: `1.5px solid ${ub.estadoNombre === 'INACTIVO' ? '#f1f5f9' : (ub.disponible ? 'var(--color-border)' : '#fecaca')}`, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: esAdmin ? 'pointer' : 'default', transition: 'all 0.15s', position: 'relative', opacity: ub.estadoNombre === 'INACTIVO' ? 0.6 : 1 }}
                                            onClick={() => { if (esAdmin) setOpcionesTarget(ub) }}
                                            onMouseEnter={e => { if (esAdmin) e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = ub.estadoNombre === 'INACTIVO' ? '#f1f5f9' : (ub.disponible ? 'var(--color-border)' : '#fecaca') }}
                                        >
                                            <div style={{ position: 'absolute', top: '5px', right: '5px', width: '7px', height: '7px', borderRadius: '50%', background: colores.dot }} />
                                            {ub.estadoNombre === 'INACTIVO' ? (
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>lock</span>
                                            ) : (
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: ub.disponible ? 'var(--color-text-muted)' : 'var(--color-danger)' }}>{tipoIcon}</span>
                                            )}
                                            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, lineHeight: 1 }}>{ub.nombre.charAt(0)}</span>
                                            <span style={{ fontSize: '17px', fontWeight: 900, color: ub.estadoNombre === 'INACTIVO' ? 'var(--color-text-secondary)' : (ub.disponible ? 'var(--color-text-primary)' : 'var(--color-danger)'), lineHeight: 1, textDecoration: ub.estadoNombre === 'INACTIVO' ? 'line-through' : 'none' }}>
                                                {ub.nombre.slice(1)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </IonContent>

                <BottomNav />

                {/* Modal crear */}
                {crearModal && (
                    <UbicacionModal
                        titulo="Nueva Ubicación"
                        inicial={{ nombre: '', idTipoVehiculoNativo: 1, capacidad: 1 }}
                        isSaving={isSaving}
                        onGuardar={async data => { await crear(data as CrearUbicacionRequest); setCrearModal(false) }}
                        onCancelar={() => setCrearModal(false)}
                    />
                )}

                {/* Bottom sheet de opciones */}
                {opcionesTarget && (
                    <OpcionesModal
                        ubicacion={opcionesTarget}
                        onEditar={() => {
                            setEditFormTarget(opcionesTarget)
                            setOpcionesTarget(null)
                        }}
                        onDesactivar={() => {
                            setDeleteTarget(opcionesTarget)
                            setOpcionesTarget(null)
                        }}
                        onReactivar={() => {
                            setReactivateTarget(opcionesTarget)
                            setOpcionesTarget(null)
                        }}
                        onCerrar={() => setOpcionesTarget(null)}
                    />
                )}

                {/* Modal editar — abre con datos precargados */}
                {editFormTarget && (
                    <UbicacionModal
                        titulo={`Editar — ${editFormTarget.nombre}`}
                        inicial={{
                            nombre: editFormTarget.nombre,
                            idTipoVehiculoNativo: editFormTarget.idTipoVehiculoNativo,
                            capacidad: editFormTarget.capacidad,
                        }}
                        isSaving={isSaving}
                        tieneIngresos={!editFormTarget.disponible}
                        onGuardar={async data => {
                            await editar(editFormTarget.id, data as EditarUbicacionRequest)
                            setEditFormTarget(null)
                        }}
                        onCancelar={() => setEditFormTarget(null)}
                    />
                )}

                {/* Modal confirmar desactivar */}
                {deleteTarget && (
                    <DesactivarModal
                        ubicacion={deleteTarget}
                        isSaving={isSaving}
                        onConfirmar={async () => { await desactivar(deleteTarget.id); setDeleteTarget(null) }}
                        onCancelar={() => setDeleteTarget(null)}
                    />
                )}

                {/* Modal confirmar reactivar */}
                {reactivateTarget && (
                    <ReactivarModal
                        ubicacion={reactivateTarget}
                        isSaving={isSaving}
                        onConfirmar={async () => { await reactivar(reactivateTarget.id); setReactivateTarget(null) }}
                        onCancelar={() => setReactivateTarget(null)}
                    />
                )}

                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </IonPage>
    )
}

export default Ubicaciones