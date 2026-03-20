// src/pages/Salida.tsx
// HU-009: salida por escaneo de QR
// HU-010: salida manual por placa
// HU-011: resumen de cobro tras confirmar salida

import React, { useState, useEffect, useRef } from 'react'
import { IonPage, IonContent, useIonRouter } from '@ionic/react'
import { useSalida } from '../hooks/useSalida'
import { useApp } from '../hooks/useApp'
import QRScanner from '../components/QRScanner'
import BottomNav from '../components/BottomNav'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatFecha(iso: string): string {
    const d    = new Date(iso)
    const h    = d.getHours()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 || 12
    return `${d.getDate()} ${MESES[d.getMonth()]}, ${h12}:${d.getMinutes().toString().padStart(2,'0')} ${ampm}`
}

function formatCOP(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(valor)
}

function getTipoIcon(tipo: string): string {
    return tipo.toUpperCase() === 'MOTO' ? 'two_wheeler' : 'directions_car'
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

const Salida: React.FC = () => {
    const {
        modoBusqueda, setModoBusqueda,
        ingresoEncontrado, salidaConfirmada,
        isBuscando, isConfirmando,
        buscarPorId, buscarPorPlaca, confirmarSalida, resetear,
        toast, clearToast,
    } = useSalida()

    const { estadoRed } = useApp()
    const [placa, setPlaca] = useState('')
    const router = useIonRouter()

    // Capturamos router.routeInfo.search en un ref al montar.
    // router.routeInfo es un objeto de Ionic que cambia referencia en cada
    // render del router — si lo incluyéramos en el array de dependencias, el
    // efecto se volvería a ejecutar en cada navegación, disparando búsquedas
    // repetidas. Leerlo una sola vez con un ref es el patrón correcto.
    const initialSearchRef = useRef(router.routeInfo.search ?? '')

    // Si se navega desde Ingresos con ?placa=XYZ, disparar búsqueda automática
    // en el tab manual. buscarPorPlaca y setModoBusqueda son useCallback
    // estables del SalidaProvider — pueden incluirse en el array sin riesgo.
    useEffect(() => {
        const params     = new URLSearchParams(initialSearchRef.current)
        const placaParam = params.get('placa')
        if (placaParam) {
            setPlaca(placaParam)
            setModoBusqueda('manual')
            void buscarPorPlaca(placaParam)
        }
    }, [buscarPorPlaca, setModoBusqueda])

    const handleBuscarPlaca = () => {
        void buscarPorPlaca(placa)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleBuscarPlaca()
    }

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white">

                {/* Header */}
                <header style={{
                    position: 'sticky',
                    top: 'var(--network-banner-height, 0px)',
                    zIndex: 20,
                    display: 'flex', alignItems: 'center', gap: '12px',
                    borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '12px 16px',
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#137fec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
                    </div>
                    <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0, flex: 1 }}>Registrar Salida</h1>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        fontSize: '11px', fontWeight: 600,
                        color: estadoRed === 'online' ? '#059669' : estadoRed === 'offline' ? '#dc2626' : '#1e40af',
                    }}>
                        <div style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: estadoRed === 'online' ? '#10b981' : estadoRed === 'offline' ? '#ef4444' : '#3b82f6',
                        }} />
                        {estadoRed === 'online' ? 'En línea' : estadoRed === 'offline' ? 'Sin conexión' : 'Sincronizando'}
                    </div>
                </header>

                <IonContent fullscreen style={{ '--background': '#f8fafc' }}>
                    <div style={{ padding: '16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* ── Resumen de salida confirmada ─────────────────────────────── */}
                        {salidaConfirmada ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* Check de éxito */}
                                <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#16a34a' }}>check_circle</span>
                                    </div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Salida registrada</h2>
                                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>El vehículo ha salido del parqueadero</p>
                                </div>

                                {/* Tarjeta de cobro */}
                                <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                    <div style={{ background: '#137fec', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#fff' }}>{getTipoIcon(salidaConfirmada.tipoVehiculo)}</span>
                                        <div>
                                            <p style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '1px' }}>{salidaConfirmada.placa}</p>
                                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{salidaConfirmada.tipoVehiculo} · {salidaConfirmada.ubicacion}</p>
                                        </div>
                                    </div>

                                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {[
                                            { label: 'Hora de entrada', value: formatFecha(salidaConfirmada.fechaHoraIngreso) },
                                            { label: 'Hora de salida',  value: formatFecha(salidaConfirmada.fechaHoraSalida)  },
                                            { label: 'Horas cobradas',  value: `${salidaConfirmada.horasCobradas} hora${salidaConfirmada.horasCobradas !== 1 ? 's' : ''}` },
                                            { label: 'Tarifa por hora', value: formatCOP(salidaConfirmada.tarifaPorHora)      },
                                        ].map(({ label, value }) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{value}</span>
                                            </div>
                                        ))}

                                        <div style={{ borderTop: '1.5px dashed #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Total a cobrar</span>
                                            <span style={{ fontSize: '22px', fontWeight: 900, color: '#137fec' }}>{formatCOP(salidaConfirmada.valorCobrado)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Botón nueva salida */}
                                <button
                                    onClick={resetear}
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#137fec', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(19,127,236,0.3)' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                                    Registrar otra salida
                                </button>
                            </div>

                        ) : ingresoEncontrado ? (
                            /* ── Preview del vehículo antes de confirmar ──────────────────── */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                    <div style={{ background: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#137fec' }}>{getTipoIcon(ingresoEncontrado.tipoVehiculo)}</span>
                                        <div>
                                            <p style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '1px' }}>{ingresoEncontrado.placa}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{ingresoEncontrado.tipoVehiculo} · Espacio {ingresoEncontrado.ubicacion}</p>
                                        </div>
                                        <div style={{ marginLeft: 'auto', background: '#ecfdf5', borderRadius: '9999px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>ACTIVO</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>Hora de entrada</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{formatFecha(ingresoEncontrado.fechaHoraIngreso)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>Operador</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{ingresoEncontrado.usuarioRegistro}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '13px', color: '#64748b' }}>ID tiquete</span>
                                            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>#{String(ingresoEncontrado.idIngreso).padStart(9,'0')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={resetear}
                                        style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => void confirmarSalida()}
                                        disabled={isConfirmando}
                                        style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isConfirmando ? '#93c5fd' : '#137fec', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isConfirmando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(19,127,236,0.3)' }}
                                    >
                                        {isConfirmando
                                            ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Confirmando...</>
                                            : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>Confirmar salida</>
                                        }
                                    </button>
                                </div>
                                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                            </div>

                        ) : (
                            /* ── Formulario de búsqueda ───────────────────────────────────── */
                            <>
                                {/* Tabs QR / Manual */}
                                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                                    {([['qr', 'qr_code_scanner', 'Por QR'], ['manual', 'keyboard', 'Por Placa']] as const).map(([modo, icon, label]) => (
                                        <button
                                            key={modo}
                                            onClick={() => setModoBusqueda(modo)}
                                            style={{ flex: 1, padding: '10px 8px', borderRadius: '8px', border: 'none', background: modoBusqueda === modo ? '#fff' : 'transparent', color: modoBusqueda === modo ? '#137fec' : '#64748b', fontWeight: modoBusqueda === modo ? 700 : 500, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: modoBusqueda === modo ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Contenido según modo */}
                                {modoBusqueda === 'qr' ? (
                                    <QRScanner onDetected={id => void buscarPorId(id)} isLoading={isBuscando} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                                                Placa del vehículo
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={placa}
                                                    onChange={e => setPlaca(e.target.value.toUpperCase())}
                                                    onKeyDown={handleKeyDown}
                                                    maxLength={8}
                                                    placeholder="ABC-1234"
                                                    disabled={isBuscando}
                                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '18px', fontWeight: 700, color: '#0f172a', outline: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}
                                                    onFocus={e => { e.target.style.borderColor = '#137fec' }}
                                                    onBlur={e  => { e.target.style.borderColor = '#e2e8f0' }}
                                                />
                                                <button
                                                    onClick={handleBuscarPlaca}
                                                    disabled={isBuscando || !placa.trim()}
                                                    style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', background: isBuscando || !placa.trim() ? '#e2e8f0' : '#137fec', color: isBuscando || !placa.trim() ? '#94a3b8' : '#fff', fontWeight: 700, cursor: isBuscando || !placa.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                >
                                                    {isBuscando
                                                        ? <div style={{ width: '18px', height: '18px', border: '2px solid #94a3b8', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                        : <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>}
                                                </button>
                                            </div>
                                        </div>
                                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </IonContent>

                <BottomNav />

                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
            </div>
        </IonPage>
    )
}

export default Salida