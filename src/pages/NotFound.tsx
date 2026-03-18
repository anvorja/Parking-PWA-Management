// src/pages/NotFound.tsx
import React, { useEffect, useState } from 'react'
import { IonPage, IonContent, useIonRouter } from '@ionic/react'

const NotFound: React.FC = () => {
    const router = useIonRouter()
    const [countdown, setCountdown] = useState(5)

    // Cuenta regresiva: redirige a /entrada automáticamente en 5s
    useEffect(() => {
        if (countdown === 0) {
            router.push('/entrada', 'root', 'replace')
            return
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(t)
    }, [countdown, router])

    return (
        <IonPage>
            <IonContent fullscreen style={{ '--background': '#f8fafc' }}>
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        gap: '0',
                        background: '#f8fafc',
                        fontFamily: '"Inter", sans-serif',
                    }}
                >
                    {/* Ícono */}
                    <div
                        style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '20px',
                            background: 'rgba(19, 127, 236, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px',
                        }}
                    >
            <span
                className="material-symbols-outlined"
                style={{ fontSize: '40px', color: '#137fec' }}
            >
              wrong_location
            </span>
                    </div>

                    {/* Código */}
                    <p
                        style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#137fec',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            margin: '0 0 8px',
                        }}
                    >
                        Error 404
                    </p>

                    {/* Título */}
                    <h1
                        style={{
                            fontSize: '26px',
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: '0 0 10px',
                            textAlign: 'center',
                            lineHeight: 1.2,
                        }}
                    >
                        Página no encontrada
                    </h1>

                    {/* Descripción */}
                    <p
                        style={{
                            fontSize: '14px',
                            color: '#64748b',
                            textAlign: 'center',
                            maxWidth: '280px',
                            lineHeight: 1.6,
                            margin: '0 0 32px',
                        }}
                    >
                        La ruta que buscas no existe o fue movida.
                        Serás redirigido automáticamente en{' '}
                        <strong style={{ color: '#137fec' }}>{countdown}s</strong>.
                    </p>

                    {/* Botón principal */}
                    <button
                        onClick={() => router.push('/entrada', 'root', 'replace')}
                        style={{
                            padding: '14px 32px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#137fec',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 16px rgba(19, 127, 236, 0.3)',
                            transition: 'all 0.2s',
                            marginBottom: '12px',
                            width: '100%',
                            maxWidth: '280px',
                            justifyContent: 'center',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#0b63be'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#137fec'
                            e.currentTarget.style.transform = 'translateY(0)'
                        }}
                    >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              home
            </span>
                        Ir al inicio
                    </button>

                    {/* Botón secundario */}
                    <button
                        onClick={() => router.goBack()}
                        style={{
                            padding: '12px 32px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            background: 'transparent',
                            color: '#64748b',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            width: '100%',
                            maxWidth: '280px',
                            justifyContent: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_back
            </span>
                        Volver atrás
                    </button>

                    {/* Barra de progreso */}
                    <div
                        style={{
                            marginTop: '32px',
                            width: '100%',
                            maxWidth: '280px',
                            height: '3px',
                            background: '#e2e8f0',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                background: '#137fec',
                                borderRadius: '9999px',
                                width: `${(countdown / 5) * 100}%`,
                                transition: 'width 1s linear',
                            }}
                        />
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>
                        Redirigiendo en {countdown}s…
                    </p>
                </div>
            </IonContent>
        </IonPage>
    )
}

export default NotFound