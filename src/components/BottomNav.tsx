import React from 'react';
import { useIonRouter } from '@ionic/react';

const BottomNav: React.FC = () => {
    const router = useIonRouter();
    const currentPath = router.routeInfo.pathname;

    return (
        <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-4 pb-safe-bottom pt-1.5 backdrop-blur-md z-30">
            <div className="flex justify-between items-center pb-1.5">
                <button
                    onClick={() => router.push('/home', 'root', 'replace')}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${currentPath === '/home' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
                >
                    <span className="material-symbols-outlined text-[24px]" style={currentPath === '/home' ? { fontVariationSettings: "'FILL' 1" } : {}}>directions_car</span>
                    <span className="text-[9px] font-medium leading-normal">Operación</span>
                </button>
                <button
                    className="flex flex-1 flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-primary transition-colors"
                >
                    <span className="material-symbols-outlined text-[24px]">grid_view</span>
                    <span className="text-[9px] font-medium leading-normal">Ubicaciones</span>
                </button>
                <button
                    onClick={() => router.push('/users', 'root', 'replace')}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${currentPath === '/users' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
                >
                    <span className="material-symbols-outlined text-[24px]" style={currentPath === '/users' ? { fontVariationSettings: "'FILL' 1" } : {}}>admin_panel_settings</span>
                    <span className="text-[9px] font-medium leading-normal">Administración</span>
                </button>
            </div>
        </nav>
    );
};

export default BottomNav;
