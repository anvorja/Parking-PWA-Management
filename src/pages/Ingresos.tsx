// src/pages/Ingresos.tsx
//
// HU-018 — Listado de Registros de Ingreso de Vehículos
// Scroll infinito: IntersectionObserver detecta el sentinel al final de la lista
// y llama cargarMas() automáticamente. El usuario solo hace scroll.

import React, { useEffect, useRef } from 'react'
import { IonPage, IonContent } from '@ionic/react'
import { useIngresos } from '../hooks/useIngresos'
import BottomNav from '../components/BottomNav'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatFecha(iso: string): string {
    const d     = new Date(iso)
    const day   = d.getDate()
    const month = MESES[d.getMonth()]
    const h     = d.getHours()
    const m     = d.getMinutes().toString().padStart(2, '0')
    const ampm  = h >= 12 ? 'PM' : 'AM'
    const h12   = h % 12 || 12
    return `${day} ${month}, ${h12}:${m} ${ampm}`
}

function getEstadoStyle(estado: string): { bg: string; text: string; dot: string } {
    switch (estado.toUpperCase()) {
        case 'INGRESADO': return { bg: '#ecfdf5', text: '#059669', dot: '#10b981' }
        case 'ENTREGADO': return { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' }
        default:          return { bg: '#fef9c3', text: '#92400e', dot: '#f59e0b' }
    }
}

function getTipoIcon(tipo: string): string {
    return tipo.toUpperCase() === 'MOTO' ? 'two_wheeler' : 'directions_car'
}

// ─── Skeleton de carga inicial ────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #f1f5f9', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[['60%', '24%'], ['40%', '30%'], ['50%', '18%']].map(([w1, w2], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: w1, height: '14px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: w2, height: '14px', background: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
        </div>
    )
}

// ─── Componente ───────────────────────────────────────────────────────────────

