// src/components/QRScanner.tsx
// HU-009 — Escaneo de QR del tiquete de ingreso.
//
// Estrategia por entorno:
//   1. Móvil/tablet con cámara + BarcodeDetector API:
//      <input type="file" capture="environment"> delega al SO la apertura de cámara,
//      el operador toma la foto → BarcodeDetector la procesa → autocompleta el input.
//   2. PC o dispositivo sin cámara / sin BarcodeDetector:
//      Campo de texto directo (lector QR USB/BT o ingreso manual).
//
// El resultado siempre autocompleta el input "Número de tiquete" para que
// el usuario pueda revisar y confirmar antes de buscar.
//
// El QR del tiquete contiene un JSON: { id, placa, ubicación, tipo, entrada }
// Solo se necesita el campo "id".

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface QRScannerProps {
    /** Callback con el id de ingreso leído del QR */
    onDetected: (idIngreso: number) => void
    /** true mientras el provider está procesando la búsqueda */
    isLoading: boolean
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface BarcodeResult {
    rawValue: string
}

interface BarcodeDetectorInstance {
    detect(source: ImageBitmapSource): Promise<BarcodeResult[]>
}

interface BarcodeDetectorConstructor {
    new(options?: { formats: string[] }): BarcodeDetectorInstance
    getSupportedFormats(): Promise<string[]>
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
        const num = parseInt(rawValue.trim(), 10)
        return !isNaN(num) && num > 0 ? num : null
    }
}

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
    if ('BarcodeDetector' in window) {
        return (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector
    }
    return null
}

// ── Componente ────────────────────────────────────────────────────────────────

