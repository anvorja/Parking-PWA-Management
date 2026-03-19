// src/pages/Ingresos.tsx
// HU-018: listado scroll infinito, filtro placa, banner offline, botón salida
// HU-019: botón eliminar solo ADMINISTRADOR + modal confirmación
// HU-020: botón editar (todos los roles) + modal con campos condicionales según rol
//
// muestra badge "Sincronización pendiente" en tarjetas cuyo idIngreso
// está en salidasPendientes (salidas encoladas sin conexión).

import React, { useEffect, useRef, useState } from 'react'
import { IonPage, IonContent, useIonRouter } from '@ionic/react'
import { useIngresos } from '../hooks/useIngresos'
import { useAuth } from '../hooks/useAuth'
import { EditarIngresoRequest, IngresoVehiculoResponse } from '../services/ingresoService'
import { refDataService, UbicacionRef, TipoVehiculoRef } from '../services/refDataService'
import BottomNav from '../components/BottomNav'

// Estados de ingreso según dbInicialization.sql (id=1 INGRESADO, id=2 ENTREGADO)
const ESTADOS_INGRESO = [
    { id: 1, nombre: 'INGRESADO' },
    { id: 2, nombre: 'ENTREGADO' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatFecha(iso: string): string {
    const d = new Date(iso)
    const h = d.getHours()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 || 12
    return `${d.getDate()} ${MESES[d.getMonth()]}, ${h12}:${d.getMinutes().toString().padStart(2,'0')} ${ampm}`
}

function isoToLocal(iso: string): string {
    if (!iso) return ''
    const d   = new Date(iso)
    const pad = (n: number) => String(n).padStart(2,'0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getEstadoStyle(estado: string): { bg: string; text: string; dot: string } {
    switch (estado.toUpperCase()) {
        case 'INGRESADO': return { bg: '#ecfdf5', text: '#059669', dot: '#10b981' }
        case 'ENTREGADO': return { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' }
        default:          return { bg: '#fef9c3', text: '#92400e', dot: '#f59e0b' }
    }
}

function getTipoIcon(tipo: string): string {
    return tipo.toUpperCase() === 'MOTO' ? 'two_wheeler' : 'directions_car'
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px',
}
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', background: '#f8fafc',
    fontSize: '14px', color: '#0f172a', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #f1f5f9', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[['60%','24%'],['40%','30%'],['50%','18%']].map(([w1,w2], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: w1, height: '14px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: w2, height: '14px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        </div>
    )
}

// ─── Modal eliminación ────────────────────────────────────────────────────────

interface DeleteModalProps {
    ingreso: IngresoVehiculoResponse
    isDeleting: boolean
    onConfirm: () => void
    onCancel: () => void
}

function DeleteModal({ ingreso, isDeleting, onConfirm, onCancel }: DeleteModalProps) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#ef4444' }}>delete_forever</span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', textAlign: 'center', margin: '0 0 8px' }}>¿Eliminar este registro?</h3>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', margin: '0 0 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', letterSpacing: '1px' }}>{ingreso.placa}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{ingreso.ubicacion} · {ingreso.tipoVehiculo} · {formatFecha(ingreso.fechaHoraIngreso)}</p>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5 }}>Esta acción es permanente y no se puede deshacer.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onCancel} disabled={isDeleting} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer' }}>Cancelar</button>
                    <button onClick={onConfirm} disabled={isDeleting} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: isDeleting ? '#fca5a5' : '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {isDeleting
                            ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Eliminando...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>Eliminar</>}
                    </button>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        </div>
    )
}

// ─── Modal edición ────────────────────────────────────────────────────────────

interface EditModalProps {
    ingreso: IngresoVehiculoResponse
    esAdmin: boolean
    isEditing: boolean
    ubicaciones: UbicacionRef[]
    tipos: TipoVehiculoRef[]
    onGuardar: (data: EditarIngresoRequest) => Promise<void>
    onCancelar: () => void
}