const Ingresos: React.FC = () => {
    const {
        ingresos,
        isLoading,
        isLoadingMore,
        hasMore,
        totalElements,
        isOnline,
        filtroPlaca,
        setFiltroPlaca,
        cargarMas,
    } = useIngresos()

    // ── Debounce del filtro ────────────────────────────────────────────────────
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = e.target.value.toUpperCase()
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setFiltroPlaca(valor), 350)
    }

    const handleLimpiarFiltro = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        setFiltroPlaca('')
    }

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

    // ── IntersectionObserver — sentinel al final de la lista ──────────────────
    // Cuando el div invisible (#sentinel) entra en el viewport, se llama cargarMas().
    // Esto simula el scroll infinito sin ningún evento de scroll manual.

    const sentinelRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    cargarMas()
                }
            },
            { threshold: 0.1 }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore, isLoadingMore, cargarMas])

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white">

                {/* Header */}
                <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '12px 16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#137fec', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>format_list_bulleted</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Registros de Ingreso</h1>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                            {isLoading ? 'Cargando...' : `${totalElements} ${totalElements === 1 ? 'registro' : 'registros'}`}
                        </p>
                    </div>
                    {/* Indicador de conexión */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: isOnline ? '#059669' : '#dc2626' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444' }} />
                        {isOnline ? 'En línea' : 'Sin conexión'}
                    </div>
                </header>

                <IonContent fullscreen style={{ '--background': '#f8fafc' }}>
                    <div style={{ paddingBottom: '88px' }}>

                        {/* SUB-3: Banner offline */}
                        {!isOnline && (
                            <div style={{ margin: '12px 16px 0', padding: '10px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#d97706' }}>wifi_off</span>
                                <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.4 }}>
                                    <strong>Sin conexión</strong> — mostrando registros guardados localmente
                                </p>
                            </div>
                        )}

                        {/* Buscador */}
                        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                            <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', fontSize: '18px', color: '#94a3b8', pointerEvents: 'none' }}>search</span>
                                <input
                                    type="text"
                                    defaultValue={filtroPlaca}
                                    onChange={handleFiltroChange}
                                    placeholder="Buscar por placa..."
                                    style={{ width: '100%', padding: '9px 36px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }}
                                    onFocus={e => { e.target.style.borderColor = '#137fec' }}
                                    onBlur={e  => { e.target.style.borderColor = '#e2e8f0' }}
                                />
                                {filtroPlaca && (
                                    <button
                                        onClick={handleLimpiarFiltro}
                                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                                    </button>
                                )}
                            </label>
                        </div>

                        {/* ── Lista ──────────────────────────────────────────────────────── */}

                        {isLoading ? (
                            // Skeleton de carga inicial — 4 tarjetas fantasma
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[1,2,3,4].map(n => <SkeletonCard key={n} />)}
                            </div>

                        ) : ingresos.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '12px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>directions_car</span>
                                <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                                    {filtroPlaca
                                        ? `No se encontraron registros con placa "${filtroPlaca}"`
                                        : 'No hay registros de ingreso'}
                                </p>
                            </div>

                        ) : (
                            <>
                                <ul style={{ listStyle: 'none', margin: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {ingresos.map(ingreso => {
                                        const estadoStyle = getEstadoStyle(ingreso.estadoIngreso)
                                        const esIngresado = ingreso.estadoIngreso.toUpperCase() === 'INGRESADO'

                                        return (
                                            <li
                                                key={ingreso.idIngreso}
                                                style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #f1f5f9', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                                            >
                                                {/* Placa + estado */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#137fec' }}>
                              {getTipoIcon(ingreso.tipoVehiculo)}
                            </span>
                                                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>
                              {ingreso.placa}
                            </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: estadoStyle.bg, color: estadoStyle.text, borderRadius: '9999px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: estadoStyle.dot }} />
                                                        {ingreso.estadoIngreso}
                                                    </div>
                                                </div>

                                                {/* Ubicación + fecha */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8' }}>location_on</span>
                                                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{ingreso.ubicacion}</span>
                                                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>•</span>
                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{ingreso.tipoVehiculo}</span>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatFecha(ingreso.fechaHoraIngreso)}</span>
                                                </div>

                                                {/* Operador + ID */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#cbd5e1' }}>person</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ingreso.usuarioRegistro}</span>
                                                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>·</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{ingreso.idIngreso}</span>
                                                </div>

                                                {/* SUB-3: Botón salida — solo si INGRESADO, deshabilitado offline */}
                                                {esIngresado && (
                                                    <button
                                                        disabled={!isOnline}
                                                        style={{ width: '100%', padding: '9px', borderRadius: '10px', border: 'none', background: isOnline ? '#137fec' : '#e2e8f0', color: isOnline ? '#fff' : '#94a3b8', fontSize: '13px', fontWeight: 700, cursor: isOnline ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.2s' }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                                                        {isOnline ? 'Registrar Salida' : 'No disponible sin conexión'}
                                                    </button>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>

                                {/* Sentinel — div invisible que dispara cargarMas() al entrar en viewport */}
                                <div ref={sentinelRef} style={{ height: '1px' }} />

                                {/* Spinner de "cargando más" al fondo */}
                                {isLoadingMore && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
                                        <div style={{ width: '18px', height: '18px', border: '2px solid #e2e8f0', borderTopColor: '#137fec', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                                        Cargando más registros...
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                    </div>
                                )}

                                {/* Fin de la lista */}
                                {!hasMore && !isLoadingMore && ingresos.length > 0 && (
                                    <p style={{ textAlign: 'center', fontSize: '11px', color: '#cbd5e1', padding: '12px 0 4px', margin: 0 }}>
                                        — {totalElements} {totalElements === 1 ? 'registro' : 'registros'} en total —
                                    </p>
                                )}
                            </>
                        )}

                    </div>
                </IonContent>

                <BottomNav />
            </div>
        </IonPage>
    )
}

export default Ingresos