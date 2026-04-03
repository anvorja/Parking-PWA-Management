// src/components/BottomNav.tsx
import React, { useState } from 'react'
import { useIonRouter } from '@ionic/react'
import { useAuth }      from '../hooks/useAuth'
import { useSidebar }   from '../context/SidebarContext'

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
                        flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
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
                    ) : 'Cerrar sesión'}
                </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    </div>
)

// ─── BottomNav ────────────────────────────────────────────────────────────────
// Mobile (<md) : barra de tabs fija en la parte inferior
// Desktop (md+): sidebar vertical fijo a la izquierda, colapsable/expandible

const BottomNav: React.FC = () => {
    const router      = useIonRouter()
    const currentPath = router.routeInfo.pathname
    const { user, logout, isLoggingOut } = useAuth()
    const { collapsed, toggle } = useSidebar()
    const esAdmin = user?.rol === 'ADMINISTRADOR'

    const [mostrarConfirmLogout, setMostrarConfirmLogout] = useState(false)

    const tabs = [
        { path: '/entrada',     label: 'ENTRADA',    icon: 'login' },
        { path: '/salida',      label: 'SALIDA',     icon: 'logout' },
        { path: '/ingresos',    label: 'INGRESOS',   icon: 'format_list_bulleted' },
        { path: '/ubicaciones', label: 'PARQUEADERO',icon: 'grid_view' },
        { path: '/users',       label: 'USUARIOS',   icon: 'group',    soloAdmin: true },
        { path: '/tarifas',     label: 'TARIFAS',    icon: 'payments', soloAdmin: true },
    ].filter(tab => !('soloAdmin' in tab) || !tab.soloAdmin || esAdmin)

    const handleConfirmLogout = async () => {
        await logout()
        setMostrarConfirmLogout(false)
    }

    return (
        <>
            {/* ── Mobile: bottom bar | Desktop: sidebar colapsable ── */}
            <nav
                className={[
                    'fixed z-30 bg-white flex flex-col',
                    // Mobile: barra inferior
                    'bottom-0 left-0 right-0 border-t border-slate-200',
                    // Desktop: sidebar izquierdo con ancho dinámico
                    'md:bottom-auto md:right-auto md:top-0 md:h-screen',
                    'md:border-t-0 md:border-r md:border-slate-200',
                    // Ancho según estado: colapsado = 56px (w-14), expandido = 224px (w-56)
                    collapsed ? 'md:w-14' : 'md:w-56',
                    'md:transition-[width] md:duration-300 md:ease-in-out',
                ].join(' ')}
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                {/* ── Brand header + toggle — solo desktop ── */}
                <div className={[
                    'hidden md:flex items-center border-b border-slate-100 flex-shrink-0',
                    collapsed ? 'justify-center px-0 py-4' : 'justify-between px-3 py-4',
                ].join(' ')}>
                    {/* Logo/brand — oculto cuando colapsado */}
                    {!collapsed && (
                        <div className="flex items-center gap-3 overflow-hidden">
                            <img
                                src="/assets/icon/parking-icon.png"
                                alt="Parking"
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                                <p className="text-[15px] font-bold text-slate-800 leading-tight m-0 truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>ParkingApp</p>
                                <p className="text-[11px] text-slate-400 leading-tight m-0" style={{ fontFamily: 'Roboto, sans-serif' }}>Gestión</p>
                            </div>
                        </div>
                    )}

                    {/* Logo solo (colapsado) → parking-icon.png */}
                    {collapsed && (
                        <img
                            src="/assets/icon/parking-icon.png"
                            alt="Parking"
                            className="w-8 h-8 rounded-lg object-cover"
                        />
                    )}

                    {/* Botón toggle — separado cuando expandido, aparte cuando colapsado */}
                    {!collapsed && (
                        <button
                            onClick={toggle}
                            title="Colapsar menú"
                            className="flex-shrink-0 w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
                            style={{ border: 'none', outline: 'none', background: 'none', padding: 0, margin: 0 }}
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                    )}
                </div>

                {/* Botón toggle colapsado — debajo del logo, centrado */}
                {collapsed && (
                    <div className="hidden md:flex justify-center py-2 flex-shrink-0">
                        <button
                            onClick={toggle}
                            title="Expandir menú"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                            style={{ border: 'none', outline: 'none', background: 'none', padding: 0, margin: 0 }}
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>
                )}

                {/* ── Tabs de navegación ── */}
                <div className={[
                    // Mobile: fila horizontal
                    'flex flex-row justify-around items-center pt-2 pb-[2px]',
                    // Desktop: columna vertical
                    'md:flex-col md:flex-1 md:justify-start md:gap-1 md:py-3 md:overflow-y-auto',
                    collapsed ? 'md:px-1 md:items-center' : 'md:px-2',
                ].join(' ')}>
                    {tabs.map(tab => {
                        const isActive = currentPath === tab.path
                        return (
                            <button
                                key={tab.path}
                                onClick={() => router.push(tab.path, 'root', 'replace')}
                                title={collapsed ? (tab.label.charAt(0) + tab.label.slice(1).toLowerCase()) : undefined}
                                className={[
                                    // Base mobile
                                    'flex flex-col items-center justify-center gap-0.5 flex-1 p-1',
                                    // Desktop
                                    'md:flex-row md:flex-none md:w-full md:py-2.5 md:rounded-xl',
                                    collapsed
                                        ? 'md:justify-center md:px-0'
                                        : 'md:gap-3 md:px-3 md:justify-start',
                                    'border-none outline-none cursor-pointer transition-colors duration-150',
                                    isActive
                                        ? 'md:bg-blue-50'
                                        : 'text-slate-400 md:text-slate-500 md:hover:bg-slate-50',
                                ].join(' ')}
                                style={{
                                    background: 'none', margin: 0,
                                    color: isActive ? 'var(--color-primary)' : undefined,
                                }}
                            >
                                <span
                                    className="material-symbols-outlined text-[22px] md:text-[20px]"
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                                >
                                    {tab.icon}
                                </span>
                                {/* Mobile: etiqueta uppercase compacta */}
                                <span className="md:hidden text-[8px] font-semibold tracking-[0.4px] leading-tight text-center">
                                    {tab.label}
                                </span>
                                {/* Desktop expandido: etiqueta sentence case */}
                                {!collapsed && (
                                    <span className="hidden md:inline text-[15px] font-medium leading-none truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>
                                        {tab.label.charAt(0) + tab.label.slice(1).toLowerCase()}
                                    </span>
                                )}
                            </button>
                        )
                    })}

                    {/* Logout — mobile inline con los tabs */}
                    <button
                        onClick={() => setMostrarConfirmLogout(true)}
                        disabled={isLoggingOut}
                        className={[
                            'md:hidden',
                            'flex flex-col items-center justify-center gap-0.5 flex-1 p-1 pb-[10px]',
                            'border-none outline-none transition-opacity duration-200',
                            isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                        style={{ background: 'none', margin: 0, color: 'var(--color-danger)' }}
                    >
                        <span className="material-symbols-outlined text-[22px]">power_settings_new</span>
                        <span className="text-[8px] font-semibold tracking-[0.4px] leading-tight">SALIR</span>
                    </button>
                </div>

                {/* ── Logout — desktop sidebar, anclado al fondo ── */}
                <div className={[
                    'hidden md:block flex-shrink-0 border-t border-slate-100',
                    collapsed ? 'px-1 py-3' : 'px-2 py-3',
                ].join(' ')}>
                    <button
                        onClick={() => setMostrarConfirmLogout(true)}
                        disabled={isLoggingOut}
                        title={collapsed ? 'Cerrar sesión' : undefined}
                        className={[
                            'flex items-center w-full py-2.5 rounded-xl',
                            collapsed ? 'justify-center px-0' : 'flex-row gap-3 px-3 justify-start',
                            'border-none outline-none transition-colors duration-150',
                            'text-[13px] font-medium hover:bg-red-50',
                            isLoggingOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                        style={{ background: 'none', margin: 0, color: 'var(--color-danger)' }}
                    >
                        <span className="material-symbols-outlined text-[20px]">power_settings_new</span>
                        {!collapsed && (
                            <span className="hidden md:inline text-[15px] truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>Cerrar sesión</span>
                        )}
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
