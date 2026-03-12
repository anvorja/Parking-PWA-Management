import { IonContent, IonPage, useIonRouter } from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import BottomNav from '../components/BottomNav';
import './Home.css';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { logout, user } = useAuth();
  const router = useIonRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login', 'back', 'replace');
  };

  return (
    <IonPage>
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden mx-auto bg-white selection:bg-primary/20">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3 pt-safe-top">
          <h1 className="text-lg font-bold text-slate-900 flex-1 truncate">Panel de Operación</h1>
          <div className="flex justify-end">
            <button onClick={handleLogout} className="text-red-500 hover:text-red-600 transition-colors text-sm font-medium">
              Cerrar Sesión
            </button>
          </div>
        </header>

        <IonContent fullscreen className="bg-[#f6f7f8] font-display text-slate-900 antialiased" style={{ '--background': 'transparent' }}>
          <div className="flex-1 overflow-y-auto no-scrollbar pb-32 p-6">
            <h2 className="text-xl font-bold mb-4">Bienvenido, {user?.nombreCompleto || user?.nombreUsuario || 'Usuario'}</h2>
            <p className="text-gray-600 mb-8">Esta es tu área de gestión segura. Tu rol es: <span className="font-semibold text-primary">{user?.rol || 'No especificado'}</span></p>

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

            <ExploreContainer />
          </div>
        </IonContent>

        <BottomNav />
      </div>
    </IonPage>
  );
};

export default Home;
