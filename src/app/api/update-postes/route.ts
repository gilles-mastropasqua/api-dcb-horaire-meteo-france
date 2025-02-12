import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
});

// Define the expected CSV record structure
interface PosteRecord {
    NUM_POSTE: string;
    NOM_USUEL: string;
    COMMUNE: string;
    LIEU_DIT?: string;
    DATOUVR?: string;
    DATFERM?: string;
    LAT: string;
    LON: string;
    LAMBX: string;
    LAMBY: string;
    ALTI: string;
    TYPE_POSTE_ACTUEL: string;
}

export const maxDuration = 20;

export async function GET() {
    try {
        console.log("🔹 Starting CSV file retrieval");

        const csvUrl = process.env.POSTES_CSV_URL;
        if (!csvUrl) {
            console.error("❌ CSV file URL is not defined");
            return NextResponse.json({ error: "CSV file URL is not defined" }, { status: 500 });
        }

        console.log(`🔹 Downloading file from: ${csvUrl}`);
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error(`CSV download error: ${response.statusText}`);
        }

        console.log("✅ CSV file downloaded successfully");
        const csvText = await response.text();

        // Ensure the CSV is not empty
        if (!csvText.trim()) {
            console.error("❌ The CSV file is empty");
            return NextResponse.json({ error: "The CSV file is empty" }, { status: 500 });
        }

        console.log("🔹 Parsing CSV data");
        let records: PosteRecord[] = parse(csvText, {
            delimiter: ";",
            columns: true,
            skip_empty_lines: true,
        });

        console.log(`✅ Parsing complete - Total entries: ${records.length}`);
        console.log("🔍 Sample entry before correction:", records[0]);

        if (records.length === 0) {
            console.error("❌ No records found in CSV");
            return NextResponse.json({ error: "No records found" }, { status: 500 });
        }

        console.log("🔹 Normalizing `numPoste` (ensuring 8 characters)");
        records = records.map((record) => {
            const numPoste = record.NUM_POSTE.padStart(8, "0"); // Ensure 8 digits
            return { ...record, NUM_POSTE: numPoste };
        });

        console.log("🔍 Sample entry after correction:", records[0]);

        console.log("🔹 Dropping indexes before insertion...");
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "idx_poste_numPoste";`);
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "idx_poste_open_status";`);
        console.log("✅ Indexes dropped");

        console.log("🔹 Processing data in parallel batches");

        const batchSize = 50;
        const parallelLimit = 300; // 🔥 Number of parallel batches
        let totalUpdated = 0;
        // const totalBatches = Math.ceil(records.length / batchSize);
        const startTime = Date.now();

        // Function to process a single batch
        async function processBatch(batchRecords: PosteRecord[], batchNumber: number) {
            //const batchStartTime = Date.now();
            //console.log(`🔹 Processing batch ${batchNumber}/${totalBatches} (${batchRecords.length} records)`);

            const upsertOperations = batchRecords.map((record: PosteRecord) => {
                const dateOuverture = record.DATOUVR ? new Date(record.DATOUVR) : null;
                const dateFermeture = record.DATFERM ? new Date(record.DATFERM) : null;
                const posteOuvert = dateFermeture === null;

                return {
                    where: { numPoste: record.NUM_POSTE },
                    update: {
                        nomUsuel: record.NOM_USUEL,
                        commune: record.COMMUNE,
                        lieuDit: record.LIEU_DIT || null,
                        dateOuverture,
                        dateFermeture,
                        latitude: parseFloat(record.LAT),
                        longitude: parseFloat(record.LON),
                        lambX: parseInt(record.LAMBX, 10),
                        lambY: parseInt(record.LAMBY, 10),
                        altitude: parseInt(record.ALTI, 10),
                        typePoste: parseInt(record.TYPE_POSTE_ACTUEL, 10),
                        posteOuvert,
                    },
                    create: {
                        numPoste: record.NUM_POSTE,
                        nomUsuel: record.NOM_USUEL,
                        commune: record.COMMUNE,
                        lieuDit: record.LIEU_DIT || null,
                        dateOuverture,
                        dateFermeture,
                        latitude: parseFloat(record.LAT),
                        longitude: parseFloat(record.LON),
                        lambX: parseInt(record.LAMBX, 10),
                        lambY: parseInt(record.LAMBY, 10),
                        altitude: parseInt(record.ALTI, 10),
                        typePoste: parseInt(record.TYPE_POSTE_ACTUEL, 10),
                        posteOuvert,
                    },
                };
            });

            try {
                const results = await prisma.$transaction(
                    upsertOperations.map((op) => prisma.poste.upsert(op))
                );
                totalUpdated += results.length;

                //const batchDuration = (Date.now() - batchStartTime) / 1000;
                //console.log(`✅ Batch ${batchNumber} inserted (${results.length} records) in ${batchDuration.toFixed(2)}s`);
            } catch (error) {
                console.error(`❌ Error in batch ${batchNumber}`, error);
            }
        }

        // Process all batches in parallel with a limit
        const batchPromises = [];
        for (let i = 0; i < records.length; i += batchSize) {
            const batchRecords = records.slice(i, i + batchSize);
            const batchNumber = i / batchSize + 1;

            batchPromises.push(processBatch(batchRecords, batchNumber));

            // Limit parallelism to `parallelLimit`
            if (batchPromises.length >= parallelLimit) {
                await Promise.allSettled(batchPromises);
                batchPromises.length = 0; // Clear completed promises
            }
        }

        // Wait for the last batch to complete
        await Promise.allSettled(batchPromises);

        console.log("🔹 Recreating indexes...");
        await prisma.$executeRawUnsafe(`CREATE INDEX "idx_poste_numPoste" ON "Poste"("numPoste");`);
        await prisma.$executeRawUnsafe(`CREATE INDEX "idx_poste_open_status" ON "Poste"("posteOuvert");`);
        console.log("✅ Indexes recreated");

        const totalDuration = (Date.now() - startTime) / 1000;
        console.log(`✅ All data inserted! (${totalUpdated} records) in ${totalDuration.toFixed(2)}s`);

        return NextResponse.json({
            message: "Update complete",
            updated: totalUpdated,
            totalTime: `${totalDuration.toFixed(2)}s`
        });

    } catch (error) {
        console.error("❌ Error updating stations:", error);

        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ error: "Unknown error" }, { status: 500 });
    }
}
