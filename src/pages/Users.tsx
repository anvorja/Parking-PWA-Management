import React, { useState, useEffect } from 'react';
import { IonPage, IonContent, useIonRouter } from '@ionic/react';
import { usuarioService, UsuarioListItemResponse } from '../services/usuarioService';
import BottomNav from '../components/BottomNav';

const Users: React.FC = () => {
    const [usuarios, setUsuarios] = useState<UsuarioListItemResponse[]>([]);
    const [filteredUsuarios, setFilteredUsuarios] = useState<UsuarioListItemResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('Todos');
    const [isLoading, setIsLoading] = useState(true);
    const router = useIonRouter();

    useEffect(() => {
        loadUsuarios();
    }, []);

    const loadUsuarios = async () => {
        try {
            setIsLoading(true);
            const data = await usuarioService.getUsuarios();
            setUsuarios(data);
            setFilteredUsuarios(data);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let result = usuarios;

        if (selectedRole !== 'Todos') {
            result = result.filter(u => u.rol === selectedRole);
        }

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.nombreCompleto.toLowerCase().includes(query) ||
                u.nombreUsuario.toLowerCase().includes(query)
            );
        }

        setFilteredUsuarios(result);
    }, [searchQuery, selectedRole, usuarios]);

    // Calcular conteos para los chips (Asumiendo que los roles vienen como ADMINISTRADOR y OPERADOR)
    const countTodos = usuarios.length;
    const countAdmin = usuarios.filter(u => u.rol === 'ADMINISTRADOR').length;
    const countOperador = usuarios.filter(u => u.rol === 'OPERADOR').length;

    // Helper functions para el UI
    const getRoleDisplayName = (rol: string) => {
        if (rol === 'ADMINISTRADOR') return 'Administrador';
        if (rol === 'OPERADOR') return 'Operador';
        // Capitalize primera letra por si acaso
        return rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase();
    };

    const getRoleClasses = (rol: string) => {
        if (rol === 'ADMINISTRADOR') return 'bg-purple-50 text-purple-700 ring-purple-700/10';
        return 'bg-blue-50 text-blue-700 ring-blue-700/10';
    };

    const getRoleDotClass = (rol: string) => {
        if (rol === 'ADMINISTRADOR') return 'bg-green-500';
        // En el diseño Maria tiene un dot gris y Carlos verde, asumiremos que todos son verde activo por ahora
        return 'bg-green-500';
    };

    // Obtenemos una imagen de avatar real como en el diseño (o usamos avatar genérico)
    // Como no tenemos avatares desde el backend, vamos a simular con UI avatars
    const getAvatarSrc = (name: string) => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
    };

    const handleBack = () => {
        router.goBack();
    };

    return (
        <IonPage>
            <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white selection:bg-primary/20">
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-2.5 pt-safe-top">
                    <div className="w-8">
                        <button onClick={handleBack} className="text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                    </div>
                    <h1 className="text-base font-semibold text-slate-900 flex-1 text-center truncate">Gestión de Usuarios</h1>
                    <div className="w-8 flex justify-end">
                        <button className="text-primary hover:text-primary/80 transition-colors">
                            <span className="material-symbols-outlined text-blue-500">settings</span>
                        </button>
                    </div>
                </header>

                <IonContent fullscreen className="bg-[#f6f7f8] font-display text-slate-900 antialiased" style={{ '--background': 'transparent' }}>
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        {/* Buscador */}
                        <div className="sticky top-0 z-10 bg-white px-4 py-2 shadow-sm border-b border-slate-100">
                            <label className="relative flex w-full items-center">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined text-[18px]">search</span>
                                </div>
                                <input
                                    className="block w-full rounded-lg border-none bg-slate-100 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-500 focus:ring-1 focus:ring-primary/50 outline-none"
                                    placeholder="Buscar usuario..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </label>
                        </div>

                        {/* Filtros */}
                        <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar bg-white">
                            <div
                                onClick={() => setSelectedRole('Todos')}
                                className={`flex items-center gap-2 px-4 py-[6px] text-[13px] font-semibold whitespace-nowrap border cursor-pointer select-none transition-all ${selectedRole === 'Todos' ? 'bg-[#eef5fe] text-[#2563eb] border-[#bfdbfe]' : 'bg-[#f8fafc] text-slate-500 border-transparent hover:bg-slate-100'}`}
                                style={{ borderRadius: '9999px' }}
                            >
                                Todos <span className={`flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold ${selectedRole === 'Todos' ? 'bg-white text-[#2563eb] shadow-sm' : 'bg-[#e2e8f0] text-slate-500'}`} style={{ borderRadius: '9999px' }}>{countTodos}</span>
                            </div>
                            <div
                                onClick={() => setSelectedRole('ADMINISTRADOR')}
                                className={`flex items-center gap-2 px-4 py-[6px] text-[13px] font-semibold whitespace-nowrap border cursor-pointer select-none transition-all ${selectedRole === 'ADMINISTRADOR' ? 'bg-[#eef5fe] text-[#2563eb] border-[#bfdbfe]' : 'bg-[#f8fafc] text-slate-500 border-transparent hover:bg-slate-100'}`}
                                style={{ borderRadius: '9999px' }}
                            >
                                Admin <span className={`flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold ${selectedRole === 'ADMINISTRADOR' ? 'bg-white text-[#2563eb] shadow-sm' : 'bg-[#e2e8f0] text-slate-500'}`} style={{ borderRadius: '9999px' }}>{countAdmin}</span>
                            </div>
                            <div
                                onClick={() => setSelectedRole('OPERADOR')}
                                className={`flex items-center gap-2 px-4 py-[6px] text-[13px] font-semibold whitespace-nowrap border cursor-pointer select-none transition-all ${selectedRole === 'OPERADOR' ? 'bg-[#eef5fe] text-[#2563eb] border-[#bfdbfe]' : 'bg-[#f8fafc] text-slate-500 border-transparent hover:bg-slate-100'}`}
                                style={{ borderRadius: '9999px' }}
                            >
                                Operador <span className={`flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold ${selectedRole === 'OPERADOR' ? 'bg-white text-[#2563eb] shadow-sm' : 'bg-[#e2e8f0] text-slate-500'}`} style={{ borderRadius: '9999px' }}>{countOperador}</span>
                            </div>
                        </div>

                        <div className="px-4 pt-4 pb-2">
                            <h3 className="text-xs font-semibold tracking-wider text-slate-500">Lista de Usuarios</h3>
                        </div>

                        {/* Lista */}
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100 bg-white">
                                {filteredUsuarios.length === 0 ? (
                                    <li className="p-8 text-center text-slate-500 text-sm">No se encontraron usuarios</li>
                                ) : (
                                    filteredUsuarios.map((usuario) => (
                                        <li key={usuario.id} className="group relative flex items-center justify-between p-3 px-4 hover:bg-slate-50 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img src={getAvatarSrc(usuario.nombreCompleto)} alt={usuario.nombreCompleto} className="h-10 w-10 rounded-full object-cover bg-slate-200" />
                                                    <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ${getRoleDotClass(usuario.rol)} ring-[1.5px] ring-white`}></span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-[13px] font-semibold text-slate-900 leading-tight">{usuario.nombreCompleto}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getRoleClasses(usuario.rol)}`}>
                                                            {getRoleDisplayName(usuario.rol)}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-medium">• ID: {usuario.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button className="p-2 text-slate-400 hover:text-blue-500 transition-all duration-200 rounded-full hover:bg-blue-50/80 active:scale-95">
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 transition-all duration-200 rounded-full hover:bg-slate-100 active:scale-95">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                        <div className="h-24"></div>
                    </div>
                </IonContent>

                {/* Floating Add Button */}
                <button className="fixed bottom-[80px] right-5 z-20 flex h-[52px] w-[52px] items-center justify-center bg-[#137fec] text-white shadow-xl shadow-blue-500/30 hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 focus:outline-none" style={{ borderRadius: '9999px' }}>
                    <span className="material-symbols-outlined text-[28px]">add</span>
                </button>

                <BottomNav />
            </div>
        </IonPage>
    );
};

export default Users;
