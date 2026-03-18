// src/components/BottomNav.tsx
import React from 'react'
import { useIonRouter } from '@ionic/react'
import { useAuth } from '../hooks/useAuth'

const BottomNav: React.FC = () => {
    const router      = useIonRouter()
    const currentPath = router.routeInfo.pathname
    const { user }    = useAuth()
    const esAdmin     = user?.rol === 'ADMINISTRADOR'

    const tabs = [
        { path: '/entrada',  label: 'ENTRADA',  icon: 'login' },
        { path: '/salida',   label: 'SALIDA',   icon: 'logout' },
        { path: '/ingresos', label: 'INGRESOS', icon: 'format_list_bulleted' },
        { path: '/users',    label: 'USUARIOS', icon: 'group',    soloAdmin: true },
        { path: '/tarifas',  label: 'TARIFAS',  icon: 'payments', soloAdmin: true },
    ].filter(tab => !tab.soloAdmin || esAdmin)

    return (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: '#fff', borderTop: '1px solid #e2e8f0', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingTop: '8px', paddingBottom: '10px' }}>
                {tabs.map(tab => {
                    const isActive = currentPath === tab.path || (tab.path === '/entrada' && currentPath === '/home')
                    return (
                        <button
                            key={tab.path}
                            onClick={() => router.push(tab.path, 'root', 'replace')}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', background: 'none', border: 'none', outline: 'none', cursor: 'pointer', padding: '4px 8px', margin: 0, color: isActive ? '#137fec' : '#94a3b8', transition: 'color 0.2s', flex: 1 }}
                        >
              <span className="material-symbols-outlined" style={{ fontSize: '24px', ...(isActive ? { fontVariationSettings: "'FILL' 1" } : {}) }}>
                {tab.icon}
              </span>
                            <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.5px', lineHeight: 1.2 }}>
                {tab.label}
              </span>
                        </button>
                    )
                })}
            </div>
        </nav>
    )
}

export default BottomNav