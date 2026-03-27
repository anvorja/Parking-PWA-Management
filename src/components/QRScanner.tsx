// src/components/QRScanner.tsx
// HU-009 — Escaneo de QR del tiquete de ingreso.
//
// Responsabilidad: lógica del ciclo de vida del scanner (html5-qrcode),
// detección de cámara y orquestación de los sub-componentes.
//
// Sub-componentes:
//   QRVisor       — visor de cámara en tiempo real
//   QRInputManual — input de número de tiquete (manual o lector externo)
//   qrUtils       — parsearIdDeQR, QR_REGION_ID

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import QRVisor, { EstadoCamara } from './QRVisor'
import QRInputManual from './QRInputManual'
import { QR_REGION_ID, parsearIdDeQR } from './qrUtils'

interface QRScannerProps {
    /** Callback con el id de ingreso leído del QR — dispara búsqueda automática */
    onDetected: (idIngreso: number) => void
    /** true mientras el provider está procesando la búsqueda */
    isLoading:  boolean
}

const QRScanner: React.FC<QRScannerProps> = ({ onDetected, isLoading }) => {
    const scannerRef   = useRef<Html5Qrcode | null>(null)
    const detectadoRef = useRef(false)
    // Señal para arrancar la cámara en el useEffect DESPUÉS del render,
    // garantizando que el div#QR_REGION_ID ya existe en el DOM.
    const [querierArrancar, setQuieroArrancar] = useState(false)

    const [tieneCamara,  setTieneCamara]  = useState(false)
    const [estadoCamara, setEstadoCamara] = useState<EstadoCamara>('inactiva')
    const [errorMsg,     setErrorMsg]     = useState('')

    // ── Detectar si el dispositivo tiene cámara ───────────────────────────────

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

    // ── Arrancar cámara DESPUÉS del render ────────────────────────────────────
    // Patrón señal: querierArrancar → React renderiza el div → efecto lo encuentra

    useEffect(() => {
        if (!querierArrancar) return
        setQuieroArrancar(false)

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
            { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
            (decodedText) => {
                if (detectadoRef.current || isLoading) return
                const id = parsearIdDeQR(decodedText)
                if (id === null) return

                detectadoRef.current = true
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
            .then(() => { setEstadoCamara('activa') })
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

        // isLoading y onDetected son estables (useCallback en SalidaProvider).
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

    // ── Solicitar arranque ────────────────────────────────────────────────────

    const solicitarCamara = useCallback(() => {
        setErrorMsg('')
        setEstadoCamara('iniciando')
        setQuieroArrancar(true)
    }, [])

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {tieneCamara && (
                <QRVisor
                    estadoCamara={estadoCamara}
                    errorMsg={errorMsg}
                    isLoading={isLoading}
                    onSolicitar={solicitarCamara}
                    onDetener={() => void detenerCamara()}
                />
            )}

            {/* Separador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                    {tieneCamara ? 'O INGRESA EL CÓDIGO' : 'INGRESA EL CÓDIGO DEL TIQUETE'}
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            <QRInputManual
                isLoading={isLoading}
                onDetected={onDetected}
            />

        </div>
    )
}

export default QRScanner