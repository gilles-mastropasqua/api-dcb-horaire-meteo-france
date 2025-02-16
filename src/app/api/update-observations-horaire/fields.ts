import { camelCase } from "lodash";

type FieldType = "string" | "int" | "float";

interface SourceField {
    source: string;
    name?: string;
    type: FieldType;
}

const SOURCE_FIELDS: SourceField[] = [
    { source: "N", type: "string" },
    { source: "T", type: "float" },
    { source: "U", type: "string" },
    { source: "B1", type: "string" },
    { source: "B2", type: "string" },
    { source: "B3", type: "string" },
    { source: "B4", type: "string" },
    { source: "C1", type: "string" },
    { source: "C2", type: "string" },
    { source: "C3", type: "string" },
    { source: "C4", type: "string" },
    { source: "CH", type: "string" },
    { source: "CL", type: "string" },
    { source: "CM", type: "string" },
    { source: "DD", type: "string" },
    { source: "DG", type: "string" },
    { source: "FF", type: "string" },
    { source: "N1", type: "string" },
    { source: "N2", type: "string" },
    { source: "N3", type: "string" },
    { source: "N4", type: "string" },
    { source: "QN", type: "string" },
    { source: "QT", type: "int" },
    { source: "QU", type: "string" },
    { source: "TD", type: "string" },
    { source: "TN", type: "string" },
    { source: "TX", type: "string" },
    { source: "UN", type: "string" },
    { source: "UV", type: "string" },
    { source: "UX", type: "string" },
    { source: "VV", type: "string" },
    { source: "W1", type: "string" },
    { source: "W2", type: "string" },
    { source: "WW", type: "string" },
    { source: "DD2", type: "string" },
    { source: "DIF", type: "string" },
    { source: "DIR", type: "string" },
    { source: "DXI", type: "string" },
    { source: "DXY", type: "string" },
    { source: "FF2", type: "string" },
    { source: "FXI", type: "string" },
    { source: "FXY", type: "string" },
    { source: "GLO", type: "string" },
    { source: "HTN", type: "string" },
    { source: "HTX", type: "string" },
    { source: "HUN", type: "string" },
    { source: "HUX", type: "string" },
    { source: "HXI", type: "string" },
    { source: "HXY", type: "string" },
    { source: "LAT", type: "string" },
    { source: "LON", type: "string" },
    { source: "QB1", type: "string" },
    { source: "QB2", type: "string" },
    { source: "QB3", type: "string" },
    { source: "QB4", type: "string" },
    { source: "QC1", type: "string" },
    { source: "QC2", type: "string" },
    { source: "QC3", type: "string" },
    { source: "QC4", type: "string" },
    { source: "QCH", type: "string" },
    { source: "QCL", type: "string" },
    { source: "QCM", type: "string" },
    { source: "QDD", type: "string" },
    { source: "QDG", type: "string" },
    { source: "QFF", type: "string" },
    { source: "QN1", type: "string" },
    { source: "QN2", type: "string" },
    { source: "QN3", type: "string" },
    { source: "QN4", type: "string" },
    { source: "QTD", type: "string" },
    { source: "QTN", type: "string" },
    { source: "QTX", type: "string" },
    { source: "QUN", type: "string" },
    { source: "QUV", type: "string" },
    { source: "QUX", type: "string" },
    { source: "QVV", type: "string" },
    { source: "QW1", type: "string" },
    { source: "QW2", type: "string" },
    { source: "QWW", type: "string" },
    { source: "RR1", type: "string" },
    { source: "SOL", type: "string" },
    { source: "T10", type: "string" },
    { source: "T20", type: "string" },
    { source: "T50", type: "string" },
    { source: "TSV", type: "string" },
    { source: "UV2", type: "string" },
    { source: "ALTI", type: "int" },
    { source: "DIF2", type: "string" },
    { source: "DIR2", type: "string" },
    { source: "DRR1", type: "string" },
    { source: "DXI2", type: "string" },
    { source: "FXI2", type: "string" },
    { source: "GEOP", type: "string" },
    { source: "GLO2", type: "string" },
    { source: "HXI2", type: "string" },
    { source: "INS2", type: "string" },
    { source: "NBAS", type: "string" },
    { source: "PMER", type: "float" },
    { source: "QDD2", type: "string" },
    { source: "QDIF", type: "string" },
    { source: "QDIR", type: "string" },
    { source: "QDXI", type: "string" },
    { source: "QDXY", type: "string" },
    { source: "QFF2", type: "string" },
    { source: "QFXI", type: "string" },
    { source: "QFXY", type: "string" },
    { source: "QGLO", type: "string" },
    { source: "QHTN", type: "string" },
    { source: "QHTX", type: "string" },
    { source: "QHUN", type: "string" },
    { source: "QHUX", type: "string" },
    { source: "QHXI", type: "string" },
    { source: "QHXY", type: "string" },
    { source: "QINS", type: "string" },
    { source: "QRR1", type: "string" },
    { source: "QSOL", type: "string" },
    { source: "QT10", type: "string" },
    { source: "QT20", type: "string" },
    { source: "QT50", type: "string" },
    { source: "QTSV", type: "string" },
    { source: "QUV2", type: "string" },
    { source: "T100", type: "string" },
    { source: "TMER", type: "string" },
    { source: "TN50", type: "string" },
    { source: "DXI3S", type: "string" },
    { source: "FXI3S", type: "string" },
    { source: "PSTAT", type: "string" },
    { source: "QDIF2", type: "string" },
    { source: "QDIR2", type: "string" },
    { source: "QDRR1", type: "string" },
    { source: "QDXI2", type: "string" },
    { source: "QFXI2", type: "string" },
    { source: "QGEOP", type: "string" },
    { source: "QGLO2", type: "string" },
    { source: "QHXI2", type: "string" },
    { source: "QINS2", type: "string" },
    { source: "QNBAS", type: "string" },
    { source: "QPMER", type: "int" },
    { source: "QT100", type: "string" },
    { source: "QTMER", type: "string" },
    { source: "QTN50", type: "string" },
    { source: "SOLNG", type: "string" },
    { source: "TNSOL", type: "string" },
    { source: "VVMER", type: "string" },
    { source: "DHUMEC", type: "string" },
    { source: "DVV200", type: "string" },
    { source: "HFXI3S", type: "string" },
    { source: "HVAGUE", type: "string" },
    { source: "INFRAR", type: "string" },
    { source: "PVAGUE", type: "string" },
    { source: "QDXI3S", type: "string" },
    { source: "QFXI3S", type: "string" },
    { source: "QPSTAT", type: "int" },
    { source: "QSOLNG", type: "string" },
    { source: "QTNSOL", type: "string" },
    { source: "QVVMER", type: "string" },
    { source: "TLAGON", type: "string" },
    { source: "DHUMI40", type: "string" },
    { source: "DHUMI80", type: "string" },
    { source: "ESNEIGE", type: "string" },
    { source: "ETATMER", type: "string" },
    { source: "HNEIGEF", type: "string" },
    { source: "INFRAR2", type: "string" },
    { source: "PMERMIN", type: "string" },
    { source: "QDHUMEC", type: "string" },
    { source: "QDVV200", type: "string" },
    { source: "QHFXI3S", type: "string" },
    { source: "QHVAGUE", type: "string" },
    { source: "QINFRAR", type: "string" },
    { source: "QPVAGUE", type: "string" },
    { source: "QTLAGON", type: "string" },
    { source: "TSNEIGE", type: "string" },
    { source: "DIRHOULE", type: "string" },
    { source: "NEIGETOT", type: "string" },
    { source: "QDHUMI40", type: "string" },
    { source: "QDHUMI80", type: "string" },
    { source: "QESNEIGE", type: "string" },
    { source: "QETATMER", type: "string" },
    { source: "QHNEIGEF", type: "string" },
    { source: "QINFRAR2", type: "string" },
    { source: "QPMERMIN", type: "string" },
    { source: "QTSNEIGE", type: "string" },
    { source: "HNEIGEFI1", type: "string" },
    { source: "HNEIGEFI3", type: "string" },
    { source: "NOM_USUEL", type: "string" },
    { source: "NUM_POSTE", type: "int" },
    { source: "QDIRHOULE", type: "string" },
    { source: "QNEIGETOT", type: "string" },
    { source: "TCHAUSSEE", type: "string" },
    { source: "TUBENEIGE", type: "string" },
    { source: "TVEGETAUX", type: "string" },
    { source: "UV_INDICE", type: "string" },
    { source: "AAAAMMJJHH", type: "int" },
    { source: "ECOULEMENT", type: "string" },
    { source: "QHNEIGEFI1", type: "string" },
    { source: "QHNEIGEFI3", type: "string" },
    { source: "QTCHAUSSEE", type: "string" },
    { source: "QTUBENEIGE", type: "string" },
    { source: "QTVEGETAUX", type: "string" },
    { source: "QUV_INDICE", type: "string" },
    { source: "CHARGENEIGE", type: "string" },
    { source: "QECOULEMENT", type: "string" },
    { source: "QCHARGENEIGE", type: "string" }
];


