/**
 * PeakLiterature - User Stats & Engagement System
 * Tracks reading activity, streaks, badges, and provides gamification
 */

// ========================================
// STORAGE KEYS
// ========================================
const STORAGE_KEYS = {
    ACTIVITY: 'peakliterature_activity',
    STREAK: 'peakliterature_streak',
    BADGES: 'peakliterature_badges',
    LAST_BOOK: 'peakliterature_last_book',
    COLLECTIONS: 'peakliterature_collections',
    SETTINGS: 'peakliterature_settings',
    STATS: 'peakliterature_stats'
};

// ========================================
// BADGE DEFINITIONS
// ========================================
const BADGES = {
    first_book: {
        id: 'first_book',
        name: 'First Steps',
        description: 'Started your first book',
        icon: '📖',
        condition: (stats) => stats.booksStarted >= 1
    },
    bookworm: {
        id: 'bookworm',
        name: 'Bookworm',
        description: 'Started 5 books',
        icon: '🐛',
        condition: (stats) => stats.booksStarted >= 5
    },
    avid_reader: {
        id: 'avid_reader',
        name: 'Avid Reader',
        description: 'Started 10 books',
        icon: '📚',
        condition: (stats) => stats.booksStarted >= 10
    },
    audio_lover: {
        id: 'audio_lover',
        name: 'Audio Lover',
        description: 'Listened to 5 audiobooks',
        icon: '🎧',
        condition: (stats) => stats.audiobooksPlayed >= 5
    },
    night_owl: {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Read between midnight and 4 AM',
        icon: '🦉',
        condition: (stats) => stats.nightReading
    },
    early_bird: {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Read between 5 AM and 7 AM',
        icon: '🐦',
        condition: (stats) => stats.earlyReading
    },
    streak_3: {
        id: 'streak_3',
        name: 'Getting Started',
        description: '3-day reading streak',
        icon: '🔥',
        condition: (stats) => stats.maxStreak >= 3
    },
    streak_7: {
        id: 'streak_7',
        name: 'Week Warrior',
        description: '7-day reading streak',
        icon: '⚡',
        condition: (stats) => stats.maxStreak >= 7
    },
    streak_30: {
        id: 'streak_30',
        name: 'Monthly Master',
        description: '30-day reading streak',
        icon: '👑',
        condition: (stats) => stats.maxStreak >= 30
    },
    favorites_5: {
        id: 'favorites_5',
        name: 'Curator',
        description: 'Added 5 books to favorites',
        icon: '❤️',
        condition: (stats) => stats.favoritesCount >= 5
    },
    explorer: {
        id: 'explorer',
        name: 'Explorer',
        description: 'Read books from 3 different genres',
        icon: '🧭',
        condition: (stats) => stats.genresExplored >= 3
    },
    collector: {
        id: 'collector',
        name: 'Collector',
        description: 'Created your first collection',
        icon: '📂',
        condition: (stats) => stats.collectionsCreated >= 1
    }
};

// ========================================
// STATS MANAGEMENT
// ========================================
function getStats() {
    const defaultStats = {
        booksStarted: 0,
        audiobooksPlayed: 0,
        ebooksRead: 0,
        totalSessions: 0,
        nightReading: false,
        earlyReading: false,
        currentStreak: 0,
        maxStreak: 0,
        lastActiveDate: null,
        genresExplored: 0,
        genresList: [],
        favoritesCount: 0,
        collectionsCreated: 0,
        firstVisit: new Date().toISOString()
    };

    try {
        const saved = localStorage.getItem(STORAGE_KEYS.STATS);
        return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
    } catch {
        return defaultStats;
    }
}

function saveStats(stats) {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    checkBadges(stats);
}

function updateStats(updates) {
    const stats = getStats();
    Object.assign(stats, updates);
    saveStats(stats);
    return stats;
}

// ========================================
// ACTIVITY TRACKING
// ========================================
function trackBookOpen(bookId, type, genre) {
    const stats = getStats();
    const now = new Date();
    const hour = now.getHours();

    // Track time-based badges
    if (hour >= 0 && hour < 4) {
        stats.nightReading = true;
    }
    if (hour >= 5 && hour < 7) {
        stats.earlyReading = true;
    }

    // Track book stats
    stats.booksStarted++;
    stats.totalSessions++;

    if (type === 'audio') {
        stats.audiobooksPlayed++;
    } else if (type === 'ebook') {
        stats.ebooksRead++;
    }

    // Track genre exploration
    if (genre && !stats.genresList.includes(genre)) {
        stats.genresList.push(genre);
        stats.genresExplored = stats.genresList.length;
    }

    // Update streak
    updateStreak(stats);

    // Save last book
    saveLastBook(bookId, type);

    saveStats(stats);
}

function updateStreak(stats) {
    const today = new Date().toDateString();
    const lastActive = stats.lastActiveDate;

    if (!lastActive) {
        stats.currentStreak = 1;
    } else {
        const lastDate = new Date(lastActive);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastDate.toDateString() === yesterday.toDateString()) {
            stats.currentStreak++;
        } else if (lastDate.toDateString() !== today) {
            stats.currentStreak = 1;
        }
    }

    stats.lastActiveDate = today;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
}

