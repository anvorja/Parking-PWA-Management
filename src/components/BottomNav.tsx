// src/components/BottomNav.tsx
import React, { useState } from 'react'
import { useIonRouter } from '@ionic/react'
import { useAuth }      from '../hooks/useAuth'

// ─── Modal de confirmación de logout ─────────────────────────────────────────

interface LogoutModalProps {
    isLoggingOut: boolean
    onConfirm:    () => void
    onCancel:     () => void
}

const LogoutModal: React.FC<LogoutModalProps> = ({ isLoggingOut, onConfirm, onCancel }) => (
    <div
        style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}
        onClick={e => { if (e.target === e.currentTarget && !isLoggingOut) onCancel() }}
    >
        <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px 24px',
            width: '100%', maxWidth: '340px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}>
            {/* Icono */}
            <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'var(--color-danger-bg)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 16px',
            }}>
                <span className="material-symbols-outlined" style={{ fontSize: '26px', color: 'var(--color-danger)' }}>
                    logout
                </span>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', margin: '0 0 8px' }}>
                ¿Cerrar sesión?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>
                Se cerrará tu sesión en este dispositivo. Las operaciones pendientes de sincronización se perderán.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={onCancel}
                    disabled={isLoggingOut}
                    style={{
                        flex: 1, padding: '12px', borderRadius: '12px',
                        border: '1.5px solid var(--color-border)', background: '#fff',
                        color: 'var(--color-text-soft)', fontSize: '14px', fontWeight: 600,
                        cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                    }}
                >
                    Cancelar
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoggingOut}
                    style={{
                        flex: 1, padding: '12px', borderRadius: '12px',
                        border: 'none',
                        background: isLoggingOut ? '#fca5a5' : 'var(--color-danger)',
                        color: '#fff', fontSize: '14px', fontWeight: 700,
                        cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                >
                    {isLoggingOut ? (
                        <>
                            <div style={{
                                width: '14px', height: '14px',
                                border: '2px solid rgba(255,255,255,0.4)',
                                borderTopColor: '#fff', borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                            Saliendo...
                        </>
                    ) : (
                        'Cerrar sesión'
                    )}
                </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    </div>
)

// ─── BottomNav ────────────────────────────────────────────────────────────────

const BottomNav: React.FC = () => {
    const router      = useIonRouter()
    const currentPath = router.routeInfo.pathname
    const { user, logout, isLoggingOut } = useAuth()
    const esAdmin = user?.rol === 'ADMINISTRADOR'

    const [mostrarConfirmLogout, setMostrarConfirmLogout] = useState(false)

    const tabs = [
        { path: '/entrada',     label: 'ENTRADA',    icon: 'login' },
        { path: '/salida',      label: 'SALIDA',      icon: 'logout' },
        { path: '/ingresos',    label: 'INGRESOS',    icon: 'format_list_bulleted' },
        { path: '/ubicaciones', label: 'PARQUEADERO', icon: 'grid_view' },
        { path: '/users',       label: 'USUARIOS',    icon: 'group',    soloAdmin: true },
        { path: '/tarifas',     label: 'TARIFAS',     icon: 'payments', soloAdmin: true },
    ].filter(tab => !('soloAdmin' in tab) || !tab.soloAdmin || esAdmin)

    const handleConfirmLogout = async () => {
        await logout()
        setMostrarConfirmLogout(false)
    }

    return (
        <>
            <nav style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
                background: '#fff', borderTop: '1px solid var(--color-border)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-around',
                    alignItems: 'center', paddingTop: '8px', paddingBottom: '10px',
                }}>
                    {/* Tabs de navegación */}
                    {tabs.map(tab => {
                        const isActive = currentPath === tab.path
                        return (
                            <button
                                key={tab.path}
                                onClick={() => router.push(tab.path, 'root', 'replace')}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: '2px', background: 'none', border: 'none',
                                    outline: 'none', cursor: 'pointer',
                                    padding: '4px 6px', margin: 0,
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    transition: 'color 0.2s', flex: 1,
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{
                                        fontSize: '22px',
                                        ...(isActive ? { fontVariationSettings: "'FILL' 1" } : {}),
                                    }}
                                >
                                    {tab.icon}
                                </span>
                                <span style={{
                                    fontSize: '8px', fontWeight: 600,
                                    letterSpacing: '0.4px', lineHeight: 1.2, textAlign: 'center',
                                }}>
                                    {tab.label}
                                </span>
                            </button>
                        )
                    })}

                    {/* Botón logout — separado visualmente de los tabs de navegación */}
                    <button
                        onClick={() => setMostrarConfirmLogout(true)}
                        disabled={isLoggingOut}
                        style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '2px', background: 'none', border: 'none',
                            outline: 'none',
                            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                            padding: '4px 6px', margin: 0,
                            color: 'var(--color-danger)',
                            opacity: isLoggingOut ? 0.5 : 1,
                            transition: 'opacity 0.2s', flex: 1,
                        }}
                        title="Cerrar sesión"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                            power_settings_new
                        </span>
                        <span style={{
                            fontSize: '8px', fontWeight: 600,
                            letterSpacing: '0.4px', lineHeight: 1.2, textAlign: 'center',
                        }}>
                            SALIR
                        </span>
                    </button>
                </div>
            </nav>

            {mostrarConfirmLogout && (
                <LogoutModal
                    isLoggingOut={isLoggingOut}
                    onConfirm={handleConfirmLogout}
                    onCancel={() => setMostrarConfirmLogout(false)}
                />
            )}
        </>
    )
}

export default BottomNav