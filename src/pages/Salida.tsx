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
import { useSidebarOffset } from '../hooks/useSidebarOffset'
import { RotateCcw, ArrowLeft } from 'lucide-react'

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
        <div style={{ position: 'fixed', top: '16px', left: '16px', right: '16px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '14px 16px', border: type === 'success' ? '1px solid var(--color-success-border)' : '1px solid var(--color-danger-border-light)', animation: 'slideDown 0.3s ease-out' }}>
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

const Salida: React.FC = () => {
    const {
        modoBusqueda, setModoBusqueda,
        ingresoEncontrado, salidaConfirmada,
        isBuscando, isConfirmando,
        buscarPorUuid, buscarPorPlaca, confirmarSalida, resetear,
        toast, clearToast,
    } = useSalida()

    const { estadoRed } = useApp()
    const sidebarOffset = useSidebarOffset()
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
            <div className={`relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-white ${sidebarOffset}`}>

                {/* Header */}
                <header style={{
                    position: 'sticky',
                    top: 'var(--network-banner-height, 0px)',
                    zIndex: 20,
                    display: 'flex', alignItems: 'center', gap: '12px',
                    borderBottom: '1px solid var(--color-border)', background: '#fff', padding: '12px 16px',
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
                    </div>
                    <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, flex: 1 }}>Registrar Salida</h1>
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
                    <div style={{ padding: '16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

                        {/* ── Resumen de salida confirmada ─────────────────────────────── */}
                        {salidaConfirmada ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* Check de éxito */}
                                <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-success-text)' }}>check_circle</span>
                                    </div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Salida registrada</h2>
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>El vehículo ha salido del parqueadero</p>
                                </div>

                                {/* Tarjeta de cobro */}
                                <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                    <div style={{ background: 'var(--color-primary)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</span>
                                            </div>
                                        ))}

                                        <div style={{ borderTop: '1.5px dashed var(--color-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Total a cobrar</span>
                                            <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-primary)' }}>{formatCOP(salidaConfirmada.valorCobrado)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Acciones post-salida */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => router.push('/home', 'root', 'replace')}
                                        style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <ArrowLeft size={18} />
                                        Regresar
                                    </button>
                                    <button
                                        onClick={resetear}
                                        style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(19,127,236,0.3)' }}
                                    >
                                        <RotateCcw size={18} />
                                        Registrar otra salida
                                    </button>
                                </div>
                            </div>

                        ) : ingresoEncontrado ? (
                            /* ── Preview del vehículo antes de confirmar ──────────────────── */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid var(--color-border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                    <div style={{ background: 'var(--color-surface-alt)', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-primary)' }}>{getTipoIcon(ingresoEncontrado.tipoVehiculo)}</span>
                                        <div>
                                            <p style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '1px' }}>{ingresoEncontrado.placa}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>{ingresoEncontrado.tipoVehiculo} · Espacio {ingresoEncontrado.ubicacion}</p>
                                        </div>
                                        <div style={{ marginLeft: 'auto', background: 'var(--color-success-bg-soft)', borderRadius: '9999px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} />
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success-dark)' }}>ACTIVO</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Hora de entrada</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatFecha(ingresoEncontrado.fechaHoraIngreso)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Operador</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ingresoEncontrado.usuarioRegistro}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>REF tiquete</span>
                                            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{ingresoEncontrado.uuid.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={resetear}
                                        style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: '#fff', color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => void confirmarSalida()}
                                        disabled={isConfirmando}
                                        style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isConfirmando ? '#93c5fd' : 'var(--color-primary)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isConfirmando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(19,127,236,0.3)' }}
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
                                <div style={{ display: 'flex', background: 'var(--color-surface-subtle)', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                                    {([['qr', 'qr_code_scanner', 'Por QR'], ['manual', 'keyboard', 'Por Placa']] as const).map(([modo, icon, label]) => (
                                        <button
                                            key={modo}
                                            onClick={() => setModoBusqueda(modo)}
                                            style={{ flex: 1, padding: '10px 8px', borderRadius: '8px', border: 'none', background: modoBusqueda === modo ? '#fff' : 'transparent', color: modoBusqueda === modo ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: modoBusqueda === modo ? 700 : 500, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: modoBusqueda === modo ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Contenido según modo */}
                                {modoBusqueda === 'qr' ? (
                                    <QRScanner onDetected={uuid => void buscarPorUuid(uuid)} isLoading={isBuscando} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
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
                                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface-alt)', fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', outline: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}
                                                    onFocus={e => { e.target.style.borderColor = 'var(--color-primary)' }}
                                                    onBlur={e  => { e.target.style.borderColor = 'var(--color-border)' }}
                                                />
                                                <button
                                                    onClick={handleBuscarPlaca}
                                                    disabled={isBuscando || !placa.trim()}
                                                    style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', background: isBuscando || !placa.trim() ? 'var(--color-border)' : 'var(--color-primary)', color: isBuscando || !placa.trim() ? 'var(--color-text-muted)' : '#fff', fontWeight: 700, cursor: isBuscando || !placa.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                >
                                                    {isBuscando
                                                        ? <div style={{ width: '18px', height: '18px', border: '2px solid var(--color-text-muted)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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