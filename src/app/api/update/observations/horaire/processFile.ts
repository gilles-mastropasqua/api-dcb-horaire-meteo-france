'use server';

import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { pipeline } from 'stream/promises';
import { parse } from 'csv-parse';
import {
    normalizeObservationRecord,
    OBSERVATION_FIELDS,
    PG_COLUMNS,
} from '@/app/api/update/observations/horaire/fields';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Server Action: Process a single CSV file from a given URL
 * @param fileUrl - The URL of the compressed CSV file
 * @param requestId - Unique request identifier
 */
export async function processFile(fileUrl: string, requestId: string): Promise<number> {
    console.log('--------------------------------------------------');

    console.log(`[${requestId}] [START] Processing file: ${fileUrl}`);
    const startTime = Date.now();

    try {
        // Step 1: Download file
        console.time(`[${requestId}] [TIME] Download`);
        const { compressedData, fileSize } = await downloadFile(fileUrl);
        console.timeEnd(`[${requestId}] [TIME] Download`);

        console.log(`[${requestId}] [INFO] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        // Step 2: Decompress file
        console.time(`[${requestId}] [TIME] Decompression`);
        const { tempFilePath, lineCount } = await decompressAndSaveFile(compressedData, requestId);
        console.timeEnd(`[${requestId}] [TIME] Decompression`);

        console.log(`[${requestId}] [INFO] Lines extracted: ${lineCount}`);

        // Step 3: Insert into database
        console.time(`[${requestId}] [TIME] Database Insertion`);
        const inserted = await insertIntoDatabase(tempFilePath, requestId);
        console.timeEnd(`[${requestId}] [TIME] Database Insertion`);

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${requestId}] [END] Process completed: ${inserted}/${lineCount} rows inserted in ${totalTime}s`);

        return inserted;
    } catch (error) {
        console.error(`[${requestId}] [ERROR] Processing failed for ${fileUrl}:`, error);
        return 0;
    }
}

/**
 * Download a compressed CSV file from a URL.
 * @param fileUrl - The URL of the compressed file
 * @returns The downloaded file content as a Buffer and its size in bytes.
 */
async function downloadFile(fileUrl: string): Promise<{ compressedData: Buffer; fileSize: number }> {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to download file: ${fileUrl}`);

    const fileSize = parseInt(response.headers.get('content-length') || '0', 10);
    const chunks: Uint8Array[] = [];

    const reader = response.body!.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const compressedData = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

    return { compressedData, fileSize };
}

/**
 * Decompresses a Gzip file and saves it as a CSV.
 * @param compressedData - The Gzip compressed Buffer
 * @param requestId - Unique request identifier
 * @returns The path to the temporary CSV file and the number of extracted lines.
 */
async function decompressAndSaveFile(compressedData: Buffer, requestId: string): Promise<{
    tempFilePath: string;
    lineCount: number
}> {
    const tempDir = '/tmp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `observations_${Date.now()}.csv`);
    const output = fs.createWriteStream(tempFilePath);

    return new Promise((resolve, reject) => {
        zlib.gunzip(compressedData, (err, decompressed) => {
            if (err) {
                console.error(`[${requestId}] [ERROR] Decompression failed:`, err);
                return reject(err);
            }

            const parser = parse(decompressed.toString(), { delimiter: ';', columns: true, skip_empty_lines: true });

            let lineCount = 0;
            output.write(PG_COLUMNS + '\n');

            parser.on('data', (record) => {
                lineCount++;
                const normalizedRecord = normalizeObservationRecord(record);
                const row = OBSERVATION_FIELDS.map(({ name }) => normalizedRecord[name]).join(',');
                output.write(row + '\n');
            });

            parser.on('end', () => {
                output.end();
                resolve({ tempFilePath, lineCount });
            });

            parser.on('error', reject);
        });
    });
}

/**
 * Inserts a CSV file into PostgreSQL using COPY.
 * @param filePath - The path of the temporary CSV file
 * @param requestId - Unique request identifier
 * @returns The number of records inserted
 */
async function insertIntoDatabase(filePath: string, requestId: string): Promise<number> {
    const client = await pgPool.connect();
    let insertedRows = 0;

    try {
        console.log(`[${requestId}] [INFO] Creating a temporary table...`);
        await client.query(`CREATE TEMP TABLE temp_observations AS TABLE "ObservationHoraire" WITH NO DATA;`);

        console.log(`[${requestId}] [INFO] Copying data from ${filePath} into temporary table...`);
        const copyQuery = `COPY temp_observations(${PG_COLUMNS}) FROM STDIN WITH CSV HEADER;`;
        const fileStream = fs.createReadStream(filePath);
        const copyStream = client.query(copyFrom(copyQuery));
        await pipeline(fileStream, copyStream);
        console.log(`[${requestId}] [INFO] Data copied to temporary table.`);

        // Get the number of copied rows
        const tempCountResult = await client.query(`SELECT COUNT(*) FROM temp_observations;`);
        insertedRows = parseInt(tempCountResult.rows[0].count, 10);
        console.log(`[${requestId}] [INFO] ${insertedRows} rows copied into temp table.`);

        const columns = PG_COLUMNS.split(', ').map((col) => col.replace(/"/g, ''));
        const primaryKeys = ['numPoste', 'dateObservation'];

        const updateColumns = columns
            .filter((col) => !primaryKeys.includes(col))
            .map((col) => `"${col}" = EXCLUDED."${col}"`)
            .join(', ');

        console.log(`[${requestId}] [INFO] Merging new data...`);

        const mergeQuery = `
            INSERT INTO "ObservationHoraire" (${PG_COLUMNS})
            SELECT ${PG_COLUMNS} FROM temp_observations 
            WHERE "numPoste" IN (SELECT "numPoste" FROM "Poste")
            ON CONFLICT ("numPoste", "dateObservation")
            DO UPDATE SET ${updateColumns};
        `;


        await client.query(mergeQuery);
        console.log(`[${requestId}] [INFO] Merge completed successfully.`);

        await client.query('DROP TABLE temp_observations;');
        console.log(`[${requestId}] [INFO] Temporary table deleted.`);
    } catch (error) {
        console.error(`[${requestId}] [ERROR] Database insertion failed:`, error);
    } finally {
        client.release();

        // Ensure the temporary file is deleted
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[${requestId}] [INFO] Temporary file ${filePath} deleted.`);
            }
        } catch (err) {
            console.error(`[${requestId}] [ERROR] Failed to delete temp file ${filePath}:`, err);
        }
    }

    return insertedRows;
}
