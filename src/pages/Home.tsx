// src/pages/Home.tsx
import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import BottomNav from '../components/BottomNav';
import './Home.css';
import React from "react";
import { useAuth } from "../hooks/useAuth";

const Home: React.FC = () => {
  const { user } = useAuth();
  const router   = useIonRouter();

  return (
      <IonPage>
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white selection:bg-primary/20">
          <header className="sticky border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3"
                  style={{ top: 'var(--network-banner-height, 0px)', zIndex: 20 }}>
            <h1 className="text-lg font-bold text-slate-900 truncate">Panel de Operación</h1>
          </header>

          <IonContent fullscreen className="bg-[#f6f7f8] font-display text-slate-900 antialiased" style={{ '--background': 'transparent' }}>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32 p-6">
              <h2 className="text-xl font-bold mb-4">
                Bienvenido, {user?.nombreCompleto || user?.nombreUsuario || 'Usuario'}
              </h2>
              <p className="text-gray-600 mb-8">
                Esta es tu área de gestión segura. Tu rol es:{' '}
                <span className="font-semibold text-primary">{user?.rol || 'No especificado'}</span>
              </p>

              {user?.rol && user.rol.toUpperCase().includes('ADMIN') && (
                  <div className="mb-8">
                    <button
                        onClick={() => router.push('/users', 'forward', 'push')}
                        className="w-full bg-[#137fec] text-white flex items-center justify-center gap-2 h-14 rounded-full font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined">group</span>
                      Ir a Gestión de Usuarios
                    </button>
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