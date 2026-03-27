// src/components/qrUtils.ts
// Utilidades compartidas entre QRScanner y sus sub-componentes.

/** ID del div que html5-qrcode necesita encontrar en el DOM */
export const QR_REGION_ID = 'html5-qrcode-parking-scanner'

/**
 * Extrae el idIngreso numérico desde el texto crudo leído por el scanner.
 * El QR del tiquete contiene un JSON: { id, placa, ubicacion, tipo, entrada }
 * También acepta un número directo por compatibilidad con lectores externos.
 */
export function parsearIdDeQR(rawValue: string): number | null {
    try {
        const parsed = JSON.parse(rawValue) as Record<string, unknown>
        const id = parsed['id']
        if (typeof id === 'number' && id > 0) return id
        if (typeof id === 'string') {
            const num = parseInt(id, 10)
            if (!isNaN(num) && num > 0) return num
        }
        return null
    } catch {
        // Si no es JSON válido, intentar como número directo
        const num = parseInt(rawValue.trim(), 10)
        return !isNaN(num) && num > 0 ? num : null
    }
}