// Define the list of fields for the observation dataset
export const OBSERVATION_FIELDS = [
    // Map source fields and convert their names to camelCase if not already defined
    ...SOURCE_FIELDS.map((field) => ({
        source: field.source, // The original column name from the CSV file
        name: field.name ?? camelCase(field.source), // Convert to camelCase if `name` is not explicitly set
        type: field.type // Define the data type (string, int, or float)
    })),
    {
        source: "AAAAMMJJHH",
        name: "dateObservation", // Custom name for the observation date
        type: "string" // Store it as a string (ISO format date)
    }
];

// Generate a list of normalized column names for PostgreSQL COPY command
export const PG_COLUMNS: string = OBSERVATION_FIELDS.map((field) => `"${field.name}"`).join(", ");

// Sanitize values according to their expected type
export function sanitizeValue(value: unknown, type: "string" | "int" | "float" | string): string | number | null {
    if (value === undefined || value === null || value === "") return null; // Handle empty values

    if (type === "string") return String(value).trim(); // Ensure string type and remove unnecessary spaces

    if (type === "int") {
        const parsed = parseInt(value as string, 10);
        return isNaN(parsed) ? null : parsed; // Convert to an integer or return null if invalid
    }

    if (type === "float") {
        const parsed = parseFloat(value as string);
        return isNaN(parsed) ? null : parsed; // Convert to a float or return null if invalid
    }

    return null;
}

