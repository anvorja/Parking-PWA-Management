import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import QRCode from 'react-qr-code';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import {
    ingresoService,
    RegistrarIngresoRequest,
    IngresoVehiculoResponse,
    TIPOS_VEHICULO,
    UBICACIONES_DEFAULT,
    Ubicacion,
} from '../services/ingresoService';

const Entrada: React.FC = () => {
    const { logout } = useAuth();

    // Form state
    const [placa, setPlaca] = useState('');
    const [selectedTipo, setSelectedTipo] = useState(TIPOS_VEHICULO[0].id);
    const [ubicaciones] = useState<Ubicacion[]>(UBICACIONES_DEFAULT);
    const [selectedUbicacion, setSelectedUbicacion] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticketData, setTicketData] = useState<IngresoVehiculoResponse | null>(null);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    React.useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const libres = ubicaciones.filter(u => u.disponible).length;

    const handlePlacaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlaca(e.target.value.toUpperCase());
    };

    const handleSubmit = async () => {
        if (!placa.trim()) {
            setToast({ message: 'Ingresa la placa del vehículo', type: 'error' });
            return;
        }
        if (!selectedUbicacion) {
            setToast({ message: 'Selecciona un espacio de parqueo', type: 'error' });
            return;
        }

        const data: RegistrarIngresoRequest = {
            placa: placa.trim(),
            idTipoVehiculo: selectedTipo,
            idUbicacion: selectedUbicacion,
        };

        try {
            setIsSubmitting(true);
            const response = await ingresoService.registrarIngreso(data);
            setTicketData(response);
            // Don't reset form yet — reset when closing ticket
        } catch (error: any) {
            console.error('Error al registrar ingreso:', error);
            setToast({ message: error.message || 'Error al registrar el ingreso', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseTicket = () => {
        setTicketData(null);
        setPlaca('');
        setSelectedUbicacion(null);
        setSelectedTipo(TIPOS_VEHICULO[0].id);
        setToast({ message: 'Tiquete generado exitosamente', type: 'success' });
    };

    const formatFecha = (iso: string) => {
        const d = new Date(iso);
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const hours = d.getHours();
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${day} ${month}, ${h12}:${mins} ${ampm}`;
    };

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white selection:bg-primary/20">
                {/* Header */}
                <header
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        background: '#fff',
                        padding: '12px 16px',
                    }}
                >
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: '#137fec',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            flexShrink: 0,
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
                    </div>
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Registrar Ingreso</h1>
                </header>

                <IonContent fullscreen style={{ '--background': '#f8fafc' }}>
                    <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '140px' }}>

                        {/* Placa del Vehículo */}
                        <section>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '8px',
                                }}
                            >
                                Placa del Vehículo
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={placa}
                                    onChange={handlePlacaChange}
                                    maxLength={8}
                                    placeholder="ABC-1234"
                                    style={{
                                        width: '100%',
                                        fontSize: '24px',
                                        fontWeight: 900,
                                        textAlign: 'center',
                                        padding: '12px 50px 12px 16px',
                                        borderRadius: '10px',
                                        border: '2px solid #cbd5e1',
                                        background: '#fff',
                                        color: '#0f172a',
                                        outline: 'none',
                                        textTransform: 'uppercase',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#137fec'; }}
                                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#94a3b8',
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>photo_camera</span>
                                </div>
                            </div>
                        </section>

                        {/* Seleccionar Espacio */}
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                <label
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                    }}
                                >
                                    Seleccionar Espacio
                                </label>
                                <span
                                    style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#137fec',
                                        background: 'rgba(19, 127, 236, 0.1)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                    }}
                                >
                                    {libres} Libres
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {ubicaciones.map(ub => {
                                    const isSelected = selectedUbicacion === ub.id;
                                    const isDisabled = !ub.disponible;
                                    return (
                                        <button
                                            key={ub.id}
                                            disabled={isDisabled}
                                            onClick={() => setSelectedUbicacion(ub.id)}
                                            style={{
                                                padding: '10px 4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '10px',
                                                border: isSelected
                                                    ? '2px solid #137fec'
                                                    : isDisabled
                                                        ? '2px solid #f1f5f9'
                                                        : '2px solid #e2e8f0',
                                                background: isSelected
                                                    ? '#137fec'
                                                    : isDisabled
                                                        ? '#f1f5f9'
                                                        : '#fff',
                                                color: isSelected
                                                    ? '#fff'
                                                    : isDisabled
                                                        ? '#94a3b8'
                                                        : '#334155',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                fontWeight: 700,
                                                transition: 'all 0.15s',
                                                outline: 'none',
                                                margin: 0,
                                                boxShadow: isSelected ? '0 4px 14px rgba(19, 127, 236, 0.3)' : 'none',
                                            }}
                                        >
                                            <span style={{ fontSize: '10px', opacity: isSelected ? 0.8 : 0.6 }}>
                                                {ub.nombre.charAt(0)}
                                            </span>
                                            <span style={{ fontSize: '18px', textDecoration: isDisabled ? 'line-through' : 'none' }}>
                                                {ub.nombre.slice(1)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Tipo de Vehículo */}
                        <section>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    marginBottom: '8px',
                                }}
                            >
                                Tipo de Vehículo
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {TIPOS_VEHICULO.map(tipo => {
                                    const isActive = selectedTipo === tipo.id;
                                    return (
                                        <button
                                            key={tipo.id}
                                            onClick={() => setSelectedTipo(tipo.id)}
                                            style={{
                                                flex: 1,
                                                padding: '10px 8px',
                                                borderRadius: '10px',
                                                border: isActive ? '2px solid #137fec' : '2px solid #e2e8f0',
                                                background: '#fff',
                                                color: isActive ? '#137fec' : '#64748b',
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.15s',
                                                outline: 'none',
                                                boxShadow: isActive ? '0 0 0 3px rgba(19, 127, 236, 0.08)' : 'none',
                                                margin: 0,
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                                                {tipo.icono}
                                            </span>
                                            {tipo.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </IonContent>

                {/* Generar Tiquete Button - Fixed */}
                <div
                    style={{
                        position: 'fixed',
                        bottom: '72px',
                        left: 0,
                        right: 0,
                        padding: '12px 16px',
                        zIndex: 25,
                        background: 'linear-gradient(to top, #f8fafc 60%, transparent)',
                    }}
                >
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #137fec 0%, #0b63be 100%)',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            boxShadow: '0 6px 20px rgba(19, 127, 236, 0.35)',
                            transition: 'all 0.2s',
                            opacity: isSubmitting ? 0.7 : 1,
                            outline: 'none',
                            margin: 0,
                        }}
                        onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.boxShadow = '0 8px 28px rgba(19, 127, 236, 0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(19, 127, 236, 0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        {isSubmitting ? (
                            <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>qr_code_2</span>
                                Generar Tiquete
                            </>
                        )}
                    </button>
                </div>

                <BottomNav />

                {/* ===== TICKET MODAL ===== */}
                {ticketData && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                            background: '#f0f4f8',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Ticket Header */}
                        <header
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: '#fff',
                                borderBottom: '1px solid #e2e8f0',
                            }}
                        >
                            <button
                                onClick={handleCloseTicket}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: '4px', outline: 'none' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
                            </button>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Vista de Tiquete</h2>
                            <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: '4px', outline: 'none' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>share</span>
                            </button>
                        </header>

                        {/* Ticket Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px' }}>
                            <div
                                style={{
                                    background: '#fff',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                                }}
                            >
                                {/* Top section: parking name */}
                                <div style={{ textAlign: 'center', padding: '20px 20px 16px' }}>
                                    <div
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: '#e0ecff',
                                            color: '#137fec',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 10px',
                                            fontWeight: 700,
                                            fontSize: '18px',
                                        }}
                                    >
                                        P
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>Estacionamiento Central</div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Parqueadero Universitario</div>
                                </div>

                                {/* Plate & Location */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 14px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Placa</div>
                                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>{ticketData.placa}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ubicación</div>
                                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#137fec' }}>{ticketData.ubicacion}</div>
                                    </div>
                                </div>

                                {/* Entry time */}
                                <div style={{ margin: '0 20px 16px', background: '#f8fafc', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hora de Entrada</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{formatFecha(ticketData.fechaHoraIngreso)}</div>
                                </div>

                                {/* QR Code */}
                                <div
                                    style={{
                                        margin: '0 20px 16px',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        textAlign: 'center',
                                    }}
                                >
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#137fec', letterSpacing: '2px', marginBottom: '12px' }}>PARKING TICKET</div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <QRCode
                                            value={JSON.stringify({
                                                id: ticketData.idIngreso,
                                                placa: ticketData.placa,
                                                ubicacion: ticketData.ubicacion,
                                                entrada: ticketData.fechaHoraIngreso,
                                            })}
                                            size={140}
                                            level="M"
                                        />
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }}>Parking Ticket</div>
                                </div>

                                {/* Ticket ID */}
                                <div style={{ textAlign: 'center', padding: '0 20px 12px' }}>
                                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8', letterSpacing: '1px' }}>ID: #{String(ticketData.idIngreso).padStart(9, '0')}</span>
                                </div>

                                {/* Dashed separator */}
                                <div style={{ margin: '0 16px 16px', borderTop: '2px dashed #e2e8f0' }}></div>
                            </div>
                        </div>

                        {/* Bottom Buttons */}
                        <div
                            style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                display: 'flex',
                                gap: '10px',
                                padding: '12px 16px',
                                background: '#fff',
                                borderTop: '1px solid #e2e8f0',
                                zIndex: 61,
                            }}
                        >
                            <button
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #137fec 0%, #0b63be 100%)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(19, 127, 236, 0.3)',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(19, 127, 236, 0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(19, 127, 236, 0.3)'; }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                                Descargar PDF
                            </button>
                            <button
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    background: '#fff',
                                    color: '#334155',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
                                Imprimir
                            </button>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div
                        style={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: '#fff',
                            borderRadius: '14px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                            padding: '14px 20px',
                            minWidth: '260px',
                            maxWidth: '380px',
                            border: toast.type === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                            animation: 'slideInRight 0.35s ease-out',
                        }}
                    >
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    fontSize: '18px',
                                    color: toast.type === 'success' ? '#16a34a' : '#dc2626',
                                }}
                            >
                                {toast.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            style={{
                                marginLeft: 'auto',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94a3b8',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                outline: 'none',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                    </div>
                )}
            </div>
        </IonPage>
    );
};

export default Entrada;