function EditModal({ ingreso, esAdmin, isEditing, ubicaciones, tipos, onGuardar, onCancelar }: EditModalProps) {
    const [placa, setPlaca]                     = useState(ingreso.placa)
    const [idUbicacion, setIdUbicacion]         = useState(ingreso.idUbicacion)
    const [idTipoVehiculo, setIdTipoVehiculo]   = useState(ingreso.idTipoVehiculo)
    const [idEstadoIngreso, setIdEstadoIngreso] = useState(ingreso.idEstadoIngreso)
    const [fechaIngreso, setFechaIngreso]       = useState(isoToLocal(ingreso.fechaHoraIngreso))
    const [fechaSalida, setFechaSalida]         = useState('')
    const [errorLocal, setErrorLocal]           = useState('')

    const handleGuardar = async () => {
        setErrorLocal('')
        if (esAdmin && fechaSalida && new Date(fechaSalida) < new Date(fechaIngreso)) {
            setErrorLocal('La fecha de salida no puede ser anterior a la fecha de ingreso')
            return
        }
        const data: EditarIngresoRequest = {
            placa: placa.trim().toUpperCase(),
            idUbicacion,
            ...(esAdmin && { idTipoVehiculo, idEstadoIngreso }),
            ...(esAdmin && fechaIngreso && { fechaHoraIngreso: new Date(fechaIngreso).toISOString() }),
            ...(esAdmin && fechaSalida  && { fechaHoraSalida:  new Date(fechaSalida).toISOString()  }),
        }
        try { await onGuardar(data) } catch { /* toast ya gestionado en provider */ }
    }

    const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer' }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) onCancelar() }}>
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>

                <div style={{ width: '40px', height: '4px', background: '#e2e8f0', borderRadius: '9999px', margin: '0 auto 16px' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Editar Registro</h3>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                            {esAdmin ? 'Administrador — todos los campos' : 'Auxiliar — placa y ubicación'}
                        </p>
                    </div>
                    <button onClick={onCancelar} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>

                {errorLocal && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
                        {errorLocal}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Placa — todos */}
                    <div>
                        <label style={labelStyle}>Placa</label>
                        <input type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} maxLength={8}
                               style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, fontSize: '16px' }}
                               onFocus={e => { e.target.style.borderColor = '#137fec' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }} />
                    </div>

                    {/* Ubicación — todos */}
                    <div>
                        <label style={labelStyle}>Espacio</label>
                        <div style={{ position: 'relative' }}>
                            <select value={idUbicacion} onChange={e => setIdUbicacion(Number(e.target.value))} style={selectStyle}
                                    onFocus={e => { e.target.style.borderColor = '#137fec' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}>
                                {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.tipoVehiculoNativo})</option>)}
                            </select>
                            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94a3b8', pointerEvents: 'none' }}>expand_more</span>
                        </div>
                    </div>

                    {/* Solo ADMINISTRADOR */}
                    {esAdmin && (
                        <>
                            <div>
                                <label style={labelStyle}>Tipo de Vehículo</label>
                                <div style={{ position: 'relative' }}>
                                    <select value={idTipoVehiculo} onChange={e => setIdTipoVehiculo(Number(e.target.value))} style={selectStyle}
                                            onFocus={e => { e.target.style.borderColor = '#137fec' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}>
                                        {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94a3b8', pointerEvents: 'none' }}>expand_more</span>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Estado</label>
                                <div style={{ position: 'relative' }}>
                                    <select value={idEstadoIngreso} onChange={e => setIdEstadoIngreso(Number(e.target.value))} style={selectStyle}
                                            onFocus={e => { e.target.style.borderColor = '#137fec' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}>
                                        {ESTADOS_INGRESO.map(est => <option key={est.id} value={est.id}>{est.nombre}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#94a3b8', pointerEvents: 'none' }}>expand_more</span>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Fecha y hora de ingreso</label>
                                <input type="datetime-local" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} style={inputStyle}
                                       onFocus={e => { e.target.style.borderColor = '#137fec' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }} />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    Fecha y hora de salida{' '}
                                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(opcional)</span>
                                </label>
                                <input type="datetime-local" value={fechaSalida} onChange={e => setFechaSalida(e.target.value)} min={fechaIngreso} style={inputStyle}
                                       onFocus={e => { e.target.style.borderColor = '#137fec' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }} />
                            </div>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                    <button onClick={onCancelar} disabled={isEditing} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: isEditing ? 'not-allowed' : 'pointer' }}>Cancelar</button>
                    <button onClick={handleGuardar} disabled={isEditing} style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isEditing ? '#93c5fd' : '#137fec', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isEditing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isEditing
                            ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Guardando...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>Guardar cambios</>}
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
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: type === 'success' ? '#16a34a' : '#dc2626' }}>{type === 'success' ? 'check_circle' : 'error'}</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', flex: 1 }}>{message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
            <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const Ingresos: React.FC = () => {
    const {
        ingresos, isLoading, isLoadingMore, hasMore,
        totalElements, isOnline, filtroPlaca,
        setFiltroPlaca, cargarMas,
        eliminarIngreso, isDeleting,
        editarIngreso, isEditing,
        toast, clearToast,
        salidasPendientes,   // Gap 3
    } = useIngresos()

    const { user } = useAuth()
    const esAdmin = user?.rol === 'ADMINISTRADOR'
    const router  = useIonRouter()

    const [deleteTarget, setDeleteTarget] = useState<IngresoVehiculoResponse | null>(null)
    const [editTarget,   setEditTarget]   = useState<IngresoVehiculoResponse | null>(null)
    const [ubicaciones,  setUbicaciones]  = useState<UbicacionRef[]>([])
    const [tipos,        setTipos]        = useState<TipoVehiculoRef[]>([])

    // Cargar datos de referencia para el modal de edición
    useEffect(() => {
        const cargar = async () => {
            const [ubs, tps] = await Promise.all([
                refDataService.getUbicaciones(),
                refDataService.getTiposVehiculo(),
            ])
            if (ubs) setUbicaciones(ubs)
            if (tps) setTipos(tps)
        }
        void cargar()
    }, [])

    // Debounce filtro
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = e.target.value.toUpperCase()
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setFiltroPlaca(valor), 350)
    }
    const handleLimpiarFiltro = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        setFiltroPlaca('')
    }
    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

    // IntersectionObserver para scroll infinito
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting && hasMore && !isLoadingMore) cargarMas() },
            { threshold: 0.1 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore, isLoadingMore, cargarMas])

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        await eliminarIngreso(deleteTarget.idIngreso)
        setDeleteTarget(null)
    }

    const handleGuardar = async (data: EditarIngresoRequest) => {
        if (!editTarget) return
        await editarIngreso(editTarget.idIngreso, data)
        setEditTarget(null)
    }

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white">

                {/* Header */}
                <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '12px 16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#137fec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>format_list_bulleted</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Registros de Ingreso</h1>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                            {isLoading ? 'Cargando...' : `${totalElements} ${totalElements === 1 ? 'registro' : 'registros'}`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: isOnline ? '#059669' : '#dc2626' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444' }} />
                        {isOnline ? 'En línea' : 'Sin conexión'}
                    </div>
                </header>

                <IonContent fullscreen style={{ '--background': '#f8fafc' }}>
                    <div style={{ paddingBottom: '88px' }}>

                        {/* Banner offline */}
                        {!isOnline && (
                            <div style={{ margin: '12px 16px 0', padding: '10px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#d97706' }}>wifi_off</span>
                                <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.4 }}>
                                    <strong>Sin conexión</strong> — mostrando registros guardados localmente
                                </p>
                            </div>
                        )}

                        {/* Buscador */}
                        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                            <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '18px', color: '#94a3b8', pointerEvents: 'none' }}>search</span>
                                <input type="text" defaultValue={filtroPlaca} onChange={handleFiltroChange} placeholder="Buscar por placa..."
                                       style={{ width: '100%', padding: '9px 36px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }}
                                       onFocus={e => { e.target.style.borderColor = '#137fec' }} onBlur={e => { e.target.style.borderColor = '#e2e8f0' }} />
                                {filtroPlaca && (
                                    <button onClick={handleLimpiarFiltro} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                    </button>
                                )}
                            </label>
                        </div>

                        {/* Lista */}
                        {isLoading ? (
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[1,2,3,4].map(n => <SkeletonCard key={n} />)}
                            </div>
                        ) : ingresos.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '12px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>inbox</span>
                                <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                                    {filtroPlaca ? `Sin resultados para "${filtroPlaca}"` : 'No hay registros de ingreso'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <ul style={{ listStyle: 'none', margin: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {ingresos.map(ingreso => {
                                        const estadoStyle    = getEstadoStyle(ingreso.estadoIngreso)
                                        const esIngresado    = ingreso.estadoIngreso.toUpperCase() === 'INGRESADO'
                                        // Gap 3: ¿tiene una salida pendiente de sincronizar?
                                        const salidaPendiente = salidasPendientes.has(ingreso.idIngreso)

                                        return (
                                            <li
                                                key={ingreso.idIngreso}
                                                style={{
                                                    background: '#fff',
                                                    borderRadius: '14px',
                                                    // Borde naranja discreto cuando la salida está pendiente de sync
                                                    border: salidaPendiente
                                                        ? '1.5px solid #fb923c'
                                                        : '1.5px solid #f1f5f9',
                                                    padding: '14px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '10px',
                                                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                                }}
                                            >
                                                {/* Gap 3: badge "Salida pendiente de sincronización" */}
                                                {salidaPendiente && (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        background: '#fff7ed', borderRadius: '8px',
                                                        padding: '5px 10px',
                                                    }}>
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '14px', color: '#ea580c' }}
                                                        >
                                                            cloud_off
                                                        </span>
                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c' }}>
                                                            Salida pendiente de sincronización
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Placa + estado + acciones */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#137fec' }}>{getTipoIcon(ingreso.tipoVehiculo)}</span>
                                                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>{ingreso.placa}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: estadoStyle.bg, color: estadoStyle.text, borderRadius: '9999px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: estadoStyle.dot }} />
                                                            {ingreso.estadoIngreso}
                                                        </div>
                                                        {/* Editar — todos los roles */}
                                                        <button
                                                            onClick={() => setEditTarget(ingreso)}
                                                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #dbeafe', background: '#fff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff' }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                                                            title="Editar registro"
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                                        </button>
                                                        {/* Eliminar — solo ADMIN */}
                                                        {esAdmin && (
                                                            <button
                                                                onClick={() => setDeleteTarget(ingreso)}
                                                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                                                                title="Eliminar registro"
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Ubicación + fecha */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8' }}>location_on</span>
                                                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{ingreso.ubicacion}</span>
                                                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>•</span>
                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{ingreso.tipoVehiculo}</span>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatFecha(ingreso.fechaHoraIngreso)}</span>
                                                </div>

                                                {/* Operador + ID */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#cbd5e1' }}>person</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ingreso.usuarioRegistro}</span>
                                                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>·</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{ingreso.idIngreso}</span>
                                                </div>

                                                {/* Botón salida */}
                                                {esIngresado && (
                                                    <button
                                                        disabled={!isOnline || salidaPendiente}
                                                        onClick={() => router.push(`/salida?placa=${encodeURIComponent(ingreso.placa)}`, 'forward', 'push')}
                                                        style={{
                                                            width: '100%', padding: '9px', borderRadius: '10px',
                                                            border: 'none',
                                                            background: (!isOnline || salidaPendiente) ? '#e2e8f0' : '#137fec',
                                                            color: (!isOnline || salidaPendiente) ? '#94a3b8' : '#fff',
                                                            fontSize: '13px', fontWeight: 700,
                                                            cursor: (!isOnline || salidaPendiente) ? 'not-allowed' : 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                            transition: 'background 0.2s',
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                                                        {salidaPendiente
                                                            ? 'Salida pendiente de sincronización'
                                                            : isOnline
                                                                ? 'Registrar Salida'
                                                                : 'No disponible sin conexión'}
                                                    </button>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>

                                <div ref={sentinelRef} style={{ height: '1px' }} />

                                {isLoadingMore && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
                                        <div style={{ width: '18px', height: '18px', border: '2px solid #e2e8f0', borderTopColor: '#137fec', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                                        Cargando más registros...
                                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                    </div>
                                )}

                                {!hasMore && !isLoadingMore && ingresos.length > 0 && (
                                    <p style={{ textAlign: 'center', fontSize: '11px', color: '#cbd5e1', padding: '12px 0 4px', margin: 0 }}>
                                        — {totalElements} {totalElements === 1 ? 'registro' : 'registros'} en total —
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </IonContent>

                <BottomNav />

                {deleteTarget && <DeleteModal ingreso={deleteTarget} isDeleting={isDeleting} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />}
                {editTarget   && <EditModal   ingreso={editTarget}   esAdmin={esAdmin}       isEditing={isEditing}          ubicaciones={ubicaciones} tipos={tipos} onGuardar={handleGuardar} onCancelar={() => setEditTarget(null)} />}
                {toast        && <Toast       message={toast.message} type={toast.type}      onClose={clearToast} />}
            </div>
        </IonPage>
    )
}

export default Ingresos