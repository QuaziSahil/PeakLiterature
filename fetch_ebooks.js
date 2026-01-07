import https from 'https';
import fs from 'fs';

// Load existing books to avoid duplicates
const existingData = JSON.parse(fs.readFileSync('./data/books.json', 'utf8'));
const existingTitles = new Set(existingData.books.map(b => b.title.toLowerCase().trim()));
const existingIds = new Set(existingData.books.map(b => b.id));
const existingGutenbergIds = new Set(existingData.books.map(b => b.ebook?.gutenbergId).filter(Boolean));

console.log(`Existing books: ${existingData.books.length}`);
console.log(`Starting ebook fetch from Gutendex (Project Gutenberg API)...`);

// Subjects to search for variety
const subjects = [
    'Fiction',
    'Adventure',
    'Romance',
    'Mystery',
    'Horror',
    'Science Fiction',
    'Fantasy',
    'Poetry',
    'Philosophy',
    'History',
    'Biography',
    'Travel',
    'Drama',
    'Short stories',
    'Children',
    'Classic',
    'Literature',
    'Novel',
    'Essays',
    'Letters',
    'Humor',
    'Political',
    'Religious',
    'War',
    'Western',
];

const genreMap = {
    'fiction': 'fiction',
    'adventure': 'fiction',
    'romance': 'romance',
    'mystery': 'mystery',
    'horror': 'horror',
    'science fiction': 'scifi',
    'fantasy': 'fiction',
    'poetry': 'poetry',
    'philosophy': 'philosophy',
    'history': 'fiction',
    'biography': 'fiction',
    'travel': 'fiction',
    'drama': 'fiction',
    'short stories': 'fiction',
    'children': 'fiction',
    'classic': 'fiction',
    'literature': 'fiction',
    'novel': 'fiction',
    'essays': 'philosophy',
    'letters': 'philosophy',
    'humor': 'fiction',
    'political': 'philosophy',
    'religious': 'philosophy',
    'war': 'fiction',
    'western': 'fiction',
};

function fetchFromGutendex(topic, page = 1) {
    return new Promise((resolve, reject) => {
        const url = `https://gutendex.com/books/?topic=${encodeURIComponent(topic)}&page=${page}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.results || []);
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

function cleanDescription(subjects) {
    if (!subjects || subjects.length === 0) {
        return 'A classic work of literature from Project Gutenberg.';
    }
    const clean = subjects.slice(0, 3).join(', ');
    return `A classic work featuring: ${clean}`;
}

async function fetchAllEbooks() {
    const newBooks = [];
    const addedTitles = new Set();
    const addedGutenbergIds = new Set();

    for (const topic of subjects) {
        console.log(`\nFetching: ${topic}`);
        const genre = genreMap[topic.toLowerCase()] || 'fiction';

        for (let page = 1; page <= 10; page++) {
            try {
                const books = await fetchFromGutendex(topic, page);

                if (books.length === 0) {
                    console.log(`  Page ${page}: 0 results, stopping`);
                    break;
                }

                console.log(`  Page ${page}: ${books.length} results`);

                for (const book of books) {
                    if (newBooks.length >= 500) break;

                    const gutenbergId = book.id?.toString();
                    const title = book.title;
                    const authors = book.authors?.map(a => a.name).join(', ') || 'Unknown Author';

                    if (!gutenbergId || !title) continue;

                    // Skip duplicates
                    const titleLower = title.toLowerCase().trim();
                    if (existingTitles.has(titleLower)) continue;
                    if (addedTitles.has(titleLower)) continue;
                    if (existingGutenbergIds.has(gutenbergId)) continue;
                    if (addedGutenbergIds.has(gutenbergId)) continue;

                    // Get epub url
                    const formats = book.formats || {};
                    const epubUrl = formats['application/epub+zip'] || '';
                    const coverUrl = formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.cover.medium.jpg`;

                    // Create unique ID
                    let slug = createSlug(title);
                    let uniqueId = `ebook-${slug}`;
                    let counter = 1;
                    while (existingIds.has(uniqueId) || newBooks.some(b => b.id === uniqueId)) {
                        uniqueId = `ebook-${slug}-${counter++}`;
                    }

                    // Create book entry
                    const newBook = {
                        id: uniqueId,
                        title: title.trim(),
                        author: authors,
                        year: book.authors?.[0]?.birth_year || 1900,
                        genre: genre,
                        description: cleanDescription(book.subjects),
                        cover: coverUrl,
                        audiobook: {
                            available: false,
                            archiveId: '',
                            source: ''
                        },
                        ebook: {
                            available: true,
                            gutenbergId: gutenbergId,
                            epubUrl: epubUrl || `https://www.gutenberg.org/ebooks/${gutenbergId}.epub.noimages`,
                            source: 'Project Gutenberg'
                        }
                    };

                    newBooks.push(newBook);
                    addedTitles.add(titleLower);
                    addedGutenbergIds.add(gutenbergId);

                    if (newBooks.length % 100 === 0) {
                        console.log(`  Added ${newBooks.length} ebooks so far...`);
                    }
                }

                if (newBooks.length >= 500) break;

                // Small delay
                await new Promise(r => setTimeout(r, 300));

            } catch (err) {
                console.error(`  Error on page ${page}:`, err.message);
            }
        }

        if (newBooks.length >= 500) break;
    }

    return newBooks;
}

async function main() {
    try {
        const newBooks = await fetchAllEbooks();

        console.log(`\n\nFetched ${newBooks.length} new unique ebooks!`);

        // Merge with existing books
        const allBooks = [...existingData.books, ...newBooks];

        console.log(`Total books after merge: ${allBooks.length}`);

        // Write to file
        const output = { books: allBooks };
        fs.writeFileSync('./data/books.json', JSON.stringify(output, null, 4));

        console.log('\nSuccessfully saved to books.json!');

        // Print stats
        const audiobooks = allBooks.filter(b => b.audiobook?.archiveId).length;
        const ebooks = allBooks.filter(b => b.ebook?.gutenbergId).length;
        console.log(`\nAudiobooks with archiveId: ${audiobooks}`);
        console.log(`Ebooks with gutenbergId: ${ebooks}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
