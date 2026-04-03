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
import { useApp } from '../hooks/useApp'
import { EditarIngresoRequest, IngresoVehiculoResponse } from '../services/ingresoService'
import { refDataService, UbicacionRef, TipoVehiculoRef } from '../services/refDataService'
import BottomNav from '../components/BottomNav'
import { useSidebarOffset } from '../hooks/useSidebarOffset'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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


function getTipoIcon(tipo: string): string {
    return tipo.toUpperCase() === 'MOTO' ? 'two_wheeler' : 'directions_car'
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

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid var(--color-surface-subtle)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[['60%','24%'],['40%','30%'],['50%','18%']].map(([w1,w2], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: w1, height: '14px', background: 'var(--color-surface-subtle)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: w2, height: '14px', background: 'var(--color-surface-subtle)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
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
        <Dialog open onOpenChange={val => { if (!val && !isDeleting) onCancel() }}>
            <DialogContent className="sm:max-w-[360px]" showCloseButton={false}>
                <DialogHeader className="items-center text-center">
                    <div className="mx-auto mb-2 flex h-13 w-13 items-center justify-center rounded-[14px]" style={{ background: 'var(--color-danger-bg)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--color-danger)' }}>delete_forever</span>
                    </div>
                    <DialogTitle className="text-[17px] text-center">¿Eliminar este registro?</DialogTitle>
                </DialogHeader>

                <div className="rounded-xl px-3 py-3 text-center" style={{ background: 'var(--color-surface-alt)' }}>
                    <p style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '0 0 4px', letterSpacing: '1px' }}>{ingreso.placa}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>{ingreso.ubicacion} · {ingreso.tipoVehiculo} · {formatFecha(ingreso.fechaHoraIngreso)}</p>
                </div>
                <p className="text-center text-[13px] leading-relaxed -mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    Esta acción es permanente y no se puede deshacer.
                </p>

                <div className="flex gap-2.5">
                    <button onClick={onCancel} disabled={isDeleting} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer' }}>Cancelar</button>
                    <button onClick={onConfirm} disabled={isDeleting} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: isDeleting ? '#fca5a5' : 'var(--color-danger)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {isDeleting
                            ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Eliminando...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>Eliminar</>}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
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

    return (
        <Dialog open onOpenChange={val => { if (!val && !isEditing) onCancelar() }}>
            <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[17px]">Editar Registro</DialogTitle>
                    <DialogDescription>{esAdmin ? 'Administrador — todos los campos' : 'Auxiliar — placa y ubicación'}</DialogDescription>
                </DialogHeader>

                {errorLocal && (
                    <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border-light)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'var(--color-danger-dark)' }}>
                        {errorLocal}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Placa</label>
                        <input type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} maxLength={8}
                               style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, fontSize: '16px' }}
                               onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }} onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }} />
                    </div>

                    <div>
                        <label style={labelStyle}>Espacio</label>
                        <Select value={String(idUbicacion)} onValueChange={val => setIdUbicacion(Number(val))}>
                            <SelectTrigger className="w-full h-10 rounded-[10px] border-[1.5px] border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] text-[14px] text-[color:var(--color-text-primary)]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ubicaciones.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.nombre} ({u.tipoVehiculoNativo})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {esAdmin && (
                        <>
                            <div>
                                <label style={labelStyle}>Tipo de Vehículo</label>
                                <Select value={String(idTipoVehiculo)} onValueChange={val => setIdTipoVehiculo(Number(val))}>
                                    <SelectTrigger className="w-full h-10 rounded-[10px] border-[1.5px] border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] text-[14px] text-[color:var(--color-text-primary)]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tipos.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label style={labelStyle}>Estado</label>
                                <Select value={String(idEstadoIngreso)} onValueChange={val => setIdEstadoIngreso(Number(val))}>
                                    <SelectTrigger className="w-full h-10 rounded-[10px] border-[1.5px] border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] text-[14px] text-[color:var(--color-text-primary)]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ESTADOS_INGRESO.map(est => <SelectItem key={est.id} value={String(est.id)}>{est.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label style={labelStyle}>Fecha y hora de ingreso</label>
                                <input type="datetime-local" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} style={inputStyle}
                                       onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }} onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>
                                    Fecha y hora de salida{' '}
                                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-muted)' }}>(opcional)</span>
                                </label>
                                <input type="datetime-local" value={fechaSalida} onChange={e => setFechaSalida(e.target.value)} min={fechaIngreso} style={inputStyle}
                                       onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }} onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }} />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-2.5 pt-2">
                    <button onClick={onCancelar} disabled={isEditing} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600, cursor: isEditing ? 'not-allowed' : 'pointer' }}>Cancelar</button>
                    <button onClick={handleGuardar} disabled={isEditing} style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isEditing ? '#93c5fd' : 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isEditing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isEditing
                            ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Guardando...</>
                            : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>Guardar cambios</>}
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
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-dark)' }}>{type === 'success' ? 'check_circle' : 'error'}</span>
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

