// src/components/QRVisor.tsx
// Sub-componente de QRScanner.
// Responsabilidad: renderizar el visor de cámara en sus tres estados:
//   - Botón para activar (inactiva)
//   - Spinner de arranque (iniciando)
//   - Video en vivo + overlay + botón cerrar (activa)
//   - Mensaje de error (error)
//
// IMPORTANTE: el div#QR_REGION_ID está siempre en el DOM cuando
// estadoCamara !== 'inactiva', porque html5-qrcode necesita encontrarlo
// antes de que se le pueda llamar a .start(). El padre (QRScanner) controla
// cuándo mostrar este componente mediante la señal querierArrancar.

import React from 'react'
import { QR_REGION_ID } from './qrUtils'

export type EstadoCamara = 'inactiva' | 'iniciando' | 'activa' | 'error'

interface QRVisorProps {
    estadoCamara: EstadoCamara
    errorMsg:     string
    isLoading:    boolean
    onSolicitar:  () => void
    onDetener:    () => void
}

const QRVisor: React.FC<QRVisorProps> = ({
                                             estadoCamara,
                                             errorMsg,
                                             isLoading,
                                             onSolicitar,
                                             onDetener,
                                         }) => {
    const camaraActiva = estadoCamara === 'activa'
    const iniciando    = estadoCamara === 'iniciando'

    return (
        <div>
            {/* ── Botón activar cámara ─────────────────────────────────────── */}
            {estadoCamara === 'inactiva' && (
                <button
                    onClick={onSolicitar}
                    disabled={isLoading}
                    style={{
                        width: '100%', padding: '22px', borderRadius: '14px',
                        border: '2px dashed #cbd5e1', background: '#f8fafc',
                        color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#137fec'
                        e.currentTarget.style.background  = '#eff6ff'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#cbd5e1'
                        e.currentTarget.style.background  = '#f8fafc'
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#137fec' }}>
                        qr_code_scanner
                    </span>
                    <span>Escanear código QR</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                        La cámara se activa en tiempo real
                    </span>
                </button>
            )}

            {/* ── Spinner mientras arranca ─────────────────────────────────── */}
            {iniciando && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '10px', padding: '28px', borderRadius: '14px',
                    background: '#f8fafc', border: '2px dashed #cbd5e1',
                }}>
                    <div style={{
                        width: '36px', height: '36px',
                        border: '3px solid #bfdbfe', borderTopColor: '#137fec',
                        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                        Iniciando cámara...
                    </span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/*
                ── Visor de cámara ──────────────────────────────────────────────
                El contenedor y el div#QR_REGION_ID se mantienen en el DOM
                mientras la cámara está iniciando o activa. html5-qrcode monta
                el <video> dentro de este div, por lo que no puede aparecer ni
                desaparecer después de que .start() fue llamado.
            */}
            <div style={{
                display: (camaraActiva || iniciando) ? 'block' : 'none',
                position: 'relative', borderRadius: '14px', overflow: 'hidden',
                background: '#000',
            }}>
                <div
                    id={QR_REGION_ID}
                    style={{ width: '100%', minHeight: '280px' }}
                />

                {/* Instrucción superpuesta — solo cuando la cámara ya está activa */}
                {camaraActiva && (
                    <p style={{
                        position: 'absolute', bottom: '12px', left: 0, right: 0,
                        textAlign: 'center', color: '#fff', fontSize: '12px',
                        fontWeight: 600, margin: 0,
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                    }}>
                        Apunta al código QR del tiquete
                    </p>
                )}

                {/* Botón cerrar */}
                {camaraActiva && (
                    <button
                        onClick={() => void onDetener()}
                        style={{
                            position: 'absolute', top: '10px', right: '10px',
                            background: 'rgba(0,0,0,0.55)', border: 'none',
                            borderRadius: '50%', width: '34px', height: '34px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#fff', zIndex: 10,
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                )}
            </div>

            {/* ── Error de cámara ──────────────────────────────────────────── */}
            {estadoCamara === 'error' && errorMsg && (
                <div style={{
                    marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
                    background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border-light)',
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                    <span className="material-symbols-outlined" style={{
                        fontSize: '16px', color: '#ef4444', flexShrink: 0, marginTop: '1px',
                    }}>
                        error
                    </span>
                    <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, lineHeight: 1.4 }}>
                        {errorMsg}
                    </p>
                </div>
            )}

            {/* CSS para que html5-qrcode no muestre sus propios controles */}
            <style>{`
                #${QR_REGION_ID} > img         { display: none !important; }
                #${QR_REGION_ID} > button      { display: none !important; }
                #${QR_REGION_ID} video         { border-radius: 0 !important; display: block !important; }
                #${QR_REGION_ID} > div > span  { display: none !important; }
            `}</style>
        </div>
    )
}

export default QRVisor