/**
 * PeakLiterature - Firebase Authentication & Sync
 * Handles Google Sign-in and Firestore data sync
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB-pji-y0SLT2TsQgJ00-EnnhguoWz6OxA",
    authDomain: "peakliterature2.firebaseapp.com",
    projectId: "peakliterature2",
    storageBucket: "peakliterature2.firebasestorage.app",
    messagingSenderId: "574927677692",
    appId: "1:574927677692:web:0516a49502036369a80f79",
    measurementId: "G-QCZXH9F0E6"
};

// Firebase SDK URLs (using CDN for vanilla JS)
const FIREBASE_VERSION = '10.7.1';

// State
let app = null;
let auth = null;
let db = null;
let currentUser = null;

// ========================================
// INITIALIZATION
// ========================================
async function initFirebase() {
    try {
        // Dynamic import of Firebase modules
        const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
        const { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
        const { getFirestore, doc, getDoc, setDoc, updateDoc } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);

        // Initialize Firebase
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Store imports for later use
        window.FirebaseAuth = { auth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged };
        window.FirebaseDB = { db, doc, getDoc, setDoc, updateDoc };

        // Listen for auth state changes
        onAuthStateChanged(auth, handleAuthStateChange);

        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        return false;
    }
}

// ========================================
// AUTHENTICATION
// ========================================
async function handleAuthStateChange(user) {
    currentUser = user;
    updateAuthUI();

    if (user) {
        console.log('User signed in:', user.displayName);
        // Sync favorites from Firestore
        await syncFavoritesFromCloud();
    } else {
        console.log('User signed out');
    }
}

async function signInWithGoogle() {
    try {
        const { auth, signInWithPopup, GoogleAuthProvider } = window.FirebaseAuth;
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error('Sign-in error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            console.log('Sign-in popup was closed');
        }
        throw error;
    }
}

async function signOutUser() {
    try {
        const { auth, signOut } = window.FirebaseAuth;
        await signOut(auth);
        // Clear local favorites on sign out (optional)
        // localStorage.removeItem('peakliterature_favorites');
    } catch (error) {
        console.error('Sign-out error:', error);
    }
}

function getCurrentUser() {
    return currentUser;
}

function isSignedIn() {
    return currentUser !== null;
}

// ========================================
// FIRESTORE SYNC
// ========================================
async function syncFavoritesFromCloud() {
    if (!currentUser) return;

    try {
        const { db, doc, getDoc } = window.FirebaseDB;
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.favorites && Array.isArray(data.favorites)) {
                // Merge cloud favorites with local
                const localFavorites = JSON.parse(localStorage.getItem('peakliterature_favorites') || '[]');
                const mergedFavorites = [...new Set([...localFavorites, ...data.favorites])];
                localStorage.setItem('peakliterature_favorites', JSON.stringify(mergedFavorites));

                // Update the global favorites array
                if (window.PeakLit) {
                    window.PeakLit.setFavorites(mergedFavorites);
                }

                console.log('Favorites synced from cloud:', mergedFavorites.length);
            }
        } else {
            // First time user - save local favorites to cloud
            await saveFavoritesToCloud();
        }
    } catch (error) {
        console.error('Failed to sync favorites:', error);
    }
}

async function saveFavoritesToCloud() {
    if (!currentUser) return;

    try {
        const { db, doc, setDoc } = window.FirebaseDB;
        const favorites = JSON.parse(localStorage.getItem('peakliterature_favorites') || '[]');

        await setDoc(doc(db, 'users', currentUser.uid), {
            favorites: favorites,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        console.log('Favorites saved to cloud');
    } catch (error) {
        console.error('Failed to save favorites:', error);
    }
}

async function saveProgressToCloud(bookId, progress) {
    if (!currentUser) return;

    try {
        const { db, doc, setDoc } = window.FirebaseDB;

        await setDoc(doc(db, 'users', currentUser.uid), {
            progress: {
                [bookId]: {
                    ...progress,
                    updatedAt: new Date().toISOString()
                }
            },
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        console.log('Progress saved for:', bookId);
    } catch (error) {
        console.error('Failed to save progress:', error);
    }
}

async function getProgressFromCloud(bookId) {
    if (!currentUser) return null;

    try {
        const { db, doc, getDoc } = window.FirebaseDB;
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
            const data = userDoc.data();
            return data.progress?.[bookId] || null;
        }
    } catch (error) {
        console.error('Failed to get progress:', error);
    }
    return null;
}

// ========================================
// UI UPDATES
// ========================================
function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    if (currentUser) {
        authContainer.innerHTML = `
            <div class="user-profile">
                <img src="${currentUser.photoURL || 'https://via.placeholder.com/32'}" 
                     alt="${currentUser.displayName}" 
                     class="user-avatar"
                     onerror="this.src='https://via.placeholder.com/32/1a1a24/ffffff?text=${currentUser.displayName?.charAt(0) || 'U'}'">
                <div class="user-dropdown">
                    <span class="user-name">${currentUser.displayName}</span>
                    <span class="user-email">${currentUser.email}</span>
                    <hr>
                    <button onclick="window.PeakAuth.signOut()" class="dropdown-btn">Sign Out</button>
                </div>
            </div>
        `;
    } else {
        authContainer.innerHTML = `
            <button onclick="window.PeakAuth.signIn()" class="btn-signin">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign In
            </button>
        `;
    }
}

function createAuthContainer() {
    // Check if auth container already exists
    if (document.getElementById('authContainer')) return;

    // Find the navbar
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Create auth container
    const authContainer = document.createElement('div');
    authContainer.id = 'authContainer';
    authContainer.className = 'auth-container';

    // Insert before nav-toggle or at the end
    const navToggle = navbar.querySelector('.nav-toggle');
    if (navToggle) {
        navbar.insertBefore(authContainer, navToggle);
    } else {
        navbar.appendChild(authContainer);
    }

    updateAuthUI();
}

// ========================================
// EXPORT
// ========================================
window.PeakAuth = {
    init: initFirebase,
    signIn: signInWithGoogle,
    signOut: signOutUser,
    getCurrentUser,
    isSignedIn,
    saveFavorites: saveFavoritesToCloud,
    saveProgress: saveProgressToCloud,
    getProgress: getProgressFromCloud,
    createAuthContainer
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initFirebase().then(() => {
        createAuthContainer();
    });
});
