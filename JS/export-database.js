// Terra Scenik - Database Export Utility (export-database.js)
// Student ID: M01049109 | CST3340 Coursework 2
// Usage: node export-database.js

import { MongoClient } from 'mongodb'; // database client
import fs from 'fs'; // file system
import path from 'path'; // path utilities
import { fileURLToPath } from 'url'; // ES module helper

const __filename = fileURLToPath(import.meta.url); // current file path
const __dirname = path.dirname(__filename); // current directory

const uri = 'mongodb+srv://kahmeddurrani_db_user:Itsmypassword%401@kad.ssma5p1.mongodb.net/travelconnect?retryWrites=true&w=majority';
const dbName = 'travelconnect';

// exports all MongoDB collections to JSON files
async function exportDatabase() {
    const client = new MongoClient(uri, {
        tls: true, // SSL encryption
        tlsAllowInvalidCertificates: true
    });

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        console.log(`Found ${collections.length} collections`);

        const exportDir = path.join(__dirname, 'database-dump');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true }); // create export folder
        }

        const dbDump = {
            database: dbName,
            exportDate: new Date().toISOString(),
            collections: {}
        };

        // loop through each collection
        for (const collInfo of collections) {
            const collName = collInfo.name;
            console.log(`Exporting collection: ${collName}`);

            const collection = db.collection(collName);
            const documents = await collection.find({}).toArray(); // get all docs

            dbDump.collections[collName] = documents;

            const collectionFile = path.join(exportDir, `${collName}.json`);
            fs.writeFileSync(collectionFile, JSON.stringify(documents, null, 2)); // pretty print

            console.log(`  - Exported ${documents.length} documents to ${collName}.json`);
        }

        // save complete dump file
        const fullDumpFile = path.join(exportDir, 'TerraScenik-full-dump.json');
        fs.writeFileSync(fullDumpFile, JSON.stringify(dbDump, null, 2));
        console.log(`\nFull database dump saved to: ${fullDumpFile}`);

        // create summary with document counts
        const summary = {
            database: dbName,
            exportDate: dbDump.exportDate,
            totalCollections: collections.length,
            collections: {}
        };

        for (const collName in dbDump.collections) {
            summary.collections[collName] = {
                documentCount: dbDump.collections[collName].length
            };
        }

        console.log('\n=== Database Export Summary ===');
        console.log(JSON.stringify(summary, null, 2));
        console.log('\nExport completed successfully!');
        console.log(`All files are in: ${exportDir}`);

    } catch (err) {
        console.error('Export failed:', err);
        process.exit(1);
    } finally {
        await client.close(); // always close connection
    }
}

exportDatabase(); // run export
