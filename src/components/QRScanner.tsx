// src/components/QRScanner.tsx
// HU-009 — Escaneo de QR del tiquete de ingreso.
//
// Estrategia:
//   1. Si el dispositivo tiene cámara → html5-qrcode en tiempo real.
//      Al detectar el QR extrae el "id" del JSON y llama onDetected(id)
//      automáticamente, sin paso extra del usuario.
//   2. Si no hay cámara o el usuario la cierra → input manual/lector externo.
//
// IMPORTANTE: el div#QR_REGION_ID debe estar siempre en el DOM antes de
// instanciar Html5Qrcode. Por eso está siempre montado y se oculta con CSS
// cuando la cámara no está activa.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface QRScannerProps {
    onDetected: (idIngreso: number) => void
    isLoading:  boolean
}

type EstadoCamara = 'inactiva' | 'iniciando' | 'activa' | 'error'

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
        const num = parseInt(rawValue.trim(), 10)
        return !isNaN(num) && num > 0 ? num : null
    }
}

const QR_REGION_ID = 'html5-qrcode-parking-scanner'

// ── Componente ────────────────────────────────────────────────────────────────

const QRScanner: React.FC<QRScannerProps> = ({ onDetected, isLoading }) => {
    const scannerRef   = useRef<Html5Qrcode | null>(null)
    const detectadoRef = useRef(false)
    // Señal para que el useEffect arranque la cámara tras el render
    const [querierArrancar, setQuieroArrancar] = useState(false)

    const [tieneCamara,  setTieneCamara]  = useState(false)
    const [estadoCamara, setEstadoCamara] = useState<EstadoCamara>('inactiva')
    const [errorMsg,     setErrorMsg]     = useState('')
    const [inputManual,  setInputManual]  = useState('')
    const [errorManual,  setErrorManual]  = useState('')

    // ── Detectar cámara disponible ────────────────────────────────────────────

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

    // ── Arrancar cámara DESPUÉS de que el div ya está en el DOM ───────────────
    // querierArrancar cambia a true → React re-renderiza → el div ya existe
    // → este useEffect corre DESPUÉS del render y puede instanciar Html5Qrcode

    useEffect(() => {
        if (!querierArrancar) return
        setQuieroArrancar(false)   // resetear la señal

        // Verificar que el div realmente existe en el DOM
        const divEl = document.getElementById(QR_REGION_ID)
        if (!divEl) {
            setErrorMsg('Error interno: no se pudo montar el escáner.')
            setEstadoCamara('error')
            return
        }

        detectadoRef.current = false
        setEstadoCamara('iniciando')
        setErrorMsg('')

        const scanner = new Html5Qrcode(QR_REGION_ID, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
        })
        scannerRef.current = scanner

        scanner.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 220, height: 220 },
                aspectRatio: 1.0,
            },
            (decodedText) => {
                if (detectadoRef.current || isLoading) return
                const id = parsearIdDeQR(decodedText)
                if (id === null) return

                detectadoRef.current = true
                // Detener y notificar
                void scanner.stop()
                    .then(() => { scannerRef.current = null })
                    .catch(() => null)
                    .finally(() => {
                        setEstadoCamara('inactiva')
                        onDetected(id)
                    })
            },
            () => { /* frame sin QR — ignorar */ }
        )
            .then(() => {
                setEstadoCamara('activa')
            })
            .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err)
                scannerRef.current = null

                if (/permission|notallowed/i.test(msg)) {
                    setErrorMsg('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
                } else if (/notfound|no camera|devicenotfound/i.test(msg)) {
                    setErrorMsg('No se encontró cámara en este dispositivo.')
                } else {
                    setErrorMsg('No se pudo iniciar la cámara. Intenta recargar la página.')
                }
                setEstadoCamara('error')
            })

        // isLoading y onDetected son estables (useCallback en el provider).
        // querierArrancar es la señal reactiva que controla este efecto.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [querierArrancar])

    // ── Limpiar al desmontar ──────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                void scannerRef.current.stop().catch(() => null)
                scannerRef.current = null
            }
        }
    }, [])

    // ── Detener cámara ────────────────────────────────────────────────────────

    const detenerCamara = useCallback(async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop() } catch { /* ignorar */ }
            scannerRef.current = null
        }
        setEstadoCamara('inactiva')
    }, [])

    // ── Solicitar arranque — solo cambia el estado, el efecto hace el trabajo ─

    const solicitarCamara = useCallback(() => {
        setErrorMsg('')
        setEstadoCamara('iniciando')
        setQuieroArrancar(true)  // ← dispara el useEffect tras el render
    }, [])

    // ── Input manual ──────────────────────────────────────────────────────────

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputManual(e.target.value)
        setErrorManual('')
    }

    const handleInputSubmit = () => {
        const id = parsearIdDeQR(inputManual.trim())
        if (id === null) { setErrorManual('Ingresa un número de tiquete válido'); return }
        onDetected(id)
        setInputManual('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleInputSubmit()
    }

    const camaraActiva  = estadoCamara === 'activa'
    const iniciando     = estadoCamara === 'iniciando'

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {tieneCamara && (
                <div>
                    {/* ── Botón activar (visible cuando la cámara está inactiva) ── */}
                    {!camaraActiva && !iniciando && (
                        <button
                            onClick={solicitarCamara}
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

                    {/* ── Spinner mientras arranca ─────────────────────────── */}
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
                        </div>
                    )}

                    {/*
                        ── Visor de cámara ────────────────────────────────────
                        SIEMPRE en el DOM una vez que se solicitó la cámara.
                        Se oculta visualmente cuando no está activa para que
                        html5-qrcode pueda encontrar el div por ID en el efecto.
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

                        {/* Instrucción superpuesta */}
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
                                onClick={() => void detenerCamara()}
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

                    {/* Error de cámara */}
                    {estadoCamara === 'error' && errorMsg && (
                        <div style={{
                            marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
                            background: '#fef2f2', border: '1px solid #fecaca',
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                        }}>
                            <span className="material-symbols-outlined" style={{
                                fontSize: '16px', color: '#ef4444', flexShrink: 0, marginTop: '1px',
                            }}>error</span>
                            <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, lineHeight: 1.4 }}>
                                {errorMsg}
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

            {/* ── Input manual ──────────────────────────────────────────────── */}
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
                        onFocus={e => { e.target.style.borderColor = '#137fec' }}
                        onBlur={e  => { e.target.style.borderColor = errorManual ? '#ef4444' : '#e2e8f0' }}
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
                /* Ocultar botones y elementos extra que inyecta html5-qrcode */
                #${QR_REGION_ID} > img    { display: none !important; }
                #${QR_REGION_ID} > button { display: none !important; }
                #${QR_REGION_ID} video    { border-radius: 0 !important; display: block !important; }
                #${QR_REGION_ID} > div > span { display: none !important; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

export default QRScanner