import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

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

export async function GET() {
    try {
        console.log("🔹 Starting CSV file retrieval");

        // Get the CSV URL from environment variables
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

        console.log("🔹 Processing data in batches of 500");

        const batchSize = 500;
        let totalUpdated = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            console.log(`🔹 Processing batch ${i / batchSize + 1} (${batch.length} records)`);

            // Prepare upsert operations
            const upsertOperations = batch.map((record: PosteRecord) => {
                const dateOuverture = record.DATOUVR ? new Date(record.DATOUVR) : null;
                const dateFermeture = record.DATFERM ? new Date(record.DATFERM) : null;
                const posteOuvert = dateFermeture === null; // Open if no closure date

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
                        posteOuvert, // Update `posteOuvert` flag
                    },
                    create: {
                        numPoste: record.NUM_POSTE, // Stored as a STRING(8)
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
                        posteOuvert, // Set `posteOuvert` flag
                    },
                };
            });

            try {
                const results = await prisma.$transaction(
                    upsertOperations.map((op) => prisma.poste.upsert(op))
                );
                totalUpdated += results.length;
                console.log(`✅ Batch ${i / batchSize + 1} inserted (${results.length} records)`);
            } catch (error) {
                console.error(`❌ Error in batch ${i / batchSize + 1}`, error);
            }
        }

        console.log(`✅ All data inserted! (${totalUpdated} records)`);

        return NextResponse.json({ message: "Update complete", updated: totalUpdated });

    } catch (error) {
        console.error("❌ Error updating stations:", error);

        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ error: "Unknown error" }, { status: 500 });
    }
}
