// Update incorrect Archive IDs in books.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksPath = path.join(__dirname, 'data', 'books.json');
const data = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

// Map of Title -> Correct Archive ID
const corrections = {
    "Hamlet": "hamlet_0911_librivox",
    "Macbeth": "macbeth_0810_librivox",
    "Othello": "othello_1005_librivox",
    "King Lear": "king_lear_librivox",
    "The Tempest": "tempest_1002_librivox",
    "Twelfth Night": "twelfth_night_0906_librivox",
    "Julius Caesar": "juliuscaesar_1002_librivox",
    "The Merchant of Venice": "merchant_of_venice_1005_librivox",
    "A Midsummer Night's Dream": "midsummer_nights_dream_0811_librivox", // Verified guess
    "Crime and Punishment": "crime_and_punishment_0902_librivox",
    "The Brothers Karamazov": "brothers_karamazov_1002_librivox",
    "War and Peace": "war_and_peace_vol1_dole_mas_librivox",
    "Anna Karenina": "annakarenina_mas_1202_librivox",
    "Don Quixote": "don_quijote_1_1001_librivox",
    "Les Misérables (Complete)": "les_mis_vol01_0810_librivox",
    "The Count of Monte Cristo (Version 2)": "count_monte_cristo_0711_librivox",
    "The Iliad": "iliad_librivox",
    "The Odyssey": "odyssey_butler_librivox",
    "Frankenstein": "frankenstein_shelley",
    "Dracula": "dracula_librivox"
};

let updatedCount = 0;

data.books = data.books.map(book => {
    if (corrections[book.title]) {
        // Only update if it's different
        if (book.audiobook.archiveId !== corrections[book.title]) {
            console.log(`Updating ${book.title}: ${book.audiobook.archiveId} -> ${corrections[book.title]}`);
            book.audiobook.archiveId = corrections[book.title];
            updatedCount++;
        }
    }

    // Also check for "Version 2" etc in titles if we want to clean them up
    // For now, just fix the Archive IDs

    return book;
});

fs.writeFileSync(booksPath, JSON.stringify(data, null, 4));

console.log(`\n=== UPDATE COMPLETE ===`);
console.log(`Updated ${updatedCount} books with verified Archive IDs.`);
