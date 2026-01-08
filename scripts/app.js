/**
 * PeakLiterature - Main Application Script
 * Handles book loading, search, favorites, and navigation
 */

// ========================================
// GLOBAL STATE
// ========================================
let allBooks = [];
let favorites = JSON.parse(localStorage.getItem('peakliterature_favorites') || '[]');

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadBooks();
    initNavigation();
    initSearch();

    // Load featured books on home page
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
        renderBooks(allBooks.slice(0, 8), featuredGrid);
    }
});

// ========================================
// BOOK DATA LOADING
// ========================================
async function loadBooks() {
    try {
        // Handle both root and subfolder contexts
        // Check if we're in a known subfolder (audiobooks, ebooks, favorites, player, reader, stats)
        const path = window.location.pathname;
        const isInSubfolder = /\/(audiobooks|ebooks|favorites|player|reader|stats)(\/|$|\?)/.test(path);
        const basePath = isInSubfolder ? '../data/books.json' : 'data/books.json';

        const response = await fetch(basePath);
        const data = await response.json();
        allBooks = data.books;
        console.log(`Loaded ${allBooks.length} books`);
    } catch (error) {
        console.error('Failed to load books:', error);
        allBooks = [];
    }
}

// ========================================
// BOOK RENDERING
// ========================================
function renderBooks(books, container) {
    container.innerHTML = books.map(book => createBookCard(book)).join('');
}

function createBookCard(book) {
    const isFavorite = favorites.includes(book.id);
    const hasAudio = book.audiobook?.available;
    const hasEbook = book.ebook?.available;

    // Get reading progress
    const progress = window.PeakStats?.getBookProgress(book.id);
    const timeSpent = progress?.timeSpent || 0;
    const formattedTime = window.PeakStats?.formatTimeSpent(timeSpent);

    return `
        <div class="book-card" data-id="${book.id}">
            <span class="book-type">${hasAudio ? '🎧' : ''} ${hasEbook ? '📖' : ''}</span>
            ${formattedTime ? `<span class="book-progress-badge">⏱️ ${formattedTime}</span>` : ''}
            <img src="${book.cover}" alt="${book.title}" class="book-cover" 
                 onerror="this.src='https://via.placeholder.com/200x300/1a1a24/ffffff?text=No+Cover'">
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
            </div>
            <div class="book-actions">
                ${hasAudio ? `<button class="book-btn" onclick="playAudiobook('${book.id}')">▶ Listen</button>` : ''}
                ${hasEbook ? `<button class="book-btn" onclick="readEbook('${book.id}')">📖 Read</button>` : ''}
                <button class="book-btn favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${book.id}')">
                    ${isFavorite ? '❤️' : '🤍'}
                </button>
            </div>
        </div>
    `;
}

// ========================================
// AUDIOBOOK PLAYER
// ========================================
function playAudiobook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book || !book.audiobook?.available) return;

    // Navigate to player page with book ID - use relative path based on context
    const basePath = window.location.pathname.includes('/audiobooks') || window.location.pathname.includes('/ebooks') || window.location.pathname.includes('/favorites')
        ? '../player'
        : 'player';
    window.location.href = `${basePath}?id=${bookId}`;
}

// ========================================
// EBOOK READER
// ========================================
function readEbook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book || !book.ebook?.available) return;

    // Navigate to reader page with book ID - use relative path based on context
    const basePath = window.location.pathname.includes('/audiobooks') || window.location.pathname.includes('/ebooks') || window.location.pathname.includes('/favorites')
        ? '../reader'
        : 'reader';
    window.location.href = `${basePath}?id=${bookId}`;
}

// ========================================
// FAVORITES
// ========================================
function toggleFavorite(bookId) {
    const index = favorites.indexOf(bookId);

    if (index === -1) {
        favorites.push(bookId);
    } else {
        favorites.splice(index, 1);
    }

    localStorage.setItem('peakliterature_favorites', JSON.stringify(favorites));

    // Sync to cloud if signed in
    if (window.PeakAuth && window.PeakAuth.isSignedIn()) {
        window.PeakAuth.saveFavorites();
    }

    // Update UI
    const btn = document.querySelector(`.book-card[data-id="${bookId}"] .favorite-btn`);
    if (btn) {
        btn.classList.toggle('active');
        btn.innerHTML = favorites.includes(bookId) ? '❤️' : '🤍';
    }
}

function setFavorites(newFavorites) {
    favorites = newFavorites;
    localStorage.setItem('peakliterature_favorites', JSON.stringify(favorites));
}

function getFavoriteBooks() {
    return allBooks.filter(book => favorites.includes(book.id));
}

// ========================================
// SEARCH
// ========================================
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                searchBooks();
            }
        });
    }
}

function searchBooks() {
    const query = document.getElementById('searchInput')?.value?.toLowerCase() || '';

    if (!query) return;

    // Navigate to audiobooks page with search query
    window.location.href = `audiobooks?search=${encodeURIComponent(query)}`;
}

function filterBooks(query, genre = null) {
    return allBooks.filter(book => {
        const matchesQuery = !query ||
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query);
        const matchesGenre = !genre || book.genre === genre;
        return matchesQuery && matchesGenre;
    });
}

// ========================================
// NAVIGATION
// ========================================
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
}

// ========================================
// URL HELPERS
// ========================================
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ========================================
// EXPORT FOR OTHER PAGES
// ========================================
window.PeakLit = {
    allBooks: () => allBooks,
    favorites: () => favorites,
    setFavorites,
    getFavoriteBooks,
    filterBooks,
    renderBooks,
    createBookCard,
    playAudiobook,
    readEbook,
    toggleFavorite,
    getUrlParam
};
