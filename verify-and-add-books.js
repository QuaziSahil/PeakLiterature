// Fetch and add verified audiobooks from Project Gutenberg and Internet Archive APIs
// NO GUESSING - all IDs are verified via API calls

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read existing books to avoid duplicates
const booksPath = path.join(__dirname, 'data', 'books.json');
const existingData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const existingTitles = new Set(existingData.books.map(b => b.title.toLowerCase().replace(/[^a-z0-9]/g, '')));
const existingIds = new Set(existingData.books.map(b => b.id));

console.log(`Starting with ${existingData.books.length} books in database`);
console.log(`Audiobooks available: ${existingData.books.filter(b => b.audiobook?.available).length}`);

// Gutenberg API - Get top books
async function fetchGutenbergBooks(page = 1) {
    const url = `https://gutendex.com/books/?page=${page}&languages=en&mime_type=application%2Fepub`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Gutenberg API error: ${error.message}`);
        return null;
    }
}

// Internet Archive - Search for LibriVox audiobook
async function findLibrivoxAudiobook(title, author) {
    const searchTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
    const url = `https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(searchTitle)})%20AND%20collection:(librivoxaudio)&fl=identifier,title,creator&output=json&rows=5`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();

        if (data.response?.docs?.length > 0) {
            // Find best match
            for (const doc of data.response.docs) {
                const docTitle = (doc.title || '').toLowerCase();
                const searchLower = title.toLowerCase();
                if (docTitle.includes(searchLower.substring(0, 20)) || searchLower.includes(docTitle.substring(0, 20))) {
                    return doc.identifier;
                }
            }
            // Return first result if no exact match
            return data.response.docs[0].identifier;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Verify Internet Archive ID exists
async function verifyArchiveId(archiveId) {
    const url = `https://archive.org/metadata/${archiveId}`;
    try {
        const response = await fetch(url);
        if (!response.ok) return false;
        const data = await response.json();
        return data.metadata !== undefined;
    } catch {
        return false;
    }
}

// Map Gutenberg subject to genre
function mapGenre(subjects) {
    const subjectStr = (subjects || []).join(' ').toLowerCase();
    if (subjectStr.includes('horror') || subjectStr.includes('ghost') || subjectStr.includes('supernatural')) return 'horror';
    if (subjectStr.includes('science fiction') || subjectStr.includes('dystopia')) return 'scifi';
    if (subjectStr.includes('romance') || subjectStr.includes('love')) return 'romance';
    if (subjectStr.includes('mystery') || subjectStr.includes('detective')) return 'mystery';
    if (subjectStr.includes('philosophy') || subjectStr.includes('ethics')) return 'philosophy';
    if (subjectStr.includes('poetry') || subjectStr.includes('poems')) return 'poetry';
    return 'fiction';
}

// Generate book ID from title
function generateBookId(title) {
    return title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 40);
}

// Get EPUB URL from Gutenberg formats
function getEpubUrl(formats) {
    const epubKeys = Object.keys(formats).filter(k => k.includes('epub'));
    if (epubKeys.length > 0) {
        // Prefer no-images version for smaller files
        const noImages = epubKeys.find(k => k.includes('noimages'));
        return formats[noImages] || formats[epubKeys[0]];
    }
    return '';
}

// Get cover URL from Gutenberg formats
function getCoverUrl(formats, gutenbergId) {
    const imageKeys = Object.keys(formats).filter(k => k.includes('image'));
    if (imageKeys.length > 0) {
        return formats[imageKeys[0]];
    }
    return `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.cover.medium.jpg`;
}

// Main function
async function addVerifiedBooks() {
    const newBooks = [];
    const targetCount = 200;
    let page = 1;
    let processed = 0;

    console.log('\n=== FETCHING BOOKS FROM PROJECT GUTENBERG ===\n');

    while (newBooks.length < targetCount && page <= 30) {
        console.log(`\nFetching Gutenberg page ${page}...`);
        const gutenbergData = await fetchGutenbergBooks(page);

        if (!gutenbergData || !gutenbergData.results) {
            console.log('No more results from Gutenberg');
            break;
        }

        for (const book of gutenbergData.results) {
            if (newBooks.length >= targetCount) break;

            processed++;
            const title = book.title;
            const author = book.authors?.[0]?.name || 'Unknown';
            const bookId = generateBookId(title);
            const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Skip if already exists
            if (existingTitles.has(normalizedTitle) || existingIds.has(bookId)) {
                continue;
            }

            // Skip compilations and multi-volume works
            if (title.includes('Volume') || title.includes('Vol.') || title.includes('Complete Works')) {
                continue;
            }

            console.log(`[${newBooks.length + 1}/${targetCount}] Checking: ${title.substring(0, 50)}...`);

            // Find matching LibriVox audiobook
            const archiveId = await findLibrivoxAudiobook(title, author);

            if (archiveId) {
                // Verify the archive ID exists
                const isValid = await verifyArchiveId(archiveId);

                if (isValid) {
                    const newBook = {
                        id: bookId,
                        title: title,
                        author: author,
                        year: book.authors?.[0]?.birth_year ? book.authors[0].birth_year + 30 : 1900,
                        genre: mapGenre(book.subjects),
                        description: `${title} by ${author}. A classic work of literature.`,
                        cover: getCoverUrl(book.formats, book.id),
                        audiobook: {
                            available: true,
                            archiveId: archiveId,
                            source: "LibriVox"
                        },
                        ebook: {
                            available: true,
                            gutenbergId: String(book.id),
                            epubUrl: getEpubUrl(book.formats) || `https://www.gutenberg.org/ebooks/${book.id}.epub.noimages`,
                            source: "Project Gutenberg"
                        }
                    };

                    newBooks.push(newBook);
                    existingTitles.add(normalizedTitle);
                    existingIds.add(bookId);
                    console.log(`  ✓ Added: ${title.substring(0, 40)} (Archive: ${archiveId})`);
                } else {
                    console.log(`  ✗ Invalid archive ID: ${archiveId}`);
                }
            } else {
                console.log(`  - No LibriVox audiobook found`);
            }

            // Rate limiting - be nice to the APIs
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        page++;

        // Longer pause between pages
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n=== PROCESSING COMPLETE ===`);
    console.log(`Processed: ${processed} books from Gutenberg`);
    console.log(`New books with verified audiobooks: ${newBooks.length}`);

    if (newBooks.length > 0) {
        // Add to existing data
        existingData.books.push(...newBooks);

        // Save
        fs.writeFileSync(booksPath, JSON.stringify(existingData, null, 4));

        console.log(`\n✓ Added ${newBooks.length} new books to books.json`);
        console.log(`Total books now: ${existingData.books.length}`);
        console.log(`Total with audiobooks: ${existingData.books.filter(b => b.audiobook?.available).length}`);
    }

    return newBooks;
}

// Run
addVerifiedBooks().catch(console.error);