const Ingresos: React.FC = () => {
    const {
        ingresos, isLoading, isLoadingMore, hasMore,
        totalElements, isOnline, filtroPlaca,
        setFiltroPlaca, filtroFecha, setFiltroFecha, cargarMas,
        eliminarIngreso, isDeleting,
        editarIngreso, isEditing,
        toast, clearToast,
        salidasPendientes,   // Gap 3
    } = useIngresos()

    const { user } = useAuth()
    const { estadoRed } = useApp()
    const sidebarOffset = useSidebarOffset()
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
    const handleFiltroFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiltroFecha(e.target.value)
    }
    const handleLimpiarFiltroFecha = () => {
        setFiltroFecha('')
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
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>format_list_bulleted</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Registros de Ingreso</h1>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                            {isLoading ? 'Cargando...' : `${totalElements} ${totalElements === 1 ? 'registro' : 'registros'}`}
                        </p>
                    </div>
                    {/* Indicador de estado de red — consistente en todas las páginas */}
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
                </header>

                <IonContent fullscreen style={{ '--background': 'var(--color-surface-alt)' }}>
                    <div className="pb-24 md:pb-8">

                        {/* Buscador */}
                        <div className="flex gap-2.5 px-4 py-3 md:px-8 md:py-4 bg-white border-b border-slate-100">
                            <label style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '18px', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>search</span>
                                <input type="text" defaultValue={filtroPlaca} onChange={handleFiltroChange} placeholder="Buscar placa..."
                                       style={{ width: '100%', padding: '9px 36px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface-alt)', fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }}
                                       onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }} onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }} />
                                {filtroPlaca && (
                                    <button onClick={handleLimpiarFiltro} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0, display: 'flex' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                    </button>
                                )}
                            </label>

                            <label style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: '140px' }}>
                                <input type="date" value={filtroFecha} onChange={handleFiltroFechaChange}
                                       style={{ width: '100%', padding: '8px 12px', paddingRight: filtroFecha ? '30px' : '12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface-alt)', fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', colorScheme: 'light' }}
                                       onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }} onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }} />
                                {filtroFecha && (
                                    <button onClick={handleLimpiarFiltroFecha} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0, display: 'flex' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px', background: 'var(--color-surface-alt)' }}>close</span>
                                    </button>
                                )}
                            </label>
                        </div>

                        {/* Lista */}
                        {isLoading ? (
                            <div className="p-3 md:p-4 md:px-8 flex flex-col gap-2.5">
                                {[1,2,3,4].map(n => <SkeletonCard key={n} />)}
                            </div>
                        ) : ingresos.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '12px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>inbox</span>
                                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', textAlign: 'center', margin: 0 }}>
                                    {(filtroPlaca || filtroFecha) 
                                        ? `Sin resultados para los filtros aplicados` 
                                        : 'No hay registros de ingreso'}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* ── Mobile: lista de cards ─────────────────────── */}
                                <ul className="md:hidden list-none m-0 p-3 flex flex-col gap-2.5">
                                    {ingresos.map(ingreso => {
                                        const esIngresado     = ingreso.estadoIngreso.toUpperCase() === 'INGRESADO'
                                        const salidaPendiente = salidasPendientes.has(ingreso.idIngreso)
                                        return (
                                            <li
                                                key={ingreso.idIngreso}
                                                className="p-[14px] flex flex-col gap-2.5"
                                                style={{
                                                    background: '#fff', borderRadius: '14px',
                                                    border: salidaPendiente ? '1.5px solid #fb923c' : '1.5px solid var(--color-surface-subtle)',
                                                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                                }}
                                            >
                                                {salidaPendiente && (
                                                    <Badge variant="warning" className="h-auto px-2.5 py-1.5 rounded-lg gap-1.5 text-[11px] font-bold w-full justify-start">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>cloud_off</span>
                                                        Salida pendiente de sincronización
                                                    </Badge>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>{getTipoIcon(ingreso.tipoVehiculo)}</span>
                                                        <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '1px' }}>{ingreso.placa}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Badge variant={esIngresado ? 'success' : 'muted'}>
                                                            <span className="size-1.5 rounded-full bg-current opacity-80 shrink-0" />
                                                            {ingreso.estadoIngreso}
                                                        </Badge>
                                                        <button onClick={() => setEditTarget(ingreso)} title="Editar"
                                                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #dbeafe', background: '#fff', color: 'var(--color-info-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff' }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
                                                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                                        </button>
                                                        {esAdmin && (
                                                            <button onClick={() => setDeleteTarget(ingreso)} title="Eliminar"
                                                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid var(--color-danger-border)', background: '#fff', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)' }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
                                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>location_on</span>
                                                        <span style={{ fontSize: '12px', color: 'var(--color-text-soft)', fontWeight: 600 }}>{ingreso.ubicacion}</span>
                                                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>•</span>
                                                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{ingreso.tipoVehiculo}</span>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{formatFecha(ingreso.fechaHoraIngreso)}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#cbd5e1' }}>person</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{ingreso.usuarioRegistro}</span>
                                                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>·</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>#{ingreso.idIngreso}</span>
                                                </div>
                                                {esIngresado && (
                                                    <button
                                                        disabled={!isOnline || salidaPendiente}
                                                        onClick={() => router.push(`/salida?placa=${encodeURIComponent(ingreso.placa)}`, 'forward', 'push')}
                                                        style={{ width: '100%', padding: '9px', borderRadius: '10px', border: 'none', background: (!isOnline || salidaPendiente) ? 'var(--color-border)' : 'var(--color-primary)', color: (!isOnline || salidaPendiente) ? 'var(--color-text-muted)' : '#fff', fontSize: '13px', fontWeight: 700, cursor: (!isOnline || salidaPendiente) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                                                        {salidaPendiente ? 'Salida pendiente de sincronización' : isOnline ? 'Registrar Salida' : 'No disponible sin conexión'}
                                                    </button>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>

                                {/* ── Desktop: tabla ─────────────────────────────── */}
                                <div className="hidden md:block px-6 pb-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-slate-100">
                                                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-text-secondary)] pl-0">Placa</TableHead>
                                                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-text-secondary)]">Estado</TableHead>
                                                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-text-secondary)]">Espacio</TableHead>
                                                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-text-secondary)]">Ingreso</TableHead>
                                                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-text-secondary)]">Operador</TableHead>
                                                <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--color-text-secondary)] text-right pr-0">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ingresos.map(ingreso => {
                                                const esIngresado     = ingreso.estadoIngreso.toUpperCase() === 'INGRESADO'
                                                const salidaPendiente = salidasPendientes.has(ingreso.idIngreso)
                                                return (
                                                    <TableRow key={ingreso.idIngreso} className="border-slate-100 hover:bg-slate-50/70">
                                                        {/* Placa */}
                                                        <TableCell className="pl-0 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--color-primary)' }}>{getTipoIcon(ingreso.tipoVehiculo)}</span>
                                                                <div>
                                                                    <p className="text-[15px] font-black tracking-widest leading-tight" style={{ color: 'var(--color-text-primary)' }}>{ingreso.placa}</p>
                                                                    <p className="text-[11px] leading-tight" style={{ color: 'var(--color-text-muted)' }}>{ingreso.tipoVehiculo} · #{ingreso.idIngreso}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Estado */}
                                                        <TableCell className="py-3">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <Badge variant={esIngresado ? 'success' : 'muted'}>
                                                                    <span className="size-1.5 rounded-full bg-current opacity-80 shrink-0" />
                                                                    {ingreso.estadoIngreso}
                                                                </Badge>
                                                                {salidaPendiente && (
                                                                    <Badge variant="warning" className="text-[10px] gap-1">
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>cloud_off</span>
                                                                        Sync pendiente
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Espacio */}
                                                        <TableCell className="text-[13px] font-medium py-3" style={{ color: 'var(--color-text-soft)' }}>
                                                            {ingreso.ubicacion}
                                                        </TableCell>

                                                        {/* Ingreso */}
                                                        <TableCell className="text-[12px] py-3" style={{ color: 'var(--color-text-muted)' }}>
                                                            {formatFecha(ingreso.fechaHoraIngreso)}
                                                        </TableCell>

                                                        {/* Operador */}
                                                        <TableCell className="text-[12px] py-3" style={{ color: 'var(--color-text-muted)' }}>
                                                            {ingreso.usuarioRegistro}
                                                        </TableCell>

                                                        {/* Acciones */}
                                                        <TableCell className="py-3 pr-0">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {esIngresado && (
                                                                    <button
                                                                        disabled={!isOnline || salidaPendiente}
                                                                        onClick={() => router.push(`/salida?placa=${encodeURIComponent(ingreso.placa)}`, 'forward', 'push')}
                                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors"
                                                                        style={{ border: 'none', background: (!isOnline || salidaPendiente) ? 'var(--color-border)' : 'var(--color-primary)', color: (!isOnline || salidaPendiente) ? 'var(--color-text-muted)' : '#fff', cursor: (!isOnline || salidaPendiente) ? 'not-allowed' : 'pointer' }}
                                                                    >
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>
                                                                        Salida
                                                                    </button>
                                                                )}
                                                                <button onClick={() => setEditTarget(ingreso)} title="Editar registro"
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                                                    style={{ border: '1px solid #dbeafe', background: '#fff', color: 'var(--color-info-light)' }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff' }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                                                </button>
                                                                {esAdmin && (
                                                                    <button onClick={() => setDeleteTarget(ingreso)} title="Eliminar registro"
                                                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                                                        style={{ border: '1px solid var(--color-danger-border)', background: '#fff', color: 'var(--color-danger)' }}
                                                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)' }}
                                                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
                                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div ref={sentinelRef} style={{ height: '1px' }} />

                                {isLoadingMore && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                                        <div style={{ width: '18px', height: '18px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
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