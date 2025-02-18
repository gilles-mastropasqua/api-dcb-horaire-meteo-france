import { camelCase } from 'lodash';
import { FieldType, sanitizeNumPoste, sanitizeValue } from '@/app/api/update/utils/utils';


/**
 * Defines poste field mappings.
 */
interface PosteField {
    source: string;
    type: FieldType;
}

/**
 * List of poste fields from the CSV dataset.
 */
export const POSTE_FIELDS: PosteField[] = [
    { source: 'NUM_POSTE', type: 'string' },
    { source: 'NOM_USUEL', type: 'string' },
    { source: 'COMMUNE', type: 'string' },
    { source: 'LIEU_DIT', type: 'string' },
    { source: 'DATOUVR', type: 'date' },
    { source: 'DATFERM', type: 'date' },
    { source: 'LAT', type: 'float' },
    { source: 'LON', type: 'float' },
    { source: 'LAMBX', type: 'int' },
    { source: 'LAMBY', type: 'int' },
    { source: 'ALTI', type: 'int' },
    { source: 'TYPE_POSTE_ACTUEL', type: 'int' },
];

/**
 * Defines the structured output for station records.
 */
export type PosteRecord = {
    numPoste: string
    nomUsuel: string
    commune: string
    lieuDit: string | null
    datouvr: Date | string | null
    datferm: Date | string | null
    posteOuvert: boolean
    lat: number
    lon: number
    lambx: number | null
    lamby: number | null
    alti: number | null
    typePosteActuel: number | null
}

/**
 * Normalizes a poste record from a CSV file.
 * @param record The raw CSV record.
 * @returns A normalized object with formatted values.
 */
export function normalizePosteRecord(record: Partial<PosteRecord>): Partial<PosteRecord> {
    const normalized: Partial<PosteRecord> = {};

    POSTE_FIELDS.forEach(({ source, type }) => {
        const fieldName = camelCase(source);
        const value = record[source as keyof PosteRecord];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        normalized[fieldName] = sanitizeValue(value, type);
    });

    // Ensure numPoste is properly formatted
    normalized.numPoste = sanitizeNumPoste(record['numPoste']);

    // Derive `posteOuvert` based on `datferm`
    normalized.posteOuvert = !record['datferm'];

    return normalized;
}
