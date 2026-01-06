// Apply final manual fixes
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksPath = path.join(__dirname, 'data', 'books.json');

const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

// Valid overrides
const manualFixes = {
    // Valid Books
    "A Midsummer Night's Dream": "midsummer_nights_dream_0806_librivox",
    "Journey to the Center of the Earth": "journey_verne_librivox",
    "Thus Spoke Zarathustra": "zarathustra_0809_librivox",
    "In Search of Lost Time": "swannsway_1408_librivox", // Vol 1
    "The Death of Ivan Ilyich": "deathivanilyitch_1104_librivox",

    // Poe Stories (Map to Collection)
    "The Fall of the House of Usher": "12_creepytales_1206_librivox",
    "The Tell-Tale Heart": "12_creepytales_1206_librivox",
    "The Cask of Amontillado": "12_creepytales_1206_librivox",
    "The Pit and the Pendulum": "12_creepytales_1206_librivox",
    "The Masque of the Red Death": "12_creepytales_1206_librivox",

    // The Raven (pending search) - assume 'raven_eap_librivox' if found, else 'raven_librivox' was broken
    "The Raven and Other Poems": "ravenandpoemspoe_pc_librivox",
};

// Books to remove/mark unavailable (Copyright or Not Found)
const unavailableTitles = [
    "Dangerous Liaisons", // French only
    "Hadji Murad", // Not found
    "The Master and Margarita", // Copyright
    "Doctor Zhivago", // Copyright
    "We" // Copyright (Zamyatin, 1924, could be US PD but recording might not exist)
];

let updateCount = 0;

booksData.books.forEach(book => {
    // Apply manual fixes
    if (manualFixes[book.title]) {
        if (book.audiobook.archiveId !== manualFixes[book.title]) {
            console.log(`Fixing ${book.title}: ${manualFixes[book.title]}`);
            book.audiobook.archiveId = manualFixes[book.title];
            book.audiobook.available = true;
            updateCount++;
        }
    }

    // Mark unavailable
    if (unavailableTitles.includes(book.title)) {
        if (book.audiobook.available) {
            console.log(`Marking unavailable: ${book.title}`);
            book.audiobook.available = false;
            book.audiobook.archiveId = "";
            book.ebook.source = "Unavailable (Copyright/Missing)";
            updateCount++;
        }
    }
});

fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 4));

console.log(`\n=== MANUAL FIXES COMPLETE ===`);
console.log(`Updated ${updateCount} books.`);
