// src/components/QRScanner.tsx
// HU-009 — Escaneo de QR del tiquete de ingreso.
//
// Estrategia de detección:
//   1. BarcodeDetector API (Chrome 83+, Edge, Android WebView) — usa la cámara del dispositivo
//   2. Fallback: campo de texto para lectores QR externos (USB/Bluetooth) o ingreso manual del id
//
// El QR del tiquete contiene un JSON: { id, placa, ubicación, tipo, entrada }
// Solo se necesita el campo "id" para buscar el ingreso en el backend.

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface QRScannerProps {
    /** Callback con el id de ingreso leído del QR */
    onDetected: (idIngreso: number) => void
    /** true mientras el provider está procesando la búsqueda */
    isLoading: boolean
}

// Declaración de tipo para BarcodeDetector — no está en el TS lib estándar
declare class BarcodeDetector {
    constructor(options?: { formats: string[] })
    detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>
    static getSupportedFormats(): Promise<string[]>
}

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
        // Si no es JSON válido, intentar como número directo
        const num = parseInt(rawValue.trim(), 10)
        return !isNaN(num) && num > 0 ? num : null
    }
}

const QRScanner: React.FC<QRScannerProps> = ({ onDetected, isLoading }) => {
    const videoRef          = useRef<HTMLVideoElement | null>(null)
    const streamRef         = useRef<MediaStream | null>(null)
    const detectorRef       = useRef<BarcodeDetector | null>(null)
    const animFrameRef      = useRef<number | null>(null)
    const detectadoRef      = useRef(false)

    const [soportaCamera, setSoportaCamera]       = useState(false)
    const [camaraActiva, setCamaraActiva]         = useState(false)
    const [errorCamara, setErrorCamara]           = useState('')
    const [inputManual, setInputManual]           = useState('')
    const [errorManual, setErrorManual]           = useState('')

    // ── Detectar soporte de BarcodeDetector ──────────────────────────────────

    useEffect(() => {
        const verificar = async () => {
            if ('BarcodeDetector' in window) {
                try {
                    const formatos = await BarcodeDetector.getSupportedFormats()
                    setSoportaCamera(formatos.includes('qr_code'))
                } catch {
                    setSoportaCamera(false)
                }
            } else {
                setSoportaCamera(false)
            }
        }
        void verificar()
    }, [])

    // ── Limpiar recursos al desmontar ─────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
        }
    }, [])

    // ── Iniciar cámara ────────────────────────────────────────────────────────

    const iniciarCamara = useCallback(async () => {
        setErrorCamara('')
        detectadoRef.current = false
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            })
            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }

            detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
            setCamaraActiva(true)
            escanearFrame()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al acceder a la cámara'
            setErrorCamara(
                msg.includes('Permission') || msg.includes('NotAllowed')
                    ? 'Permiso de cámara denegado. Usa el campo de texto para ingresar el código.'
                    : 'No se pudo acceder a la cámara. Usa el campo de texto.'
            )
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Loop de detección ─────────────────────────────────────────────────────

    const escanearFrame = useCallback(() => {
        if (!videoRef.current || !detectorRef.current || detectadoRef.current) return

        animFrameRef.current = requestAnimationFrame(async () => {
            if (!videoRef.current || !detectorRef.current || detectadoRef.current) return

            try {
                const resultados = await detectorRef.current.detect(videoRef.current)
                if (resultados.length > 0) {
                    const id = parsearIdDeQR(resultados[0].rawValue)
                    if (id !== null) {
                        detectadoRef.current = true
                        detenerCamara()
                        onDetected(id)
                        return
                    }
                }
            } catch { /* frame ignorado */ }

            escanearFrame()
        })
    }, [onDetected]) // eslint-disable-line react-hooks/exhaustive-deps

    const detenerCamara = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setCamaraActiva(false)
    }, [])

    // ── Fallback: input manual ────────────────────────────────────────────────

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Vista de cámara — solo si BarcodeDetector está soportado */}
            {soportaCamera && (
                <div>
                    {camaraActiva ? (
                        <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                            <video
                                ref={videoRef}
                                playsInline
                                muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {/* Visor de escaneo */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <div style={{ width: '200px', height: '200px', border: '3px solid #137fec', borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}>
                                    {/* Esquinas del visor */}
                                    {[
                                        { top: -2, left: -2, borderTop: '3px solid #fff', borderLeft: '3px solid #fff' },
                                        { top: -2, right: -2, borderTop: '3px solid #fff', borderRight: '3px solid #fff' },
                                        { bottom: -2, left: -2, borderBottom: '3px solid #fff', borderLeft: '3px solid #fff' },
                                        { bottom: -2, right: -2, borderBottom: '3px solid #fff', borderRight: '3px solid #fff' },
                                    ].map((s, i) => (
                                        <div key={i} style={{ position: 'absolute', width: '20px', height: '20px', borderRadius: '2px', ...s }} />
                                    ))}
                                </div>
                            </div>
                            {/* Botón detener */}
                            <button
                                onClick={detenerCamara}
                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                            </button>
                            <p style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: '12px', margin: 0 }}>
                                Apunta al código QR del tiquete
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={iniciarCamara}
                            disabled={isLoading}
                            style={{ width: '100%', padding: '20px', borderRadius: '14px', border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#137fec'; e.currentTarget.style.background = '#eff6ff' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#137fec' }}>qr_code_scanner</span>
                            Escanear código QR
                        </button>
                    )}
                    {errorCamara && (
                        <p style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', margin: '8px 0 0' }}>{errorCamara}</p>
                    )}
                </div>
            )}

            {/* Separador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
          {soportaCamera ? 'O INGRESA EL CÓDIGO' : 'INGRESA EL CÓDIGO DEL TIQUETE'}
        </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Input manual — funciona con lectores USB o ingreso a mano */}
            <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
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
                        style={{ flex: 1, padding: '11px 12px', borderRadius: '10px', border: `1.5px solid ${errorManual ? '#ef4444' : '#e2e8f0'}`, background: '#f8fafc', fontSize: '15px', fontWeight: 600, color: '#0f172a', outline: 'none', fontFamily: 'monospace' }}
                        onFocus={e => { e.target.style.borderColor = '#137fec' }}
                        onBlur={e  => { e.target.style.borderColor = errorManual ? '#ef4444' : '#e2e8f0' }}
                    />
                    <button
                        onClick={handleInputSubmit}
                        disabled={isLoading || !inputManual.trim()}
                        style={{ padding: '11px 16px', borderRadius: '10px', border: 'none', background: isLoading || !inputManual.trim() ? '#e2e8f0' : '#137fec', color: isLoading || !inputManual.trim() ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: '14px', cursor: isLoading || !inputManual.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                    >
                        {isLoading
                            ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#94a3b8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>}
                    </button>
                </div>
                {errorManual && <p style={{ fontSize: '12px', color: '#ef4444', margin: '6px 0 0' }}>{errorManual}</p>}
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>
                    También puedes usar un lector QR externo conectado al dispositivo.
                </p>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )
}

export default QRScanner