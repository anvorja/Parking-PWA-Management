// src/components/QRScanner.tsx
// HU-009 — Escaneo de QR del tiquete de ingreso.
//
// Estrategia:
//   1. Si el dispositivo tiene cámara → html5-qrcode en tiempo real.
//      Al detectar el QR extrae el "id" del JSON y llama onDetected(id)
//      automáticamente, sin paso extra del usuario.
//   2. Si no hay cámara o el usuario la cierra → input manual/lector externo.
//
// El QR del tiquete contiene un JSON: { id, placa, ubicacion, tipo, entrada }
// Solo se necesita "id" para buscarPorId en el backend.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface QRScannerProps {
    /** Callback con el id de ingreso leído del QR — dispara búsqueda automática */
    onDetected: (idIngreso: number) => void
    /** true mientras el provider está procesando la búsqueda */
    isLoading: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsearIdDeQR(rawValue: string): number | null {
    try {
        const parsed = JSON.parse(rawValue) as Record<string, unknown>
        const id = parsed['id']
        if (typeof id === 'number' && id > 0) return id
        if (typeof id === 'string') {
            const num = parseInt(id, 10)
            if (!isNaN(num) && num > 0) return num
        }
        return null
    } catch {
        // Si no es JSON, intentar como número directo (compatibilidad)
        const num = parseInt(rawValue.trim(), 10)
        return !isNaN(num) && num > 0 ? num : null
    }
}

// ID único del div que html5-qrcode necesita para montar el video
const QR_REGION_ID = 'qr-scanner-region'

// ── Componente ────────────────────────────────────────────────────────────────

