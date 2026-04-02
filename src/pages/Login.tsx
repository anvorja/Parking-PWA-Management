// src/pages/Login.tsx
import {
    IonContent,
    IonPage,
    useIonRouter,
    IonSpinner
} from '@ionic/react';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../hooks/useApp';
import { EstadoRed } from '../contexts/AppContext';

// ─── Subcomponente: banner de estado de red ──────────────────────────────────
// Reutiliza la misma lógica visual que el Home y el resto de páginas,
// pero adaptada al contexto del Login (sin sesión activa todavía).

interface LoginNetworkBannerProps {
    estadoRed: EstadoRed
}

const LoginNetworkBanner: React.FC<LoginNetworkBannerProps> = ({ estadoRed }) => {
    if (estadoRed === 'online') {
        return (
            <div className="w-full bg-surface-light border-b border-slate-200 px-4 py-2 flex items-center justify-center text-xs font-medium text-emerald-600">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Conectado (Online)</span>
                </div>
            </div>
        )
    }

    if (estadoRed === 'offline') {
        return (
            <div className="w-full border-b border-yellow-300 bg-yellow-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-yellow-800">
                <span className="material-symbols-outlined text-[16px]">wifi_off</span>
                <span>Sin conexión — revisa tu red</span>
            </div>
        )
    }

    // sincronizando | error_sync — estados que no aplican en el login,
    // pero se muestran de forma neutra para no confundir al usuario
    return (
        <div className="w-full border-b border-blue-200 bg-blue-50 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-blue-800">
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Verificando conexión...</span>
        </div>
    )
}

// ─── Página de Login ──────────────────────────────────────────────────────────

const Login: React.FC = () => {
    const { login, token, isLoading: authLoading } = useAuth();
    const { estadoRed } = useApp();
    const router = useIonRouter();

    const [username, setUsername]         = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]               = useState('');
    const [fieldErrors, setFieldErrors]   = useState<{ username?: string; password?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (token && !authLoading) {
            router.push('/home', 'forward', 'replace');
        }
    }, [token, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setError('');
        const newFieldErrors: { username?: string; password?: string } = {};

        if (!username) newFieldErrors.username = 'El usuario es obligatorio.';
        if (!password) newFieldErrors.password = 'La contraseña es obligatoria.';

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            return;
        }

        setFieldErrors({});
        setIsSubmitting(true);

        try {
            await login({ username, password });
            router.push('/home', 'forward', 'replace');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Credenciales inválidas';
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <IonPage>
            <IonContent fullscreen className="ion-padding" style={{ '--background': 'transparent', '--padding-bottom': '0', '--padding-end': '0', '--padding-start': '0', '--padding-top': '0' }}>
                <div className="bg-background-light text-slate-900 font-display antialiased min-h-screen flex flex-col overflow-x-hidden selection:bg-primary/20">
                    <LoginNetworkBanner estadoRed={estadoRed} />
                    <div className="flex-1 flex flex-col w-full max-w-md mx-auto bg-surface-light shadow-sm min-h-screen sm:min-h-0 sm:h-auto sm:my-8 sm:rounded-xl">
                        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-10 sm:pt-12">
                            <div className="w-full flex flex-col items-center justify-center mb-8">
                                <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 shadow-sm">
                                    <span className="font-bold text-[70px]">P</span>
                                </div>
                                <div className="text-center">
                                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido</h1>
                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Ingresa tus credenciales para acceder al panel de gestión</p>
                                </div>
                            </div>
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl text-center">
                                    {error}
                                </div>
                            )}
                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div className="group relative">
                                    <label
                                        className={`block text-sm font-medium mb-1.5 ml-1 ${fieldErrors.username ? 'text-red-500' : 'text-slate-700'}`}
                                        htmlFor="username"
                                    >
                                        Usuario o Correo Electrónico
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            className={`peer w-full h-12 pl-4 pr-10 rounded-xl bg-slate-50 border text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                                                fieldErrors.username
                                                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                                                    : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary'
                                            }`}
                                            id="username"
                                            name="username"
                                            placeholder="admin o usuario@parking.com"
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        <div className="absolute right-3 text-slate-400 pointer-events-none peer-focus:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">person</span>
                                        </div>
                                    </div>
                                    {fieldErrors.username && (
                                        <p className="mt-1.5 text-sm text-red-500 ml-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">error</span>
                                            {fieldErrors.username}
                                        </p>
                                    )}
                                </div>
                                <div className="group relative">
                                    <label
                                        className={`block text-sm font-medium mb-1.5 ml-1 ${fieldErrors.password ? 'text-red-500' : 'text-slate-700'}`}
                                        htmlFor="password"
                                    >
                                        Contraseña
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            className={`peer w-full h-12 pl-4 pr-12 rounded-xl bg-slate-50 border text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                                                fieldErrors.password
                                                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                                                    : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary'
                                            }`}
                                            id="password"
                                            name="password"
                                            placeholder="••••••••"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        <div className="absolute right-3 flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(v => !v)}
                                                className="text-slate-400 hover:text-primary transition-colors p-1 rounded-md"
                                                tabIndex={-1}
                                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                            >
                                              <span className="material-symbols-outlined text-[20px]">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                              </span>
                                            </button>
                                        </div>
                                    </div>
                                    {fieldErrors.password && (
                                        <p className="mt-1.5 text-sm text-red-500 ml-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[16px]">error</span>
                                            {fieldErrors.password}
                                        </p>
                                    )}
                                    <div className="flex justify-end mt-2">
                                        <a className="text-xs font-medium text-primary hover:text-primary-dark transition-colors" href="#">¿Olvidaste tu contraseña?</a>
                                    </div>
                                </div>
                                <div className="h-4" />
                                <button
                                    className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <IonSpinner name="crescent" className="h-5 w-5 text-white" />
                                    ) : (
                                        <>
                                            <span>Ingresar</span>
                                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                        <div className="p-4 text-center">
                            <p className="text-xs text-slate-400">Versión 0.0.1 • Sync Active</p>
                        </div>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Login;