// Convert `AAAAMMJJHH` (YYYYMMDDHH) into an ISO date string
export function convertToISODate(aaaammjjhh: string | number): string | null {
    if (!aaaammjjhh) return null; // Return null for empty values
    const str = String(aaaammjjhh).padStart(10, "0"); // Ensure the format is always 10 digits
    const year = str.slice(0, 4);
    const month = str.slice(4, 6);
    const day = str.slice(6, 8);
    const hour = str.slice(8, 10);
    return `${year}-${month}-${day}T${hour}:00:00.000Z`; // Return a properly formatted ISO date string
}

// 🔹 Normalize a CSV record into a structured object
export function normalizeRecord(record: Record<string, unknown>): Record<string, string | number | null> {
    const normalized: Record<string, string | number | null> = {};

    OBSERVATION_FIELDS.forEach(({ source, name, type }) => {
        if (name === "dateObservation") {
            normalized[name] = convertToISODate(record[source] as string); // Convert `AAAAMMJJHH` into an ISO date
        } else if (name === "numPoste") {
            normalized[name] = sanitizeNumPoste(record[source]); // Ensure `numPoste` is properly formatted
        } else {
            normalized[name] = sanitizeValue(record[source], type); // Sanitize all other values
        }
    });

    return normalized;
}

// 🔹 Sanitize and format `numPoste` (station number)
function sanitizeNumPoste(value: unknown): string {
    if (typeof value !== "string") return ""; // Return empty string if value is not a string
    return value.trim().padStart(8, "0"); // Trim spaces and ensure it is 8 characters long (padding with zeros if necessary)
}

