/**
 * Field types supported in the dataset.
 */
export type FieldType = 'string' | 'int' | 'float' | 'date';

/**
 * Sanitizes a value based on its expected type.
 * @param value The value to sanitize.
 * @param type The expected field type.
 * @returns The sanitized value or `null` if invalid.
 */
export function sanitizeValue(value: unknown, type: 'string' | 'int' | 'float' | 'date' | string): string | number | null {
    if (value === undefined || value === null || value === '') return null;

    if (type === 'string') return String(value).trim();
    if (type === 'int') {
        const parsed = parseInt(value as string, 10);
        return isNaN(parsed) ? null : parsed;
    }
    if (type === 'float') {
        const parsed = parseFloat(value as string);
        return isNaN(parsed) ? null : parsed;
    }
    if (type === 'date') {
        return convertToDate(value as string);
    }

    return null;
}

/**
 * Converts a date string or number into an ISO format date.
 * @param date The date value to convert.
 * @returns ISO date string or `null` if invalid.
 */
export function convertToDate(date: string | number): string | null {
    if (!date) return null;
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

/**
 * Converts `AAAAMMJJHH` format into an ISO date string.
 * @param aaaammjjhh The observation timestamp.
 * @returns An ISO date string or `null` if invalid.
 */
export function convertToISODate(aaaammjjhh: string | number): string | null {
    if (!aaaammjjhh) return null;
    const str = String(aaaammjjhh).padStart(10, '0');
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(8, 10)}:00:00.000Z`;
}

/**
 * Ensures `numPoste` is a valid 8-digit station number.
 * @param value The station number.
 * @returns A formatted 8-digit station number.
 */
export function sanitizeNumPoste(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().padStart(8, '0');
}
