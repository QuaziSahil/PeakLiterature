// Apply fixes to books.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksPath = path.join(__dirname, 'data', 'books.json');
const fixesPath = path.join(__dirname, 'suggested_fixes.json');

const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const fixes = JSON.parse(fs.readFileSync(fixesPath, 'utf8'));

console.log(`Applying ${fixes.length} fixes...`);

let updateCount = 0;

fixes.forEach(fix => {
    const book = booksData.books.find(b => b.id === fix.id);
    if (book) {
        if (book.title !== "A Midsummer Night's Dream" && book.title !== "Hamlet") { // Skip verified manual fixes if any
            book.audiobook.archiveId = fix.newArchiveId;
            updateCount++;
            // console.log(`Fixed: ${book.title} -> ${fix.newArchiveId}`);
        }
    }
});

// Write back
fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 4));

console.log(`\n=== FIX COMPLETE ===`);
console.log(`Updated ${updateCount} books in books.json`);