const QRScanner: React.FC<QRScannerProps> = ({ onDetected, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const [tieneCamara, setTieneCamara]         = useState(false)
    const [tieneBarcodeAPI, setTieneBarcodeAPI] = useState(false)
    const [procesando, setProcesando]           = useState(false)
    const [errorEscaneo, setErrorEscaneo]       = useState('')
    const [inputManual, setInputManual]         = useState('')
    const [errorManual, setErrorManual]         = useState('')
    // feedback visual verde por 2 segundos tras detectar QR
    const [escaneado, setEscaneado]             = useState(false)

    // ── Detectar capacidades del dispositivo ─────────────────────────────────

    useEffect(() => {
        const verificar = async () => {
            // Detectar cámara
            try {
                if (navigator.mediaDevices?.enumerateDevices) {
                    const devices = await navigator.mediaDevices.enumerateDevices()
                    setTieneCamara(devices.some(d => d.kind === 'videoinput'))
                }
            } catch {
                setTieneCamara(false)
            }

            // Detectar BarcodeDetector con soporte para qr_code
            const BD = getBarcodeDetector()
            if (BD) {
                try {
                    const formatos = await BD.getSupportedFormats()
                    setTieneBarcodeAPI(formatos.includes('qr_code'))
                } catch {
                    setTieneBarcodeAPI(false)
                }
            }
        }
        void verificar()
    }, [])

    // ── Procesar imagen capturada por el SO ───────────────────────────────────

    const procesarImagen = useCallback(async (file: File) => {
        setErrorEscaneo('')
        setProcesando(true)

        const BD = getBarcodeDetector()
        if (!BD) {
            setErrorEscaneo('Tu navegador no soporta lectura de QR automática. Ingresa el código manualmente.')
            setProcesando(false)
            return
        }

        try {
            const bitmap  = await createImageBitmap(file)
            const detector = new BD({ formats: ['qr_code'] })
            const resultados = await detector.detect(bitmap)
            bitmap.close()

            if (resultados.length === 0) {
                setErrorEscaneo('No se detectó ningún QR en la imagen. Enfoca bien el código e intenta de nuevo.')
                setProcesando(false)
                return
            }

            const id = parsearIdDeQR(resultados[0].rawValue)
            if (id === null) {
                setErrorEscaneo('El QR no contiene un número de tiquete válido.')
                setProcesando(false)
                return
            }

            // Autocompletar el input con el número del tiquete
            setInputManual(String(id).padStart(9, '0'))
            setEscaneado(true)
            setTimeout(() => setEscaneado(false), 2500)
            setProcesando(false)

        } catch {
            setErrorEscaneo('Error al leer la imagen. Intenta de nuevo con mejor iluminación.')
            setProcesando(false)
        }
    }, [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        void procesarImagen(file)
        // Limpiar para permitir capturar la misma imagen de nuevo si hay error
        e.target.value = ''
    }, [procesarImagen])

    const abrirCamara = useCallback(() => {
        setErrorEscaneo('')
        fileInputRef.current?.click()
    }, [])

    // ── Input manual ──────────────────────────────────────────────────────────

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputManual(e.target.value)
        setErrorManual('')
        if (escaneado) setEscaneado(false)
    }

    const handleInputSubmit = () => {
        const id = parsearIdDeQR(inputManual.trim())
        if (id === null) {
            setErrorManual('Ingresa un número de tiquete válido')
            return
        }
        onDetected(id)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleInputSubmit()
    }

    // Solo mostramos el botón de cámara si el dispositivo tiene cámara Y BarcodeDetector
    const mostrarBotonCamara = tieneCamara && tieneBarcodeAPI

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Botón de cámara ──────────────────────────────────────────── */}
            {mostrarBotonCamara && (
                <div>
                    {/*
                        Input oculto: type="file" + capture="environment" abre la cámara
                        trasera directamente en Android/iOS sin necesidad de getUserMedia.
                        Funciona en PWA, navegador Chrome/Safari, con HTTPS.
                    */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        aria-hidden="true"
                    />

                    <button
                        onClick={abrirCamara}
                        disabled={isLoading || procesando}
                        style={{
                            width: '100%', padding: '20px', borderRadius: '14px',
                            border: `2px dashed ${procesando ? '#93c5fd' : escaneado ? '#86efac' : '#cbd5e1'}`,
                            background: procesando ? '#eff6ff' : escaneado ? '#f0fdf4' : '#f8fafc',
                            color: procesando ? '#1e40af' : escaneado ? '#16a34a' : '#475569',
                            fontSize: '14px', fontWeight: 600,
                            cursor: isLoading || procesando ? 'not-allowed' : 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: '8px', transition: 'all 0.25s',
                        }}
                    >
                        {procesando ? (
                            <>
                                <div style={{
                                    width: '32px', height: '32px',
                                    border: '3px solid #bfdbfe', borderTopColor: '#137fec',
                                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                                }} />
                                <span>Leyendo código QR...</span>
                            </>
                        ) : escaneado ? (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                                    check_circle
                                </span>
                                <span>¡QR detectado! Revisa el código abajo</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#137fec' }}>
                                    qr_code_scanner
                                </span>
                                <span>Escanear código QR con la cámara</span>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                                    Se abrirá la cámara del dispositivo
                                </span>
                            </>
                        )}
                    </button>

                    {errorEscaneo && (
                        <div style={{
                            marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
                            background: '#fef2f2', border: '1px solid #fecaca',
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ef4444', flexShrink: 0, marginTop: '1px' }}>
                                error
                            </span>
                            <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, lineHeight: 1.4 }}>
                                {errorEscaneo}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Separador ────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                    {mostrarBotonCamara ? 'O INGRESA EL CÓDIGO' : 'INGRESA EL CÓDIGO DEL TIQUETE'}
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* ── Input de número de tiquete ───────────────────────────────── */}
            <div>
                <label style={{
                    display: 'block', fontSize: '11px', fontWeight: 700,
                    color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.8px', marginBottom: '8px',
                }}>
                    Número de tiquete
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            type="text"
                            value={inputManual}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Ej: 000000123"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '11px 12px',
                                paddingRight: escaneado ? '36px' : '12px',
                                borderRadius: '10px',
                                border: `1.5px solid ${errorManual ? '#ef4444' : escaneado ? '#86efac' : '#e2e8f0'}`,
                                background: escaneado ? '#f0fdf4' : '#f8fafc',
                                fontSize: '15px', fontWeight: 600, color: '#0f172a',
                                outline: 'none', fontFamily: 'monospace',
                                boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s',
                            }}
                            onFocus={e => {
                                e.target.style.borderColor = '#137fec'
                                e.target.style.background  = '#fff'
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = errorManual ? '#ef4444' : escaneado ? '#86efac' : '#e2e8f0'
                                e.target.style.background  = escaneado ? '#f0fdf4' : '#f8fafc'
                            }}
                        />
                        {/* Ícono QR verde cuando se autocompletó por escaneo */}
                        {escaneado && (
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    position: 'absolute', right: '10px', top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '16px', color: '#16a34a', pointerEvents: 'none',
                                }}
                            >
                                qr_code
                            </span>
                        )}
                    </div>

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
                    {mostrarBotonCamara
                        ? 'El código se autocompleta al escanear. También puedes escribirlo o usar un lector externo.'
                        : 'Ingresa el número manualmente o usa un lector QR externo conectado al dispositivo.'
                    }
                </p>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

export default QRScanner