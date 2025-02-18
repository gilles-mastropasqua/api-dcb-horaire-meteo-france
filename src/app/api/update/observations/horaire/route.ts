import { NextResponse } from 'next/server';
import { processFile } from './processFile';

const API_URL = 'https://www.data.gouv.fr/api/2/datasets/6569b4473bedf2e7abad3b72/resources/?page=1&page_size=10000';

/**
 * Handles a GET request to fetch and process meteorological observation files.
 *
 * This function:
 * 1. Retrieves the list of available observation files from a remote API.
 * 2. Filters the files based on the specified `period` query parameter.
 * 3. Processes each matching file sequentially by inserting data into the database.
 * 4. Returns a JSON response with a detailed report of the processing results.
 *
 * @param req - The incoming request object.
 * @returns A JSON response indicating the processing result.
 */
export async function GET(req: Request) {
    const requestId = Math.random().toString(36).substring(2, 10); // Unique request identifier
    console.log('--------------------------------------------------');
    console.log(`[${requestId}] [START] Observation update process...`);

    try {
        // Extract query parameters from the request URL
        const url = new URL(req.url);
        const period = url.searchParams.get('period');

        // Ensure the `period` parameter is provided
        if (!period) {
            console.error(`[${requestId}] [ERROR] Missing required parameter: period`);
            return NextResponse.json({
                success: false,
                error: 'Missing required parameter: period',
            }, { status: 400 });
        }

        console.log(`[${requestId}] [INFO] Fetching file list from ${API_URL}`);
        console.log(`[${requestId}] [INFO] Filtering files for period: ${period}`);

        // Step 1: Fetch the list of available observation files
        console.time(`[${requestId}] [TIME] Fetch Files`);
        const response = await fetch(API_URL);
        console.timeEnd(`[${requestId}] [TIME] Fetch Files`);

        if (!response.ok) {
            console.error(`[${requestId}] [ERROR] Failed to fetch files: ${response.statusText}`);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch files',
                statusCode: response.status,
            }, { status: response.status });
        }

        // Step 2: Extract file URLs from the API response
        const data = await response.json();
        let fileUrls: string[] = data.data.map((resource: { url: string }) => resource.url);

        // Step 3: Filter files based on the specified period
        fileUrls = fileUrls.filter((fileUrl) => fileUrl.includes(period));

        console.log(`[${requestId}] [INFO] ${fileUrls.length} files matched the filter`);
        if (fileUrls.length === 0) {
            console.warn(`[${requestId}] [WARNING] No files found for the specified period.`);
            return NextResponse.json({
                success: true,
                message: 'No files found for the specified period',
                totalFiles: 0,
                processedFiles: [],
                totalInserted: 0,
                duration: '0s',
            }, { status: 404 });
        }

        let totalInserted = 0;
        const startTime = Date.now();
        const processedFiles: Array<{ url: string; inserted: number; status: string; error?: string }> = [];

        // Step 4: Process each file sequentially
        for (const fileUrl of fileUrls) {
            try {
                const inserted = await processFile(fileUrl, requestId);
                totalInserted += inserted;
                processedFiles.push({ url: fileUrl, inserted, status: 'success' });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`[${requestId}] [ERROR] Failed to process file: ${fileUrl}`, error);
                processedFiles.push({
                    url: fileUrl,
                    inserted: 0,
                    status: 'error',
                    error: errorMessage,
                });
            }
        }

        // Calculate total processing time
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[${requestId}] [END] Process completed: ${totalInserted} observations inserted in ${totalDuration}s`);
        console.log('--------------------------------------------------');

        // Step 5: Return a detailed JSON response
        return NextResponse.json({
            success: true,
            message: 'Insertion completed',
            totalFiles: fileUrls.length,
            processedFiles,
            totalInserted,
            duration: `${totalDuration}s`,
        });
    } catch (error) {
        console.error(`[${requestId}] [ERROR] General failure during processing:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: errorMessage || 'Unknown error',
        }, { status: 500 });
    }
}
