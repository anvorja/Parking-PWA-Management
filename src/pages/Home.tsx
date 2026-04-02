// src/pages/Home.tsx
import React from 'react';
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../hooks/useApp';
import './Home.css';

const Home: React.FC = () => {
    const { user } = useAuth();
    const { estadoRed } = useApp();
    const router = useIonRouter();
    const esAdmin = user?.rol === 'ADMINISTRADOR';

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-[var(--color-surface-alt)] selection:bg-primary/20">
                {/* Header estático simple */}
                <header
                    className="sticky z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3"
                    style={{ top: 'var(--network-banner-height, 0px)' }}
                >
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <span className="material-symbols-outlined text-[20px]">holiday_village</span>
                        </div>
                        <h1 className="text-base font-bold text-slate-900">Inicio</h1>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        fontSize: '11px', fontWeight: 600,
                        color: estadoRed === 'online' ? 'var(--color-success-dark)' : estadoRed === 'offline' ? 'var(--color-danger-dark)' : 'var(--color-info)',
                    }}>
                        <div style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: estadoRed === 'online' ? 'var(--color-success)' : estadoRed === 'offline' ? 'var(--color-danger)' : 'var(--color-info-light)',
                        }} />
                        {estadoRed === 'online' ? 'En línea' : estadoRed === 'offline' ? 'Sin conexión' : 'Sincronizando'}
                    </div>
                </header>

                <IonContent fullscreen className="bg-[var(--color-surface-alt)] font-display text-slate-900 antialiased" style={{ '--background': 'transparent' }}>
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        
                        {/* Tarjeta de Bienvenida Personalizada */}
                        <div className="px-4 py-5">
                            <div style={{ 
                                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
                                borderRadius: '20px', 
                                padding: '24px', 
                                color: 'white',
                                boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Decoración de fondo */}
                                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                                <div style={{ position: 'absolute', bottom: '-40px', right: '40px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                                
                                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>
                                    ¡Hola, {user?.nombreCompleto?.split(' ')[0] || user?.nombreUsuario || 'Usuario'}! 👋
                                </h2>
                                <p style={{ fontSize: '13px', margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
                                    Bienvenido al sistema de parqueadero. Estás operando con el rol de <strong style={{ fontWeight: 700, color: '#fef08a' }}>{user?.rol || 'No especificado'}</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Guía Rápida de Operación */}
                        <div className="px-4 mb-8">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>info</span>
                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-soft)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Guía Rápida de Operación
                                </h3>
                            </div>

                            {/* Timeline de Pasos */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                                {/* Línea conectora visual */}
                                <div style={{ position: 'absolute', left: '23px', top: '24px', bottom: '24px', width: '2px', background: 'var(--color-border)', zIndex: 0 }} />

                                {/* Paso 1: Entradas */}
                                <div 
                                    onClick={() => router.push('/entrada', 'root', 'replace')}
                                    style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)' }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)' }}
                                >
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 0 0 1px var(--color-border)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#3b82f6' }}>login</span>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            1. Registrar Entrada <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>chevron_right</span>
                                        </h4>
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>Ingresa la placa, asigna el espacio físico y genera un <b>ticket</b> al vehículo que llega.</p>
                                    </div>
                                </div>

                                {/* Paso 2: Ubicaciones */}
                                <div 
                                    onClick={() => router.push('/ubicaciones', 'root', 'replace')}
                                    style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)' }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)' }}
                                >
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 0 0 1px var(--color-border)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#22c55e' }}>grid_view</span>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            2. Revisar Ubicaciones <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>chevron_right</span>
                                        </h4>
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>Verifica visualmente en las ubicaciones qué lugares están <b>disponibles</b> u <b>ocupados</b>.</p>
                                    </div>
                                </div>

                                {/* Paso 3: Salidas */}
                                <div 
                                    onClick={() => router.push('/salida', 'root', 'replace')}
                                    style={{ position: 'relative', zIndex: 1, background: '#fff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '16px', display: 'flex', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)' }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)' }}
                                >
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 0 0 1px var(--color-border)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#f97316' }}>logout</span>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            3. Cobro y Salida <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>chevron_right</span>
                                        </h4>
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>Escanea el ticket o busca la placa para efectuar el <b>cobro automático</b> y librar el espacio.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controles de Administración */}
                        {esAdmin && (
                            <div className="px-4 mb-8">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <span className="material-symbols-outlined" style={{ color: 'var(--color-text-secondary)', fontSize: '20px' }}>settings</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-soft)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Panel de Administración
                                    </h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {/* Módulo Usuarios */}
                                    <div 
                                        onClick={() => router.push('/users', 'forward', 'push')}
                                        style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#c084fc' }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                                    >
                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#a855f7' }}>group</span>
                                        </div>
                                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Usuarios</h4>
                                    </div>

                                    {/* Módulo Tarifas */}
                                    <div 
                                        onClick={() => router.push('/tarifas', 'forward', 'push')}
                                        style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#fbbf24' }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                                    >
                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-warning)' }}>payments</span>
                                        </div>
                                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Tarifas</h4>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </IonContent>

                <BottomNav />
            </div>
        </IonPage>
    );
};

export default Home;