const QRScanner: React.FC<QRScannerProps> = ({ onDetected, isLoading }) => {
    const scannerRef     = useRef<Html5Qrcode | null>(null)
    const detectadoRef   = useRef(false)          // evita doble disparo en el mismo frame

    const [tieneCamara, setTieneCamara]     = useState(false)
    const [camaraActiva, setCamaraActiva]   = useState(false)
    const [errorCamara, setErrorCamara]     = useState('')
    const [inputManual, setInputManual]     = useState('')
    const [errorManual, setErrorManual]     = useState('')

    // ── Detectar si hay cámara disponible ────────────────────────────────────

    useEffect(() => {
        const verificar = async () => {
            try {
                if (navigator.mediaDevices?.enumerateDevices) {
                    const devices = await navigator.mediaDevices.enumerateDevices()
                    setTieneCamara(devices.some(d => d.kind === 'videoinput'))
                }
            } catch {
                setTieneCamara(false)
            }
        }
        void verificar()
    }, [])

    // ── Limpiar al desmontar ──────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                void scannerRef.current.stop().catch(() => null)
                scannerRef.current = null
            }
        }
    }, [])

    // ── Iniciar escáner ───────────────────────────────────────────────────────

    const iniciarCamara = useCallback(async () => {
        setErrorCamara('')
        detectadoRef.current = false

        try {
            const scanner = new Html5Qrcode(QR_REGION_ID, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false,
            })
            scannerRef.current = scanner

            await scanner.start(
                { facingMode: 'environment' },   // cámara trasera
                {
                    fps: 10,
                    qrbox: { width: 220, height: 220 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // Callback de éxito — puede llamarse múltiples veces en el mismo frame
                    if (detectadoRef.current || isLoading) return
                    const id = parsearIdDeQR(decodedText)
                    if (id === null) return

                    detectadoRef.current = true
                    void detenerCamara()
                    onDetected(id)          // dispara buscarPorId → búsqueda automática
                },
                () => {
                    // Callback de error de frame — se ignora (frames sin QR)
                }
            )

            setCamaraActiva(true)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : ''
            scannerRef.current = null

            if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
                setErrorCamara('Permiso de cámara denegado. Ingresa el código manualmente.')
            } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
                setErrorCamara('No se encontró cámara. Ingresa el código manualmente.')
            } else {
                setErrorCamara('No se pudo iniciar la cámara. Ingresa el código manualmente.')
            }
        }
    }, [isLoading, onDetected]) // eslint-disable-line react-hooks/exhaustive-deps

    const detenerCamara = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop()
            } catch { /* ignorar si ya estaba detenido */ }
            scannerRef.current = null
        }
        setCamaraActiva(false)
    }, [])

    // ── Input manual / lector externo ─────────────────────────────────────────

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputManual(e.target.value)
        setErrorManual('')
    }

    const handleInputSubmit = () => {
        const id = parsearIdDeQR(inputManual.trim())
        if (id === null) {
            setErrorManual('Ingresa un número de tiquete válido')
            return
        }
        onDetected(id)
        setInputManual('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleInputSubmit()
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Sección de cámara — solo si hay cámara disponible ─────────── */}
            {tieneCamara && (
                <div>
                    {camaraActiva ? (
                        <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: '#000' }}>
                            {/*
                                html5-qrcode monta el <video> dentro de este div.
                                El tamaño del div determina el tamaño del visor.
                            */}
                            <div
                                id={QR_REGION_ID}
                                style={{ width: '100%', minHeight: '280px' }}
                            />

                            {/* Overlay con instrucción */}
                            <p style={{
                                position: 'absolute', bottom: '12px', left: 0, right: 0,
                                textAlign: 'center', color: '#fff', fontSize: '12px',
                                fontWeight: 600, margin: 0,
                                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                            }}>
                                Apunta al código QR del tiquete
                            </p>

                            {/* Botón cerrar */}
                            <button
                                onClick={() => void detenerCamara()}
                                style={{
                                    position: 'absolute', top: '10px', right: '10px',
                                    background: 'rgba(0,0,0,0.55)', border: 'none',
                                    borderRadius: '50%', width: '34px', height: '34px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#fff',
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                            </button>
                        </div>
                    ) : (
                        /* Botón para activar la cámara */
                        <button
                            onClick={() => void iniciarCamara()}
                            disabled={isLoading}
                            style={{
                                width: '100%', padding: '22px', borderRadius: '14px',
                                border: '2px dashed #cbd5e1', background: '#f8fafc',
                                color: '#475569', fontSize: '14px', fontWeight: 600,
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

                    {/* Error de cámara */}
                    {errorCamara && (
                        <div style={{
                            marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
                            background: '#fef2f2', border: '1px solid #fecaca',
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ef4444', flexShrink: 0, marginTop: '1px' }}>
                                error
                            </span>
                            <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, lineHeight: 1.4 }}>
                                {errorCamara}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Separador ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                    {tieneCamara ? 'O INGRESA EL CÓDIGO' : 'INGRESA EL CÓDIGO DEL TIQUETE'}
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* ── Input manual / lector externo ─────────────────────────────── */}
            <div>
                <label style={{
                    display: 'block', fontSize: '11px', fontWeight: 700,
                    color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.8px', marginBottom: '8px',
                }}>
                    Número de tiquete
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputManual}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ej: 000000123"
                        disabled={isLoading}
                        style={{
                            flex: 1, padding: '11px 12px', borderRadius: '10px',
                            border: `1.5px solid ${errorManual ? '#ef4444' : '#e2e8f0'}`,
                            background: '#f8fafc', fontSize: '15px', fontWeight: 600,
                            color: '#0f172a', outline: 'none', fontFamily: 'monospace',
                        }}
                        onFocus={e  => { e.target.style.borderColor = '#137fec' }}
                        onBlur={e   => { e.target.style.borderColor = errorManual ? '#ef4444' : '#e2e8f0' }}
                    />
                    <button
                        onClick={handleInputSubmit}
                        disabled={isLoading || !inputManual.trim()}
                        style={{
                            padding: '11px 16px', borderRadius: '10px', border: 'none',
                            background: isLoading || !inputManual.trim() ? '#e2e8f0' : '#137fec',
                            color: isLoading || !inputManual.trim() ? '#94a3b8' : '#fff',
                            fontWeight: 700, fontSize: '14px',
                            cursor: isLoading || !inputManual.trim() ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.2s', flexShrink: 0,
                        }}
                    >
                        {isLoading
                            ? <div style={{
                                width: '16px', height: '16px',
                                border: '2px solid rgba(255,255,255,0.4)',
                                borderTopColor: '#94a3b8',
                                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                            }} />
                            : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
                        }
                    </button>
                </div>

                {errorManual && (
                    <p style={{ fontSize: '12px', color: '#ef4444', margin: '6px 0 0' }}>
                        {errorManual}
                    </p>
                )}
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>
                    También puedes usar un lector QR externo conectado al dispositivo.
                </p>
            </div>

            <style>{`
                /* html5-qrcode inyecta su propio botón de encendido/apagado — lo ocultamos */
                #${QR_REGION_ID} > img { display: none !important; }
                #${QR_REGION_ID} button { display: none !important; }
                #${QR_REGION_ID} video { border-radius: 0 !important; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default QRScanner