// ========================================
// LAST BOOK (Continue Reading)
// ========================================
function saveLastBook(bookId, type, position = null) {
    const data = {
        bookId,
        type,
        position, // For audiobooks: track number or time offset, for ebooks: scroll position
        timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.LAST_BOOK, JSON.stringify(data));

    // Also save to individual progress storage
    if (position !== null) {
        saveBookProgress(bookId, type, position);
    }
}

function getLastBook() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.LAST_BOOK);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

// ========================================
// BOOK PROGRESS TRACKING (with time spent)
// ========================================
const PROGRESS_KEY_PREFIX = 'peakliterature_progress_';

function saveBookProgress(bookId, type, position) {
    if (!bookId) return;

    // Get existing progress to accumulate time
    const existing = getBookProgress(bookId);
    const timeSpent = (existing?.timeSpent || 0) + 1; // Add 1 second each call

    const progressData = {
        bookId,
        type,
        position,
        timeSpent, // Total seconds spent on this book
        updatedAt: new Date().toISOString(),
        startedAt: existing?.startedAt || new Date().toISOString()
    };

    localStorage.setItem(PROGRESS_KEY_PREFIX + bookId, JSON.stringify(progressData));

    // Also save to Firebase if user is signed in
    if (window.PeakAuth && window.PeakAuth.isSignedIn()) {
        window.PeakAuth.saveProgress(bookId, progressData);
    }
}

function getBookProgress(bookId) {
    if (!bookId) return null;

    try {
        const saved = localStorage.getItem(PROGRESS_KEY_PREFIX + bookId);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function getAllProgress() {
    const progress = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PROGRESS_KEY_PREFIX)) {
            try {
                const bookId = key.replace(PROGRESS_KEY_PREFIX, '');
                progress[bookId] = JSON.parse(localStorage.getItem(key));
            } catch { }
        }
    }
    return progress;
}

// Format time spent for display
function formatTimeSpent(seconds) {
    if (!seconds || seconds < 60) return null; // Don't show if less than 1 min

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
}

// Check if user has started a book
function hasStartedBook(bookId) {
    const progress = getBookProgress(bookId);
    return progress && progress.timeSpent > 0;
}

// ========================================
// BADGES
// ========================================
function getEarnedBadges() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.BADGES);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function checkBadges(stats) {
    const earned = getEarnedBadges();
    const newBadges = [];

    // Update favorites count
    const favorites = JSON.parse(localStorage.getItem('peakliterature_favorites') || '[]');
    stats.favoritesCount = favorites.length;

    Object.values(BADGES).forEach(badge => {
        if (!earned.includes(badge.id) && badge.condition(stats)) {
            earned.push(badge.id);
            newBadges.push(badge);
        }
    });

    if (newBadges.length > 0) {
        localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(earned));
        // Notify user of new badges
        newBadges.forEach(badge => {
            showBadgeNotification(badge);
        });
    }

    return earned;
}

function showBadgeNotification(badge) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'badge-notification';
    notification.innerHTML = `
        <div class="badge-notification-content">
            <span class="badge-icon">${badge.icon}</span>
            <div class="badge-info">
                <strong>New Badge Earned!</strong>
                <span>${badge.name}</span>
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function getAllBadges() {
    const earned = getEarnedBadges();
    return Object.values(BADGES).map(badge => ({
        ...badge,
        earned: earned.includes(badge.id)
    }));
}

// ========================================
// COLLECTIONS
// ========================================
function getCollections() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function createCollection(name) {
    const collections = getCollections();
    const newCollection = {
        id: Date.now().toString(),
        name,
        books: [],
        createdAt: new Date().toISOString()
    };
    collections.push(newCollection);
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));

    // Update stats
    const stats = getStats();
    stats.collectionsCreated = collections.length;
    saveStats(stats);

    return newCollection;
}

function addToCollection(collectionId, bookId) {
    const collections = getCollections();
    const collection = collections.find(c => c.id === collectionId);
    if (collection && !collection.books.includes(bookId)) {
        collection.books.push(bookId);
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    }
}

function removeFromCollection(collectionId, bookId) {
    const collections = getCollections();
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
        collection.books = collection.books.filter(id => id !== bookId);
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
    }
}

// ========================================
// SETTINGS (Night Mode, etc.)
// ========================================
function getSettings() {
    const defaults = {
        nightMode: false,
        fontSize: 'medium'
    };
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
        return defaults;
    }
}

function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    applySettings(settings);
}

function toggleNightMode() {
    const settings = getSettings();
    settings.nightMode = !settings.nightMode;
    saveSettings(settings);
    return settings.nightMode;
}

function applySettings(settings) {
    if (settings.nightMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ========================================
// EXPORT
// ========================================
window.PeakStats = {
    // Stats
    getStats,
    updateStats,

    // Activity
    trackBookOpen,

    // Last Book
    saveLastBook,
    getLastBook,

    // Progress Tracking
    saveBookProgress,
    getBookProgress,
    getAllProgress,
    formatTimeSpent,
    hasStartedBook,

    // Badges
    getAllBadges,
    getEarnedBadges,
    checkBadges,
    BADGES,

    // Collections
    getCollections,
    createCollection,
    addToCollection,
    removeFromCollection,

    // Settings
    getSettings,
    saveSettings,
    toggleNightMode,
    applySettings
};

// Apply settings on load
document.addEventListener('DOMContentLoaded', () => {
    applySettings(getSettings());
});
