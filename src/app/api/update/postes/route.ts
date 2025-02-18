import { NextResponse } from 'next/server';
import { processFile } from '@/app/api/update/postes/processFile';

export const maxDuration = 20; // Maximum duration for the request execution (in seconds)

/**
 * Handles a GET request to initiate the Poste update process.
 *
 * This function:
 * - Fetches the CSV file URL from environment variables.
 * - Processes the file and inserts the records into the database.
 * - Returns a detailed JSON response with the update status.
 *
 * @returns A JSON response with detailed processing results.
 */
export async function GET() {
    const requestId = Math.random().toString(36).substring(7); // Generate a unique request ID for logging
    console.log('--------------------------------------------------');
    console.log(`[${requestId}] [START] Poste update process...`);

    const startTime = Date.now(); // Track processing start time

    try {
        console.log(`[${requestId}] [INFO] Retrieving CSV file URL...`);

        // Retrieve the CSV file URL from environment variables
        const csvUrl = process.env.POSTES_CSV_URL;
        if (!csvUrl) {
            console.error(`[${requestId}] [ERROR] CSV file URL is not defined`);
            return NextResponse.json({
                success: false,
                error: 'CSV file URL is not defined',
            }, { status: 500 });
        }

        console.log(`[${requestId}] [INFO] Processing file: ${csvUrl}`);

        // Process the CSV file and insert records into the database
        console.time(`[${requestId}] [TIME] File Processing`);
        const insertedCount = await processFile(csvUrl, requestId);
        console.timeEnd(`[${requestId}] [TIME] File Processing`);

        // Calculate total processing time
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${requestId}] [END] Process completed: ${insertedCount} records inserted in ${totalDuration}s`);
        console.log('--------------------------------------------------');

        return NextResponse.json({
            success: true,
            message: 'Poste update completed successfully',
            fileUrl: csvUrl,
            totalInserted: insertedCount,
            duration: `${totalDuration}s`,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[${requestId}] [ERROR] General failure during processing:`, error);

        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: errorMessage,
        }, { status: 500 });
    }
}
