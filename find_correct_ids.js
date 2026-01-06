// Find correct Archive IDs for broken books
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportPath = path.join(__dirname, 'audit_report.json');
const fixesPath = path.join(__dirname, 'suggested_fixes.json');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const brokenBooks = report.brokenAudio;

console.log(`Searching for fixes for ${brokenBooks.length} books...`);

const fixes = [];

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function searchArchive(title) {
    return new Promise((resolve, reject) => {
        // Search for LibriVox audiobooks, sorted by downloads
        const query = `collection:librivoxaudio title:(${encodeURIComponent(title)}) AND mediatype:audio`;
        const url = `https://archive.org/advancedsearch.php?q=${query}&fl=identifier,title,downloads&sort=downloads+desc&rows=3&output=json`;

        https.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.response && json.response.docs && json.response.docs.length > 0) {
                        resolve(json.response.docs[0]); // Best match
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (e) => resolve(null));
    });
}

function cleanTitle(title) {
    // Remove "The", "(Version X)", etc for better search
    return title
        .replace(/ \(Version \d+\)/i, '')
        .replace(/ \(Dramatic Reading\)/i, '')
        .replace(/ \(Complete\)/i, '')
        .replace(/ \(Solo\)/i, '')
        .trim();
}

async function runSearch() {
    for (let i = 0; i < brokenBooks.length; i++) {
        const book = brokenBooks[i];
        const searchTitle = cleanTitle(book.title);

        process.stdout.write(`Searching for "${searchTitle}"... `);

        const match = await searchArchive(searchTitle);

        if (match) {
            console.log(`Found: ${match.identifier}`);
            fixes.push({
                id: book.id,
                title: book.title,
                oldArchiveId: book.archiveId,
                newArchiveId: match.identifier,
                newTitle: match.title
            });
        } else {
            console.log(`NO MATCH FOUND`);
        }

        await wait(200); // Be rate limit friendly
    }

    fs.writeFileSync(fixesPath, JSON.stringify(fixes, null, 4));
    console.log(`\nFound fixes for ${fixes.length} out of ${brokenBooks.length} books.`);
    console.log(`Saved to ${fixesPath}`);
}

runSearch();
