import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || '';

// --- Interfaces ---

export interface RegistrarIngresoRequest {
    placa: string;
    idTipoVehiculo: number;
    idUbicacion: number;
    fechaHoraIngreso?: string; // ISO 8601
}

export interface IngresoVehiculoResponse {
    idIngreso: number;
    placa: string;
    idTipoVehiculo: number;
    tipoVehiculo: string;
    idUbicacion: number;
    ubicacion: string;
    idEstadoIngreso: number;
    estadoIngreso: string;
    fechaHoraIngreso: string;
    fechaCreacion: string;
    idUsuarioRegistro: number;
    usuarioRegistro: string;
    valorCobrado: number | null;
}

export interface TipoVehiculo {
    id: number;
    nombre: string;
    icono: string; // Material Symbols icon name
}

export interface Ubicacion {
    id: number;
    nombre: string;
    disponible: boolean;
}

// --- Datos de referencia (mientras no haya GET endpoint en el backend) ---

export const TIPOS_VEHICULO: TipoVehiculo[] = [
    { id: 1, nombre: 'Automóvil', icono: 'directions_car' },
    { id: 2, nombre: 'Moto', icono: 'motorcycle' },
];

// Se generan dinámicamente las ubicaciones A01 - A08 (se pueden ajustar a lo que haya en la BD)
export const UBICACIONES_DEFAULT: Ubicacion[] = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    nombre: `A${String(i + 1).padStart(2, '0')}`,
    disponible: true,
}));

// --- Service ---

export const ingresoService = {
    async registrarIngreso(data: RegistrarIngresoRequest): Promise<IngresoVehiculoResponse> {
        const token = await authService.getToken();
        const response = await fetch(`${API_URL}/api/ingresos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                ...data,
                fechaHoraIngreso: data.fechaHoraIngreso || new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Error al registrar ingreso (${response.status})`);
        }

        return response.json();
    },
};
