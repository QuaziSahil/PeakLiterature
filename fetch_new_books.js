import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load existing books to avoid duplicates
const existingData = JSON.parse(fs.readFileSync('./data/books.json', 'utf8'));
const existingTitles = new Set(existingData.books.map(b => b.title.toLowerCase().trim()));
const existingIds = new Set(existingData.books.map(b => b.id));
const existingArchiveIds = new Set(existingData.books.map(b => b.audiobook?.archiveId).filter(Boolean));

console.log(`Existing books: ${existingData.books.length}`);
console.log(`Starting fetch from Internet Archive...`);

// Genres to search for variety - expanded for 2000 books
const searchQueries = [
    { query: 'librivox fiction novel', genre: 'fiction' },
    { query: 'librivox mystery detective crime', genre: 'mystery' },
    { query: 'librivox adventure travel', genre: 'fiction' },
    { query: 'librivox horror ghost supernatural', genre: 'horror' },
    { query: 'librivox science fiction scifi', genre: 'scifi' },
    { query: 'librivox poetry poems verse', genre: 'poetry' },
    { query: 'librivox philosophy ethics', genre: 'philosophy' },
    { query: 'librivox romance love', genre: 'romance' },
    { query: 'librivox history historical', genre: 'fiction' },
    { query: 'librivox classic literature', genre: 'fiction' },
    { query: 'librivox short stories tales', genre: 'fiction' },
    { query: 'librivox drama plays theater', genre: 'fiction' },
    { query: 'librivox children fairy tales', genre: 'fiction' },
    { query: 'librivox biography memoir autobiography', genre: 'fiction' },
    { query: 'librivox war military battle', genre: 'fiction' },
    { query: 'librivox religion spiritual bible', genre: 'philosophy' },
    { query: 'librivox western frontier cowboy', genre: 'fiction' },
    { query: 'librivox fantasy magic', genre: 'fiction' },
    { query: 'librivox thriller suspense', genre: 'mystery' },
    { query: 'librivox comedy humor satire', genre: 'fiction' },
    { query: 'librivox essays letters', genre: 'philosophy' },
    { query: 'librivox myth legend epic', genre: 'fiction' },
    { query: 'librivox sea ocean nautical', genre: 'fiction' },
    { query: 'librivox gothic victorian', genre: 'horror' },
    { query: 'librivox american literature', genre: 'fiction' },
    { query: 'librivox british english literature', genre: 'fiction' },
    { query: 'librivox french literature translated', genre: 'fiction' },
    { query: 'librivox russian literature', genre: 'fiction' },
    { query: 'librivox german literature', genre: 'fiction' },
    { query: 'librivox ancient greek roman', genre: 'fiction' },
    { query: 'librivox medieval renaissance', genre: 'fiction' },
    { query: 'librivox nature wilderness', genre: 'fiction' },
    { query: 'librivox social political', genre: 'fiction' },
    { query: 'librivox education teaching', genre: 'philosophy' },
    { query: 'librivox science medicine', genre: 'philosophy' },
];

function fetchFromArchive(query, rows = 100, page = 1) {
    return new Promise((resolve, reject) => {
        const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=description&fl[]=subject&output=json&rows=${rows}&page=${page}&sort[]=downloads+desc`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.response?.docs || []);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)
        .replace(/-$/, '');
}

function cleanDescription(desc) {
    if (!desc) return 'A classic work of literature available as a free audiobook.';
    // Remove HTML tags and clean up
    let clean = desc.toString()
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    // Limit length
    if (clean.length > 200) {
        clean = clean.substring(0, 197) + '...';
    }
    return clean || 'A classic work of literature available as a free audiobook.';
}

function extractYear(yearStr) {
    if (!yearStr) return 1900;
    const match = yearStr.toString().match(/\d{4}/);
    return match ? parseInt(match[0]) : 1900;
}

async function fetchAllBooks() {
    const newBooks = [];
    const addedTitles = new Set();

    for (const { query, genre } of searchQueries) {
        console.log(`\nFetching: ${query}`);

        for (let page = 1; page <= 15; page++) {
            try {
                const docs = await fetchFromArchive(query, 100, page);
                console.log(`  Page ${page}: ${docs.length} results`);

                for (const doc of docs) {
                    if (newBooks.length >= 2000) break;

                    const identifier = doc.identifier;
                    const title = doc.title;
                    const author = doc.creator || 'Unknown Author';

                    if (!identifier || !title) continue;

                    // Skip duplicates
                    const titleLower = title.toLowerCase().trim();
                    if (existingTitles.has(titleLower)) continue;
                    if (addedTitles.has(titleLower)) continue;
                    if (existingArchiveIds.has(identifier)) continue;

                    // Create unique ID
                    let slug = createSlug(title);
                    let uniqueId = slug;
                    let counter = 1;
                    while (existingIds.has(uniqueId) || newBooks.some(b => b.id === uniqueId)) {
                        uniqueId = `${slug}-${counter++}`;
                    }

                    // Create book entry
                    const book = {
                        id: uniqueId,
                        title: title.trim(),
                        author: Array.isArray(author) ? author[0] : author,
                        year: extractYear(doc.year),
                        genre: genre,
                        description: cleanDescription(doc.description),
                        cover: `https://archive.org/services/img/${identifier}`,
                        audiobook: {
                            available: true,
                            archiveId: identifier,
                            source: 'LibriVox'
                        },
                        ebook: {
                            available: false,
                            gutenbergId: '',
                            epubUrl: '',
                            source: ''
                        }
                    };

                    newBooks.push(book);
                    addedTitles.add(titleLower);

                    if (newBooks.length % 50 === 0) {
                        console.log(`  Added ${newBooks.length} books so far...`);
                    }
                }

                if (newBooks.length >= 2000) break;

                // Small delay to be nice to the API
                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(`  Error on page ${page}:`, err.message);
            }
        }

        if (newBooks.length >= 2000) break;
    }

    return newBooks;
}

async function main() {
    try {
        const newBooks = await fetchAllBooks();

        console.log(`\n\nFetched ${newBooks.length} new unique books!`);

        // Merge with existing books
        const allBooks = [...existingData.books, ...newBooks];

        console.log(`Total books after merge: ${allBooks.length}`);

        // Write to file
        const output = { books: allBooks };
        fs.writeFileSync('./data/books.json', JSON.stringify(output, null, 4));

        console.log('\nSuccessfully saved to books.json!');

        // Print genre distribution
        const genreCounts = {};
        allBooks.forEach(b => {
            genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
        });
        console.log('\nGenre distribution:', genreCounts);

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
