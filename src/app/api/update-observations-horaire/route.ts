import { NextResponse } from "next/server";
import zlib from "zlib";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { Pool } from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { pipeline } from "stream/promises";
import { parse } from "csv-parse";
import { OBSERVATION_FIELDS, PG_COLUMNS, normalizeRecord } from "./fields";

// 🔹 Base URL for API requests
const APIURL = "https://www.data.gouv.fr/api/2/datasets/6569b4473bedf2e7abad3b72/resources/?page=1&page_size=15";

// 🔹 PostgreSQL connection pool
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * 🔹 Main API route to fetch and insert meteorological observations
 */
export async function GET() {
    try {
        console.log("🔹 Starting observation update process...");

        console.log(`🔹 Fetching file list from ${APIURL}`);

        // Fetch the list of available observation files
        const response = await fetch(APIURL);
        if (!response.ok) {
            console.error(`❌ Error fetching files: ${response.statusText}`);
            return NextResponse.json({ error: "Failed to fetch files" }, { status: response.status });
        }

        // Extract file URLs from the response
        const data = await response.json();
        const fileUrls: string[] = data.data.slice(1).map((resource: { url: string }) => resource.url);

        console.log(`🔹 ${fileUrls.length} files to process`);
        if (fileUrls.length === 0) {
            return NextResponse.json({ message: "No files found" });
        }

        let totalInserted = 0;
        const startTime = Date.now();

        for (const fileUrl of fileUrls) {
            console.log(`🔹 Downloading and processing file: ${fileUrl}`);

            try {
                // Fetch the compressed file
                const fileResponse = await fetch(fileUrl);
                if (!fileResponse.ok) {
                    console.warn(`⚠️ Unable to download ${fileUrl} (${fileResponse.statusText})`);
                    continue;
                }

                // Decompress the downloaded file
                const compressedBuffer = await fileResponse.arrayBuffer();
                const decompressedBuffer = zlib.gunzipSync(Buffer.from(compressedBuffer));

                console.log("✅ File decompressed, writing to a temporary file...");

                // Write decompressed data to a temporary CSV file
                const tempFilePath = await writeCSVFile(decompressedBuffer.toString("utf-8"));

                // Insert data into the database
                const inserted = await copyToDatabase(tempFilePath);

                totalInserted += inserted;
                console.log(`✅ Successfully processed file (${inserted} rows inserted)`);
            } catch (error) {
                console.error(`❌ Error processing file ${fileUrl}:`, error);
            }
        }

        const totalDuration = (Date.now() - startTime) / 1000;
        console.log(`✅ Process completed! ${totalInserted} observations inserted in ${totalDuration.toFixed(2)}s`);

        return NextResponse.json({
            message: "Insertion completed",
            totalInserted,
            duration: `${totalDuration.toFixed(2)}s`,
        });
    } catch (error) {
        console.error("❌ General error during insertion:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * 🔹 Function to write a temporary CSV file before inserting into the database
 * @param csvContent - The decompressed CSV file content as a string
 * @returns The path to the temporary CSV file
 */
async function writeCSVFile(csvContent: string): Promise<string> {
    const tempDir = "/tmp"; // Temporary directory for storing CSV files
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `observations_${Date.now()}.csv`);
    const output = fs.createWriteStream(tempFilePath);
    const stream = Readable.from(csvContent);
    const parser = stream.pipe(
        parse({
            delimiter: ";",
            columns: true,
            skip_empty_lines: true,
        })
    );

    // Write the CSV header using the normalized column names
    output.write(PG_COLUMNS + "\n");

    // Process each record in the CSV file and normalize it
    parser.on("data", (record) => {
        const normalizedRecord = normalizeRecord(record);
        const row = OBSERVATION_FIELDS.map(({ name }) => normalizedRecord[name]).join(",");
        output.write(row + "\n");
    });

    return new Promise((resolve, reject) => {
        parser.on("end", () => {
            output.end();
            resolve(tempFilePath);
        });
        parser.on("error", reject);
    });
}

/**
 * 🔹 Function to insert data into PostgreSQL using COPY
 * @param filePath - The path of the temporary CSV file
 * @returns The number of records inserted
 */
async function copyToDatabase(filePath: string): Promise<number> {
    const client = await pgPool.connect();
    try {
        console.log("🚀 Creating a temporary table...");
        await client.query(`
            CREATE TEMP TABLE temp_observations
            AS TABLE "ObservationHoraire" WITH NO DATA;
        `);

        // 🔹 COPY the data into the temporary table
        const copyQuery = `
            COPY temp_observations(${PG_COLUMNS})
            FROM STDIN WITH CSV HEADER;
        `;
        console.log(`🚀 Temporary import from ${filePath}...`);
        const fileStream = fs.createReadStream(filePath);
        const copyStream = client.query(copyFrom(copyQuery));
        await pipeline(fileStream, copyStream);
        console.log(`✅ Import completed in the temporary table`);

        // 🔹 Dynamically generate `DO UPDATE SET` for all columns except primary keys
        const columns = PG_COLUMNS.split(", ").map((col) => col.replace(/"/g, "")); // Remove double quotes
        const primaryKeys = ["numPoste", "dateObservation"]; // Ensure this matches your table's primary keys

        const updateColumns = columns
            .filter((col) => !primaryKeys.includes(col)) // 🔥 Exclude primary keys
            .map((col) => `"${col}" = EXCLUDED."${col}"`) // 🔹 Generates "column = EXCLUDED.column"
            .join(", ");

        // 🔹 Merge data into the main table while handling conflicts
        const mergeQuery = `
            INSERT INTO "ObservationHoraire" (${PG_COLUMNS})
            SELECT ${PG_COLUMNS} FROM temp_observations
            ON CONFLICT ("numPoste", "dateObservation")
            DO UPDATE SET ${updateColumns};
        `;

        console.log("🚀 Merging new data with automatic updates...");
        await client.query(mergeQuery);
        console.log("✅ Merge successfully completed");

        // 🔹 Remove the temporary table after processing
        await client.query("DROP TABLE temp_observations;");
        console.log("🧹 Temporary table deleted");

        // 🔹 Return the total number of records in the main table
        const result = await client.query(`SELECT COUNT(*) FROM "ObservationHoraire";`);
        return parseInt(result.rows[0].count, 10);
    } catch (error) {
        console.error("❌ Error during import:", error);
        return 0;
    } finally {
        client.release();
        fs.unlinkSync(filePath); // Delete temporary file after import
    }
}
