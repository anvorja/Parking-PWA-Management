// src/components/qrUtils.ts
// Utilidades compartidas entre QRScanner y sus sub-componentes.

/** ID del div que html5-qrcode necesita encontrar en el DOM */
export const QR_REGION_ID = 'html5-qrcode-parking-scanner'

/** Patrón UUID v4: 8-4-4-4-12 caracteres hexadecimales */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Extrae el UUID público desde el texto crudo leído por el scanner.
 * El QR del tiquete contiene un JSON: { uuid, placa, ubicacion, tipo, entrada }
 * También acepta el UUID directamente (para lectores externos USB/Bluetooth).
 */
export function parsearUuidDeQR(rawValue: string): string | null {
    try {
        const parsed = JSON.parse(rawValue) as Record<string, unknown>
        const uuid = parsed['uuid']
        if (typeof uuid === 'string' && UUID_REGEX.test(uuid)) return uuid.toLowerCase()
        return null
    } catch {
        // Si no es JSON válido, intentar como UUID directo (lector externo)
        const trimmed = rawValue.trim()
        return UUID_REGEX.test(trimmed) ? trimmed.toLowerCase() : null
    }
}