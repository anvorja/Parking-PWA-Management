// src/components/QRInputManual.tsx
// Sub-componente de QRScanner.
// Responsabilidad: input de número de tiquete para ingreso manual
// o autocompletado por lector QR externo (USB/Bluetooth).

import React, { useState } from 'react'
import { parsearUuidDeQR } from './qrUtils'

interface QRInputManualProps {
    isLoading:   boolean
    onDetected:  (uuid: string) => void
}

const QRInputManual: React.FC<QRInputManualProps> = ({ isLoading, onDetected }) => {
    const [inputManual, setInputManual] = useState('')
    const [errorManual, setErrorManual] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputManual(e.target.value)
        setErrorManual('')
    }

    const handleSubmit = () => {
        const uuid = parsearUuidDeQR(inputManual.trim())
        if (uuid === null) {
            setErrorManual('Código QR inválido — pega el contenido completo del tiquete')
            return
        }
        onDetected(uuid)
        setInputManual('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSubmit()
    }

    return (
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
                    placeholder="Pegar contenido del QR o UUID"
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
                    onClick={handleSubmit}
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
                Usa un lector QR externo (USB/Bluetooth) o pega el UUID del tiquete.
            </p>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

export default QRInputManual