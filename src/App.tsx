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
import { AuthProvider } from './providers/AuthProvider'
import { IngresoProvider } from './providers/IngresoProvider'
import { useAuth } from './hooks/useAuth'

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

// IngresoProvider envuelve solo /ingresos para no instanciar el contexto
// (con sus efectos y health-checks de red) en todas las páginas.
const IngresosConProvider: React.FC<RouteComponentProps> = () => (
    <IngresoProvider>
      <Ingresos />
    </IngresoProvider>
)

const App: React.FC = () => (
    <IonApp>
      <AuthProvider>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/login">
              <Login />
            </Route>
            <PrivateRoute exact path="/home"     component={Home} />
            <PrivateRoute exact path="/entrada"  component={Entrada} />
            <PrivateRoute exact path="/ingresos" component={IngresosConProvider} />
            <PrivateRoute exact path="/users"    component={Users} />
            <Route exact path="/">
              <Redirect to="/entrada" />
            </Route>
          </IonRouterOutlet>
        </IonReactRouter>
      </AuthProvider>
    </IonApp>
)

export default App