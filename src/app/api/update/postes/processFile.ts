import { parse } from 'csv-parse/sync';
import { normalizePosteRecord, PosteRecord } from '@/app/api/update/postes/fields';
import prisma from '@/lib/prisma';

// Batch processing configurations
const BATCH_SIZE = 50;
const MAX_PARALLEL_BATCHES = 300;

/**
 * Processes a CSV file by downloading, parsing, normalizing, and inserting records into the database.
 *
 * @param fileUrl - The URL of the CSV file to process.
 * @param requestId - Unique identifier for the request (for logging purposes).
 * @returns The total number of records successfully inserted.
 */
export async function processFile(fileUrl: string, requestId: string): Promise<number> {

    try {
        // Step 1: Download the CSV file
        console.time(`[${requestId}] [TIME] Download`);
        const response = await fetch(fileUrl);
        if (!response.ok) {
            console.log(`[${requestId}] [ERROR] Failed to download file: ${fileUrl}`);
            return 0;
        }
        const csvText = await response.text();
        console.timeEnd(`[${requestId}] [TIME] Download`);

        // Step 2: Parse and normalize the CSV data
        console.time(`[${requestId}] [TIME] Parsing CSV`);
        const records: PosteRecord[] = parse(csvText, {
            delimiter: ';',
            columns: true,
            skip_empty_lines: true,
        }).map(normalizePosteRecord);
        console.timeEnd(`[${requestId}] [TIME] Parsing CSV`);

        console.log(`[${requestId}] [INFO] Parsed and normalized ${records.length} records`);

        if (records.length === 0) {
            console.warn(`[${requestId}] [WARN] No valid records found, skipping processing`);
            return 0;
        }

        let totalInserted = 0; // Counter for successfully inserted records

        /**
         * Processes a batch of records and inserts them into the database using Prisma.
         *
         * @param batch - A subset of records to insert.
         * @param batchNumber - The batch identifier for logging.
         */
        async function processBatch(batch: PosteRecord[], batchNumber: number) {
            if (!batch || batch.length === 0) return;

            try {
                await prisma.$transaction(
                    batch.map((record) =>
                        prisma.poste.upsert({
                            where: { numPoste: record.numPoste as string },
                            update: Object.fromEntries(
                                Object.entries(record).filter(([key]) => key !== 'numPoste'),
                            ),
                            create: record,
                        }),
                    ),
                );
                totalInserted += batch.length;
            } catch (error) {
                console.error(`[${requestId}] [ERROR] Error in batch ${batchNumber}`, error);
            }
        }

        const batchPromises: Promise<void>[] = [];

        // Step 3: Process the records in batches
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            const batchNumber = i / BATCH_SIZE + 1;

            batchPromises.push(processBatch(batch, batchNumber));

            // Wait for batch processing to complete if the max parallel limit is reached
            if (batchPromises.length >= MAX_PARALLEL_BATCHES) {
                await Promise.allSettled(batchPromises);
                batchPromises.length = 0;
            }
        }

        // Ensure all remaining batch promises are resolved
        await Promise.allSettled(batchPromises);

        console.log(`[${requestId}] [INFO] All data inserted! (${totalInserted} records)`);
        return totalInserted;
    } catch (error) {
        console.error(`[${requestId}] [ERROR] Error processing file:`, error);
        return 0;
    } finally {
        console.log(`[${requestId}] [INFO] Close Prisma connections)`);
        await prisma.$disconnect(); // Ensure database connections are properly closed
    }
}
