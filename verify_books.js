import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksPath = path.join(__dirname, 'data', 'books.json');
const reportPath = path.join(__dirname, 'audit_report.json');

const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const books = booksData.books;

console.log(`Auditing ${books.length} books...`);

const report = {
    timestamp: new Date().toISOString(),
    totalBooks: books.length,
    brokenAudio: [],
    brokenCovers: [],
    stats: {
        successAudio: 0,
        failedAudio: 0,
        successCover: 0,
        failedCover: 0
    }
};

const BATCH_SIZE = 10;
const DELAY_MS = 100;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkUrl(url) {
    return new Promise((resolve) => {
        if (!url || !url.startsWith('http')) {
            resolve(false);
            return;
        }

        const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
            resolve(res.statusCode >= 200 && res.statusCode < 400);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}

function checkArchiveId(archiveId) {
    return new Promise((resolve) => {
        const url = `https://archive.org/metadata/${archiveId}`;
        https.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    // A valid item usually has a 'dir' field or 'files' array
                    // If empty or error, it's invalid
                    if (json && !json.error && (json.dir || (json.files && json.files.length > 0))) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (e) {
                    resolve(false);
                }
            });
        }).on('error', () => resolve(false));
    });
}

async function auditBook(book) {
    const result = {
        id: book.id,
        title: book.title,
        audioOk: false,
        coverOk: false
    };

    // Check Audio (Archive ID)
    if (book.audiobook && book.audiobook.available) {
        const isValid = await checkArchiveId(book.audiobook.archiveId);
        result.audioOk = isValid;
        if (isValid) {
            report.stats.successAudio++;
        } else {
            report.stats.failedAudio++;
            report.brokenAudio.push({
                id: book.id,
                title: book.title,
                archiveId: book.audiobook.archiveId
            });
            process.stdout.write('X');
        }
    } else {
        result.audioOk = true; // Not an audiobook, so "ok" in context of errors
    }

    // Check Cover
    const isValidCover = await checkUrl(book.cover);
    result.coverOk = isValidCover;
    if (isValidCover) {
        report.stats.successCover++;
        process.stdout.write('.');
    } else {
        report.stats.failedCover++;
        report.brokenCovers.push({
            id: book.id,
            title: book.title,
            coverUrl: book.cover
        });
        process.stdout.write('C');
    }

    return result;
}

async function runAudit() {
    for (let i = 0; i < books.length; i += BATCH_SIZE) {
        const batch = books.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(auditBook));
        await wait(DELAY_MS);
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 4));
    console.log(`\n\nAudit Complete!`);
    console.log(`Broken Audio: ${report.stats.failedAudio}`);
    console.log(`Broken Covers: ${report.stats.failedCover}`);
    console.log(`Report saved to ${reportPath}`);
}

runAudit();
