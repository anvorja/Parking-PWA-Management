// src/pages/Entrada.tsx
// HU-006: Registrar ingreso de vehículo
// HU-007: Generación de tiquete con QR + exportación a PDF (window.print)
// HU-008: QR vinculado al idIngreso (react-qr-code, ya implementado)

import React, { useState, useEffect, useRef } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import QRCode from 'react-qr-code';
import BottomNav from '../components/BottomNav';
import { ingresoService, RegistrarIngresoRequest, IngresoVehiculoResponse } from '../services/ingresoService';
import { refDataService, UbicacionRef, TipoVehiculoRef, iconoParaTipo } from '../services/refDataService';

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
    border: 1px solid #e2e8f0 !important;
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
                    return
                }

                const [tiposRed, ubicacionesRed] = await Promise.all([
                    ingresoService.getTiposVehiculo(),
                    ingresoService.getUbicaciones(),
                ])

                setUbicaciones(ubicacionesRed)
                if (tiposRed.length > 0) {
                    const tiposConIcono: TipoVehiculoRef[] = tiposRed.map(t => ({
                        ...t, icono: iconoParaTipo(t.nombre),
                    }))
                    setTipos(tiposConIcono)
                    setSelectedTipo(tiposConIcono[0].id)
                }

                await refDataService.syncToIndexedDB()
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

    const libres = ubicaciones.filter(u => u.disponible).length

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
        }

        try {
            setIsSubmitting(true)
            const response = await ingresoService.registrarIngreso(data)
            setTicketData(response)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al registrar el ingreso'
            setToast({ message: msg, type: 'error' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCloseTicket = () => {
        setTicketData(null)
        setPlaca('')
        setSelectedUbicacion(null)
        setSelectedTipo(tipos[0]?.id ?? TIPOS_FALLBACK[0].id)
        setToast({ message: 'Tiquete generado exitosamente', type: 'success' })
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
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white selection:bg-primary/20">

                {/* Header */}
                <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '12px 16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#137fec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                    </div>
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Registrar Ingreso</h1>
                </header>

                <IonContent fullscreen style={{ '--background': '#f8fafc' }}>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '140px' }}>

                        {/* Placa */}
                        <section>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                Placa del Vehículo
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" value={placa} onChange={handlePlacaChange} maxLength={8} placeholder="ABC-1234"
                                       style={{ width: '100%', fontSize: '24px', fontWeight: 900, textAlign: 'center', padding: '12px 50px 12px 16px', borderRadius: '10px', border: '2px solid #cbd5e1', background: '#fff', color: '#0f172a', outline: 'none', textTransform: 'uppercase', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                       onFocus={e => { e.target.style.borderColor = '#137fec' }}
                                       onBlur={e  => { e.target.style.borderColor = '#cbd5e1' }} />
                                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>photo_camera</span>
                                </div>
                            </div>
                        </section>

                        {/* Tipo de Vehículo */}
                        <section>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                Tipo de Vehículo
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {tipos.map((tipo: TipoVehiculoRef) => {
                                    const isActive = selectedTipo === tipo.id
                                    return (
                                        <button key={tipo.id}
                                                onClick={() => { setSelectedTipo(tipo.id); setSelectedUbicacion(null) }}
                                                style={{ flex: 1, padding: '10px 8px', borderRadius: '10px', border: isActive ? '2px solid #137fec' : '2px solid #e2e8f0', background: '#fff', color: isActive ? '#137fec' : '#64748b', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.15s', outline: 'none' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{tipo.icono ?? iconoParaTipo(tipo.nombre)}</span>
                                            <span>{tipo.nombre.charAt(0) + tipo.nombre.slice(1).toLowerCase()}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>

                        {/* Seleccionar Espacio */}
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Seleccionar Espacio
                                </label>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#137fec', background: 'rgba(19,127,236,0.1)', padding: '4px 10px', borderRadius: '6px' }}>
                                    {libres} Libres
                                </span>
                            </div>

                            {loadingUbicaciones ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '24px 0', color: '#94a3b8' }}>
                                    <div style={{ width: '18px', height: '18px', border: '2px solid #e2e8f0', borderTopColor: '#137fec', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                                    <span style={{ fontSize: '13px' }}>Cargando espacios...</span>
                                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                </div>
                            ) : ubicaciones.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#ef4444', textAlign: 'center', padding: '16px 0' }}>
                                    No se pudieron cargar los espacios. Verifica la conexión.
                                </p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {ubicaciones.map((ub: UbicacionRef) => {
                                        const isSelected = selectedUbicacion === ub.id
                                        const isDisabled = !ub.disponible
                                        return (
                                            <button key={ub.id} disabled={isDisabled} onClick={() => setSelectedUbicacion(ub.id)}
                                                    style={{ padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: isSelected ? '2px solid #137fec' : isDisabled ? '2px solid #f1f5f9' : '2px solid #e2e8f0', background: isSelected ? '#137fec' : isDisabled ? '#f1f5f9' : '#fff', color: isSelected ? '#fff' : isDisabled ? '#94a3b8' : '#334155', cursor: isDisabled ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'all 0.15s', outline: 'none', margin: 0, boxShadow: isSelected ? '0 4px 14px rgba(19,127,236,0.3)' : 'none' }}>
                                                <span style={{ fontSize: '10px', opacity: isSelected ? 0.8 : 0.6 }}>{ub.nombre.charAt(0)}</span>
                                                <span style={{ fontSize: '18px', textDecoration: isDisabled ? 'line-through' : 'none' }}>{ub.nombre.slice(1)}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </IonContent>

                {/* Botón Generar Tiquete */}
                <div style={{ position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(to top, #fff 80%, transparent)', zIndex: 20 }}>
                    <button onClick={handleSubmit} disabled={isSubmitting}
                            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #137fec 0%, #0b63be 100%)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 6px 20px rgba(19,127,236,0.35)', transition: 'all 0.2s', opacity: isSubmitting ? 0.7 : 1, outline: 'none', margin: 0 }}
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
                        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                            <button onClick={handleCloseTicket} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: '4px', outline: 'none' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
                            </button>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Tiquete Generado</h2>
                            <div style={{ width: '32px' }} /> {/* spacer */}
                        </header>

                        {/* Cuerpo del tiquete */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>

                            {/* ─── Área imprimible — id requerido por @media print ─── */}
                            <div id="ticket-print-area">
                                <div id="ticket-print-card" style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>

                                    {/* Cabecera del tiquete */}
                                    <div style={{ textAlign: 'center', padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0ecff', color: '#137fec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontWeight: 800, fontSize: '22px' }}>P</div>
                                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>Estacionamiento Central</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Parqueadero Universitario</div>
                                    </div>

                                    {/* Placa + Ubicación */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Placa</div>
                                            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', letterSpacing: '2px' }}>{ticketData.placa}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Espacio</div>
                                            <div style={{ fontSize: '26px', fontWeight: 900, color: '#137fec' }}>{ticketData.ubicacion}</div>
                                        </div>
                                    </div>

                                    {/* Tipo + Operador */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 14px' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Tipo</div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{ticketData.tipoVehiculo}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Operador</div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{ticketData.usuarioRegistro}</div>
                                        </div>
                                    </div>

                                    {/* Hora de entrada */}
                                    <div style={{ margin: '0 20px 16px', background: '#f8fafc', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Hora de Entrada</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{formatFecha(ticketData.fechaHoraIngreso)}</div>
                                    </div>

                                    {/* QR Code — HU-008 */}
                                    <div style={{ margin: '0 20px 16px', background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#137fec', letterSpacing: '3px', marginBottom: '16px' }}>CÓDIGO QR</div>
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
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>
                                            Escanear para verificar el vehículo
                                        </div>
                                    </div>

                                    {/* Separador punteado + ID */}
                                    <div style={{ margin: '0 16px', borderTop: '2px dashed #e2e8f0' }} />
                                    <div style={{ textAlign: 'center', padding: '12px 20px 20px' }}>
                                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', letterSpacing: '2px' }}>
                                            ID: #{String(ticketData.idIngreso).padStart(9, '0')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* ─── Fin área imprimible ─── */}

                        </div>

                        {/* Botones de acción — HU-007 */}
                        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
                            {/* Descargar PDF */}
                            <button
                                onClick={handleDescargarPDF}
                                disabled={isPrinting}
                                style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: isPrinting ? '#93c5fd' : 'linear-gradient(135deg, #137fec 0%, #0b63be 100%)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isPrinting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(19,127,236,0.3)', outline: 'none', transition: 'all 0.2s' }}
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
                                style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: '14px', fontWeight: 700, cursor: isPrinting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', outline: 'none', transition: 'all 0.2s' }}
                                onMouseEnter={e => { if (!isPrinting) e.currentTarget.style.background = '#f1f5f9' }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>Imprimir
                            </button>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '14px 20px', minWidth: '260px', maxWidth: '380px', border: toast.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca', animation: 'slideInRight 0.35s ease-out' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: toast.type === 'success' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: toast.type === 'success' ? '#16a34a' : '#dc2626' }}>
                                {toast.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{toast.message}</span>
                        <button onClick={() => setToast(null)}
                                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', alignItems: 'center', outline: 'none', borderRadius: '50%', width: '28px', height: '28px', justifyContent: 'center', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                    </div>
                )}
            </div>
        </IonPage>
    )
}

export default Entrada