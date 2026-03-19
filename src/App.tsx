// src/App.tsx
import React, { ComponentType } from 'react'
import { Redirect, Route, RouteComponentProps } from 'react-router-dom'
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import Login from './pages/Login'
import Home from './pages/Home'
import Entrada from './pages/Entrada'
import Ingresos from './pages/Ingresos'
import Users from './pages/Users'
import Tarifas from './pages/Tarifas'
import NotFound from './pages/NotFound'
import { AuthProvider } from './providers/AuthProvider'
import { AppProvider } from './providers/AppProvider'
import { IngresoProvider } from './providers/IngresoProvider'
import { TarifaProvider } from './providers/Tarifaprovider'
import { useAuth } from './hooks/useAuth'
import { SalidaProvider } from './providers/Salidaprovider'
import Salida from './pages/Salida'
import { UbicacionProvider } from './providers/Ubicacionprovider'
import Ubicaciones from './pages/Ubicaciones'

import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

import './theme/variables.css'

setupIonicReact()

interface PrivateRouteProps {
    component: ComponentType<RouteComponentProps>
    path: string
    exact: boolean
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
    const { token, isLoading } = useAuth()
    if (isLoading) return null
    return (
        <Route
            {...rest}
            render={props => (token ? <Component {...props} /> : <Redirect to="/login" />)}
        />
    )
}

// ─── Providers por ruta ───────────────────────────────────────────────────────
// Cada provider se instancia solo cuando su ruta está activa.
//
// Entrada e Ingresos comparten IngresoProvider porque ambas necesitan
// la outbox de ingresos:
//   - Entrada.tsx: registrarIngresoConOutbox (offline)
//   - Ingresos.tsx: lista, editar, eliminar, salidasPendientes

const EntradaConProvider: React.FC<RouteComponentProps> = () => (
    <IngresoProvider><Entrada /></IngresoProvider>
)
const IngresosConProvider: React.FC<RouteComponentProps> = () => (
    <IngresoProvider><Ingresos /></IngresoProvider>
)
const SalidaConProvider: React.FC<RouteComponentProps> = () => (
    <SalidaProvider><Salida /></SalidaProvider>
)
const UbicacionesConProvider: React.FC<RouteComponentProps> = () => (
    <UbicacionProvider><Ubicaciones /></UbicacionProvider>
)
const TarifasConProvider: React.FC<RouteComponentProps> = () => (
    <TarifaProvider><Tarifas /></TarifaProvider>
)

const App: React.FC = () => (
    <IonApp>
        <AuthProvider>
            {/*
                Arquitectura final de providers:
                AuthProvider → AppProvider → providers por ruta
                AppProvider gestiona: red global, outbox, sync automático, banner de estado.
            */}
            <AppProvider>
                <IonReactRouter>
                    <IonRouterOutlet>
                        <Route exact path="/login"><Login /></Route>
                        <PrivateRoute exact path="/home"        component={Home} />
                        <PrivateRoute exact path="/entrada"     component={EntradaConProvider} />
                        <PrivateRoute exact path="/salida"      component={SalidaConProvider} />
                        <PrivateRoute exact path="/ingresos"    component={IngresosConProvider} />
                        <PrivateRoute exact path="/ubicaciones" component={UbicacionesConProvider} />
                        <PrivateRoute exact path="/users"       component={Users} />
                        <PrivateRoute exact path="/tarifas"     component={TarifasConProvider} />
                        <Route exact path="/"><Redirect to="/entrada" /></Route>
                        <Route><NotFound /></Route>
                    </IonRouterOutlet>
                </IonReactRouter>
            </AppProvider>
        </AuthProvider>
    </IonApp>
)

export default App