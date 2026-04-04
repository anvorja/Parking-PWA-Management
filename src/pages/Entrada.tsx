// src/pages/Entrada.tsx
// HU-006: Registrar ingreso de vehículo
// HU-007: Generación de tiquete con QR + exportación a PDF (window.print)
// HU-008: QR vinculado al idIngreso (react-qr-code, ya implementado)

import React, { useState, useEffect, useRef } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import QRCode from 'react-qr-code';
import BottomNav from '../components/BottomNav';
import { useSidebarOffset, useSidebarLeft } from '../hooks/useSidebarOffset';
import { ingresoService, RegistrarIngresoRequest, IngresoVehiculoResponse, TipoVehiculo } from '../services/ingresoService';
import { refDataService, UbicacionRef, TipoVehiculoRef, iconoParaTipo } from '../services/refDataService';
import { useIngresos } from '../hooks/useIngresos';
import { useApp } from '../hooks/useApp';

// ─── Fallbacks ────────────────────────────────────────────────────────────────

const TIPOS_FALLBACK: TipoVehiculoRef[] = [
    { id: 1, nombre: 'CARRO', icono: 'directions_car' },
    { id: 2, nombre: 'MOTO',  icono: 'two_wheeler' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatFecha(iso: string): string {
    const d    = new Date(iso)
    const h    = d.getHours()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 || 12
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}, ${h12}:${d.getMinutes().toString().padStart(2,'0')} ${ampm}`
}

// ─── CSS de impresión ─────────────────────────────────────────────────────────
// Se inyecta en <head> solo mientras el modal de tiquete está abierto.
// Oculta toda la app y muestra solo el div#ticket-print-area.

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #ticket-print-area,
  #ticket-print-area * { visibility: visible !important; }
  #ticket-print-area {
    position: fixed !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: #fff !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  #ticket-print-card {
    width: 320px !important;
    border: 1px solid var(--color-border) !important;
    border-radius: 12px !important;
    padding: 24px !important;
    font-family: Arial, sans-serif !important;
    box-shadow: none !important;
  }
  @page { margin: 0; size: A6 portrait; }
}
`

// ─── Componente ───────────────────────────────────────────────────────────────

const Entrada: React.FC = () => {
    const { registrarIngresoConOutbox } = useIngresos()
    const { estadoRed } = useApp()
    const sidebarOffset = useSidebarOffset()
    const sidebarLeft   = useSidebarLeft()

    const [tipos, setTipos]             = useState<TipoVehiculoRef[]>(TIPOS_FALLBACK)
    const [ubicaciones, setUbicaciones] = useState<UbicacionRef[]>([])
    const [loadingUbicaciones, setLoadingUbicaciones] = useState(true)

    const [placa, setPlaca]                         = useState('')
    const [selectedTipo, setSelectedTipo]           = useState<number>(TIPOS_FALLBACK[0].id)
    const [selectedUbicacion, setSelectedUbicacion] = useState<number | null>(null)
    const [isSubmitting, setIsSubmitting]           = useState(false)
    const [ticketData, setTicketData]               = useState<IngresoVehiculoResponse | null>(null)
    const [toast, setToast]                         = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [isPrinting, setIsPrinting]               = useState(false)

    const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<'TODOS' | 'DISPONIBLES'>('TODOS')
    const [filtroEspacioMoto, setFiltroEspacioMoto]       = useState<'TODOS' | 'MOTO' | 'CARRO'>('MOTO')

    // Referencia al <style> de impresión inyectado en <head>
    const printStyleRef = useRef<HTMLStyleElement | null>(null)

    // ── Inyectar / remover estilos de impresión ───────────────────────────────

    useEffect(() => {
        if (ticketData) {
            const style = document.createElement('style')
            style.innerHTML = PRINT_STYLES
            document.head.appendChild(style)
            printStyleRef.current = style
        } else {
            if (printStyleRef.current) {
                document.head.removeChild(printStyleRef.current)
                printStyleRef.current = null
            }
        }
        return () => {
            if (printStyleRef.current) {
                document.head.removeChild(printStyleRef.current)
                printStyleRef.current = null
            }
        }
    }, [ticketData])

    // ── Cargar datos de referencia ────────────────────────────────────────────

    useEffect(() => {
        const cargarRefData = async () => {
            setLoadingUbicaciones(true)
            try {
                const [tiposCache, ubicacionesCache] = await Promise.all([
                    refDataService.getTiposVehiculo(),
                    refDataService.getUbicaciones(),
                ])

                if (tiposCache && tiposCache.length > 0) {
                    setTipos(tiposCache)
                    setSelectedTipo(tiposCache[0].id)
                }

                if (ubicacionesCache && ubicacionesCache.length > 0) {
                    setUbicaciones(ubicacionesCache)
                    // Removido return para forzar el fetching en background si hay conexión
                }

                try {
                    const [tiposRed, ubicacionesRed] = await Promise.all([
                        ingresoService.getTiposVehiculo(),
                        ingresoService.getUbicaciones(),
                    ])

                    setUbicaciones(ubicacionesRed)
                    if (tiposRed.length > 0) {
                        const tiposConIcono: TipoVehiculoRef[] = tiposRed.map((t: TipoVehiculo) => ({
                            ...t, icono: iconoParaTipo(t.nombre),
                        }))
                        setTipos(tiposConIcono)
                        if (!tiposCache || tiposCache.length === 0) {
                            setSelectedTipo(tiposConIcono[0].id)
                        }
                    }

                    await refDataService.syncToIndexedDB()
                } catch (e) {
                    console.warn('[Entrada] Omitiendo fetch en red, usando caché (offline):', e)
                }
            } catch (err) {
                console.error('[Entrada] Error cargando datos de referencia:', err)
            } finally {
                setLoadingUbicaciones(false)
            }
        }
        void cargarRefData()
    }, [])

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000)
            return () => clearTimeout(t)
        }
    }, [toast])

    // Vehicle type selection
    const idMoto = tipos.find(t => t.nombre.toUpperCase() === 'MOTO')?.id ?? 2;
    const idCarro = tipos.find(t => t.nombre.toUpperCase() === 'CARRO')?.id ?? 1;
    const isMoto = selectedTipo === idMoto;
    
    // 1. Filter by location type (Nativo)
    let ubicacionesPorTipo = ubicaciones;
    if (isMoto) {
        if (filtroEspacioMoto === 'MOTO') {
            ubicacionesPorTipo = ubicaciones.filter(u => u.idTipoVehiculoNativo === idMoto);
        } else if (filtroEspacioMoto === 'CARRO') {
            ubicacionesPorTipo = ubicaciones.filter(u => u.idTipoVehiculoNativo === idCarro);
        } else {
            ubicacionesPorTipo = ubicaciones.filter(u => u.idTipoVehiculoNativo === idMoto || u.idTipoVehiculoNativo === idCarro);
        }
    } else {
        ubicacionesPorTipo = ubicaciones.filter(u => u.idTipoVehiculoNativo === selectedTipo);
    }
    
    // 2. Count libres (based on the type constraint above)
    const libres = ubicacionesPorTipo.filter(u => u.disponible).length;

    // 3. Apply availability filter for viewing
    let ubicacionesVisibles = ubicacionesPorTipo;
    if (filtroDisponibilidad === 'DISPONIBLES') {
        ubicacionesVisibles = ubicacionesVisibles.filter(u => u.disponible);
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlaca(e.target.value.toUpperCase())
    }

    const handleSubmit = async () => {
        if (!placa.trim()) {
            setToast({ message: 'Ingresa la placa del vehículo', type: 'error' })
            return
        }
        if (!selectedUbicacion) {
            setToast({ message: 'Selecciona un espacio de parqueo', type: 'error' })
            return
        }

        const data: RegistrarIngresoRequest = {
            placa: placa.trim(),
            idTipoVehiculo: selectedTipo,
            idUbicacion: selectedUbicacion,
            // Capturar la hora exacta aquí para que, si se encola offline,
            // el backend registre el momento real del ingreso y no el de la sync.
            fechaHoraIngreso: new Date().toISOString(),
        }

        try {
            setIsSubmitting(true)

            // Primero consultar si hay red a través del contexto.
            // Si offline → registrarIngresoConOutbox encola la operación en IDB
            // y devuelve 'encolado'. El toast ya lo muestra IngresoProvider.
            // Si online  → devuelve 'online' y procedemos con la llamada normal.
            const modo = await registrarIngresoConOutbox(data)

            if (modo === 'online') {
                const response = await ingresoService.registrarIngreso(data)
                setTicketData(response)
            } else {
                // Offline: limpiar el formulario para el siguiente ingreso.
                // No hay tiquete porque aún no tenemos respuesta del backend.
                setPlaca('')
                setSelectedUbicacion(null)
                setSelectedTipo(tipos[0]?.id ?? TIPOS_FALLBACK[0].id)
                setToast({
                    message: 'Sin conexión — el ingreso se registrará al recuperar la red',
                    type: 'success',
                })
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al registrar el ingreso'
            setToast({ message: msg, type: 'error' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCloseTicket = async () => {
        setTicketData(null)
        setPlaca('')
        setSelectedUbicacion(null)
        // No reseteamos selectedTipo para mayor comodidad de carga de datos secuencial
        setToast({ message: 'Tiquete generado exitosamente', type: 'success' })

        // Refrescar las ubicaciones al vuelo si estamos online
        try {
            const ubicacionesActualizadas = await ingresoService.getUbicaciones()
            setUbicaciones(ubicacionesActualizadas)
            void refDataService.syncToIndexedDB()
        } catch (error) {
            console.warn('[Entrada] No se pudieron sincronizar espacios recién ocupados offline:', error)
        }
    }

    // ── HU-007: Exportar a PDF ────────────────────────────────────────────────
    // Usa window.print(). El navegador ofrece "Guardar como PDF" como destino.
    // Los estilos @media print ya están inyectados cuando el modal está abierto.

    const handleDescargarPDF = () => {
        setIsPrinting(true)
        // Pequeño delay para que el estado de carga se renderice antes de print
        setTimeout(() => {
            window.print()
            setIsPrinting(false)
        }, 100)
    }

    // ── HU-007: Imprimir ──────────────────────────────────────────────────────

    const handleImprimir = () => {
        handleDescargarPDF() // mismo mecanismo — el usuario elige destino en el diálogo
    }

    return (
        <IonPage>
            <div className={`relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-white selection:bg-primary/20 ${sidebarOffset}`}>

                {/* Header */}
                <header style={{
                    position: 'sticky',
                    top: 'var(--network-banner-height, 0px)',
                    zIndex: 20,
                    display: 'flex', alignItems: 'center', gap: '12px',
                    borderBottom: '1px solid var(--color-border)', background: '#fff', padding: '12px 16px',
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                    </div>
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, flex: 1 }}>Registrar Ingreso</h1>
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

                <IonContent scrollY={false} className="app-bg">
                    <div style={{ height: '100%', boxSizing: 'border-box', padding: '16px 16px 140px 16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                        {/* Placa */}
                        <section>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                Placa del Vehículo
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" value={placa} onChange={handlePlacaChange} maxLength={8} placeholder="ABC-1234"
                                       style={{ width: '100%', fontSize: '24px', fontWeight: 900, textAlign: 'center', padding: '12px 50px 12px 16px', borderRadius: '10px', border: '2px solid #cbd5e1', background: '#fff', color: 'var(--color-text-primary)', outline: 'none', textTransform: 'uppercase', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                       onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                                       onBlur={e  => { e.target.style.borderColor = '#cbd5e1' }} />
                                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>photo_camera</span>
                                </div>
                            </div>
                        </section>

                        {/* Tipo de Vehículo */}
                        <section>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                Tipo de Vehículo
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {tipos.map((tipo: TipoVehiculoRef) => {
                                    const isActive = selectedTipo === tipo.id
                                    return (
                                        <button key={tipo.id}
                                                onClick={() => { 
                                                    setSelectedTipo(tipo.id); 
                                                    setSelectedUbicacion(null);
                                                    if (tipo.nombre.toUpperCase() !== 'MOTO') setFiltroEspacioMoto('MOTO');
                                                }}
                                                style={{ flex: 1, padding: '10px 8px', borderRadius: '10px', border: isActive ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', background: '#fff', color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.15s', outline: 'none' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{tipo.icono ?? iconoParaTipo(tipo.nombre)}</span>
                                            <span>{tipo.nombre.charAt(0) + tipo.nombre.slice(1).toLowerCase()}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>

                        {/* Seleccionar Espacio */}
                        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Seleccionar Espacio
                                </label>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(19,127,236,0.1)', padding: '4px 10px', borderRadius: '6px' }}>
                                    {libres} Libres
                                </span>
                            </div>

                            {/* Filtros Estilo Ubicaciones */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {/* Group 1: Tipo Espacio (Only if MOTO) */}
                                {isMoto && (
                                    <>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {(['TODOS', 'CARRO', 'MOTO'] as const).map(tipo => {
                                                const isActive = filtroEspacioMoto === tipo;
                                                return (
                                                    <button key={tipo}
                                                            onClick={() => { setFiltroEspacioMoto(tipo); setSelectedUbicacion(null); }}
                                                            style={{ 
                                                                padding: '6px 14px', 
                                                                borderRadius: '20px', 
                                                                border: isActive ? '1px solid var(--color-info-light)' : '1px solid var(--color-border)', 
                                                                background: isActive ? 'var(--color-info-light)' : '#fff', 
                                                                color: isActive ? '#fff' : 'var(--color-info)', 
                                                                fontSize: '12px', 
                                                                fontWeight: 600, 
                                                                cursor: 'pointer', 
                                                                whiteSpace: 'nowrap',
                                                                transition: 'all 0.2s'
                                                            }}>
                                                        {tipo === 'TODOS' ? 'Todos' : tipo === 'CARRO' ? 'Carro' : 'Moto'}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <div style={{ width: '1px', height: '20px', background: '#cbd5e1', margin: '0 4px', flexShrink: 0 }} />
                                    </>
                                )}

                                {/* Group 2: Disponibilidad */}
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {(['TODOS', 'DISPONIBLES'] as const).map(f => {
                                        const isActive = filtroDisponibilidad === f;
                                        const label = f === 'TODOS' ? 'Todos' : 'Disponible';

                                        return (
                                            <button key={f}
                                                    onClick={() => { setFiltroDisponibilidad(f); setSelectedUbicacion(null); }}
                                                    style={{ 
                                                        padding: '6px 14px', 
                                                        borderRadius: '20px', 
                                                        border: isActive ? '1px solid var(--color-info-light)' : '1px solid var(--color-border)', 
                                                        background: isActive ? 'var(--color-info-light)' : '#fff', 
                                                        color: isActive ? '#fff' : 'var(--color-info)', 
                                                        fontSize: '12px', 
                                                        fontWeight: 600, 
                                                        cursor: 'pointer', 
                                                        whiteSpace: 'nowrap',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                {label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {loadingUbicaciones ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '24px 0', color: 'var(--color-text-muted)' }}>
                                    <div style={{ width: '18px', height: '18px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                                    <span style={{ fontSize: '13px' }}>Cargando espacios...</span>
                                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                </div>
                            ) : ubicaciones.length === 0 ? (
                                <p style={{ fontSize: '13px', color: 'var(--color-danger)', textAlign: 'center', padding: '16px 0' }}>
                                    No se pudieron cargar los espacios. Verifica la conexión.
                                </p>
                            ) : (
                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', margin: '-4px', padding: '4px 8px 4px 4px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', paddingBottom: '16px' }}>
                                        {ubicacionesVisibles.map((ub: UbicacionRef) => {
                                            const isSelected = selectedUbicacion === ub.id
                                            const isDisabled = !ub.disponible
                                            return (
                                                <button key={ub.id} disabled={isDisabled} onClick={() => setSelectedUbicacion(ub.id)}
                                                        style={{ padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: isSelected ? '2px solid var(--color-primary)' : isDisabled ? '2px solid var(--color-border)' : '2px solid var(--color-border)', background: isSelected ? 'var(--color-primary)' : isDisabled ? 'var(--color-surface-subtle)' : '#fff', color: isSelected ? '#fff' : isDisabled ? 'var(--color-text-secondary)' : '#334155', cursor: isDisabled ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'all 0.15s', outline: 'none', margin: 0, boxShadow: isSelected ? '0 4px 14px rgba(19,127,236,0.3)' : 'none', opacity: isDisabled ? 0.45 : 1 }}>
                                                    <span style={{ fontSize: '10px', opacity: isSelected ? 0.8 : 0.6 }}>{ub.nombre.charAt(0)}</span>
                                                    <span style={{ fontSize: '18px', textDecoration: isDisabled ? 'line-through' : 'none' }}>{ub.nombre.slice(1)}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </IonContent>

                {/* Botón Generar Tiquete */}
                <div style={{ position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))', left: sidebarLeft, right: 0, padding: '12px 16px', background: 'linear-gradient(to top, #fff 80%, transparent)', zIndex: 20 }}>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 6px 20px rgba(19,127,236,0.35)', transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1, outline: 'none', margin: 0 }}
                            onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.boxShadow = '0 8px 28px rgba(19,127,236,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(19,127,236,0.35)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                        {isSubmitting
                            ? <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            : <><span className="material-symbols-outlined" style={{ fontSize: '24px' }}>qr_code_2</span>Generar Tiquete</>}
                    </button>
                </div>

                <BottomNav />

                {/* ===== TICKET MODAL ===== */}
                {ticketData && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#f0f4f8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Header del modal */}
                        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--color-border)' }}>
                            <button onClick={handleCloseTicket} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: '4px', outline: 'none' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
                            </button>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Tiquete Generado</h2>
                            <div style={{ width: '32px' }} /> {/* spacer */}
                        </header>

                        {/* Cuerpo del tiquete */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>

                            {/* ─── Área imprimible — id requerido por @media print ─── */}
                            <div id="ticket-print-area">
                                <div id="ticket-print-card" style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>

                                    {/* Cabecera del tiquete */}
                                    <div style={{ textAlign: 'center', padding: '20px 20px 16px', borderBottom: '1px solid var(--color-surface-subtle)' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0ecff', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontWeight: 800, fontSize: '22px' }}>P</div>
                                        <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-primary)' }}>Estacionamiento Central</div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Parqueadero Universitario</div>
                                    </div>

                                    {/* Placa + Ubicación */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Placa</div>
                                            <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '2px' }}>{ticketData.placa}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Espacio</div>
                                            <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-primary)' }}>{ticketData.ubicacion}</div>
                                        </div>
                                    </div>

                                    {/* Tipo + Operador */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 14px' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Tipo</div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-soft)' }}>{ticketData.tipoVehiculo}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Operador</div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-soft)' }}>{ticketData.usuarioRegistro}</div>
                                        </div>
                                    </div>

                                    {/* Hora de entrada */}
                                    <div style={{ margin: '0 20px 16px', background: 'var(--color-surface-alt)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Hora de Entrada</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatFecha(ticketData.fechaHoraIngreso)}</div>
                                    </div>

                                    {/* QR Code — HU-008 */}
                                    <div style={{ margin: '0 20px 16px', background: 'var(--color-surface-alt)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '3px', marginBottom: '16px' }}>CÓDIGO QR</div>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <QRCode
                                                value={JSON.stringify({
                                                    id:        ticketData.idIngreso,
                                                    placa:     ticketData.placa,
                                                    ubicacion: ticketData.ubicacion,
                                                    tipo:      ticketData.tipoVehiculo,
                                                    entrada:   ticketData.fechaHoraIngreso,
                                                })}
                                                size={160}
                                                level="M"
                                                style={{ borderRadius: '8px' }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
                                            Escanear para verificar el vehículo
                                        </div>
                                    </div>

                                    {/* Separador punteado + ID */}
                                    <div style={{ margin: '0 16px', borderTop: '2px dashed var(--color-border)' }} />
                                    <div style={{ textAlign: 'center', padding: '12px 20px 20px' }}>
                                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-muted)', letterSpacing: '2px' }}>
                                            ID: #{String(ticketData.idIngreso).padStart(9, '0')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* ─── Fin área imprimible ─── */}

                        </div>

                        {/* Botones de acción — HU-007 */}
                        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: '#fff', borderTop: '1px solid var(--color-border)' }}>
                            {/* Descargar PDF */}
                            <button
                                onClick={handleDescargarPDF}
                                disabled={isPrinting}
                                style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: isPrinting ? '#93c5fd' : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isPrinting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(19,127,236,0.3)', outline: 'none', transition: 'all 0.2s' }}
                                onMouseEnter={e => { if (!isPrinting) e.currentTarget.style.boxShadow = '0 6px 20px rgba(19,127,236,0.4)' }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(19,127,236,0.3)' }}
                            >
                                {isPrinting
                                    ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Preparando...</>
                                    : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span>Guardar PDF</>}
                            </button>
                            {/* Imprimir */}
                            <button
                                onClick={handleImprimir}
                                disabled={isPrinting}
                                style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: '#334155', fontSize: '14px', fontWeight: 700, cursor: isPrinting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', outline: 'none', transition: 'all 0.2s' }}
                                onMouseEnter={e => { if (!isPrinting) e.currentTarget.style.background = 'var(--color-surface-subtle)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>Imprimir
                            </button>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '14px 20px', minWidth: '260px', maxWidth: '380px', border: toast.type === 'success' ? '1px solid var(--color-success-border)' : '1px solid var(--color-danger-border-light)', animation: 'slideInRight 0.35s ease-out' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: toast.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: toast.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-dark)' }}>
                                {toast.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{toast.message}</span>
                        <button onClick={() => setToast(null)}
                                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px', display: 'flex', alignItems: 'center', outline: 'none', borderRadius: '50%', width: '28px', height: '28px', justifyContent: 'center', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-subtle)'; e.currentTarget.style.color = 'var(--color-text-soft)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                    </div>
                )}
            </div>
        </IonPage>
    )
}

export default Entrada