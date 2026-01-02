// Script to add audiobooks from Internet Archive API to books.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read existing books
const booksPath = path.join(__dirname, 'data', 'books.json');
const existingData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const existingIds = new Set(existingData.books.map(b => b.id));
const existingTitles = new Set(existingData.books.map(b => b.title.toLowerCase()));

// Archive.org API data (top audiobooks by downloads)
const archiveBooks = [
    { identifier: "art_of_war_librivox", title: "The Art of War", creator: "Sun Tzu", year: 2006, genre: "philosophy" },
    { identifier: "moby_dick_librivox", title: "Moby Dick", creator: "Herman Melville", year: 1851, genre: "fiction" },
    { identifier: "peter_pan_0707_librivox", title: "Peter Pan", creator: "J. M. Barrie", year: 1911, genre: "fiction" },
    { identifier: "uncle_toms_cabin_librivox", title: "Uncle Tom's Cabin", creator: "Harriet Beecher Stowe", year: 1852, genre: "fiction" },
    { identifier: "grimms_english_librivox", title: "Grimms' Fairy Tales", creator: "Brothers Grimm", year: 1812, genre: "fiction" },
    { identifier: "swiss_family_robinson_librivox", title: "The Swiss Family Robinson", creator: "Johann David Wyss", year: 1812, genre: "fiction" },
    { identifier: "andersens_fairytales_librivox", title: "Andersen's Fairy Tales", creator: "Hans Christian Andersen", year: 1835, genre: "fiction" },
    { identifier: "adventures_pinocchio_librivox", title: "The Adventures of Pinocchio", creator: "Carlo Collodi", year: 1883, genre: "fiction" },
    { identifier: "robinson_crusoe_librivox", title: "Robinson Crusoe", creator: "Daniel Defoe", year: 1719, genre: "fiction" },
    { identifier: "walden_librivox", title: "Walden", creator: "Henry David Thoreau", year: 1854, genre: "philosophy" },
    { identifier: "wizard_of_oz", title: "The Wonderful Wizard of Oz", creator: "L. Frank Baum", year: 1900, genre: "fiction" },
    { identifier: "divine_comedy_librivox", title: "The Divine Comedy", creator: "Dante Alighieri", year: 1320, genre: "fiction" },
    { identifier: "heart_of_darkness", title: "Heart of Darkness", creator: "Joseph Conrad", year: 1899, genre: "fiction" },
    { identifier: "beowulf_te_librivox", title: "Beowulf", creator: "Anonymous", year: 1000, genre: "fiction" },
    { identifier: "game_of_life_0911_librivox", title: "The Game of Life and How to Play It", creator: "Florence Scovel Shinn", year: 1925, genre: "philosophy" },
    { identifier: "anthem_librivox", title: "Anthem", creator: "Ayn Rand", year: 1938, genre: "scifi" },
    { identifier: "bleak_house_cl_librivox", title: "Bleak House", creator: "Charles Dickens", year: 1853, genre: "fiction" },
    { identifier: "romeo_and_juliet_librivox", title: "Romeo and Juliet", creator: "William Shakespeare", year: 1597, genre: "fiction" },
    { identifier: "beyond_good_and_evil_librivox", title: "Beyond Good and Evil", creator: "Friedrich Nietzsche", year: 1886, genre: "philosophy" },
    { identifier: "railway_children_librivox", title: "The Railway Children", creator: "E. Nesbit", year: 1906, genre: "fiction" },
    { identifier: "ghost_stories_001_librivox", title: "Ghost Story Collection", creator: "Various", year: 1900, genre: "horror" },
    { identifier: "beowulf", title: "Beowulf (Version 2)", creator: "Anonymous", year: 1000, genre: "fiction" },
    { identifier: "callofthewild_1509_librivox", title: "The Call of the Wild", creator: "Jack London", year: 1903, genre: "fiction" },
    { identifier: "prince_librivox", title: "The Prince", creator: "Niccolo Machiavelli", year: 1532, genre: "philosophy" },
    { identifier: "reluctant_dragon_librivox", title: "The Reluctant Dragon", creator: "Kenneth Grahame", year: 1898, genre: "fiction" },
    { identifier: "2br02b_0801_librivox", title: "2 B R 0 2 B", creator: "Kurt Vonnegut", year: 1962, genre: "scifi" },
    { identifier: "amateur_cracksman_librivox", title: "The Amateur Cracksman", creator: "E.W. Hornung", year: 1899, genre: "fiction" },
    { identifier: "fanny_hill_librivox", title: "Fanny Hill", creator: "John Cleland", year: 1748, genre: "fiction" },
    { identifier: "art_war_ps_librivox", title: "The Art of War (Version 2)", creator: "Sun Tzu", year: 2007, genre: "philosophy" },
    { identifier: "being_earnest_librivox", title: "The Importance of Being Earnest", creator: "Oscar Wilde", year: 1895, genre: "fiction" },
    { identifier: "war_worlds_solo_librivox", title: "The War of the Worlds", creator: "H.G. Wells", year: 1898, genre: "scifi" },
    { identifier: "gulliver_ld_librivox", title: "Gulliver's Travels", creator: "Jonathan Swift", year: 1726, genre: "fiction" },
    { identifier: "girl_boat_1109_librivox", title: "The Girl on the Boat", creator: "P.G. Wodehouse", year: 1922, genre: "fiction" },
    { identifier: "blackbeauty_librivox", title: "Black Beauty", creator: "Anna Sewell", year: 1877, genre: "fiction" },
    { identifier: "my_man_jeeves_librivox", title: "My Man Jeeves", creator: "P.G. Wodehouse", year: 1919, genre: "fiction" },
    { identifier: "kidnapped_0807_librivox", title: "Kidnapped", creator: "Robert Louis Stevenson", year: 1886, genre: "fiction" },
    { identifier: "collected_lovecraft_0810_librivox", title: "Collected Works of H.P. Lovecraft", creator: "H.P. Lovecraft", year: 1928, genre: "horror" },
    { identifier: "venus_furs_0810_librivox", title: "Venus in Furs", creator: "Leopold von Sacher-Masoch", year: 1870, genre: "fiction" },
    { identifier: "northanger_abbey_librivox", title: "Northanger Abbey", creator: "Jane Austen", year: 1817, genre: "romance" },
    { identifier: "this_side_paradise_librivox", title: "This Side of Paradise", creator: "F. Scott Fitzgerald", year: 1920, genre: "fiction" },
    { identifier: "acres_of_diamonds_1008_librivox", title: "Acres of Diamonds", creator: "Russell Conwell", year: 1890, genre: "philosophy" },
    { identifier: "antichrist_librivox_", title: "The Antichrist", creator: "Friedrich Nietzsche", year: 1895, genre: "philosophy" },
    { identifier: "three_musketeers_0712_librivox", title: "The Three Musketeers", creator: "Alexandre Dumas", year: 1844, genre: "fiction" },
    { identifier: "first_love_mg_librivox", title: "First Love", creator: "Ivan Turgenev", year: 1860, genre: "romance" },
    { identifier: "merry_adventures_robin_hood_librivox", title: "The Merry Adventures of Robin Hood", creator: "Howard Pyle", year: 1883, genre: "fiction" },
    { identifier: "39_steps_0807_librivox", title: "The Thirty-Nine Steps", creator: "John Buchan", year: 1915, genre: "fiction" },
    { identifier: "as_a_man_thinketh_mc_librivox", title: "As a Man Thinketh", creator: "James Allen", year: 1903, genre: "philosophy" },
    { identifier: "science_gettingrich_1005_librivox", title: "The Science of Getting Rich", creator: "Wallace D. Wattles", year: 1910, genre: "philosophy" },
    { identifier: "your_invisible_power_2104_librivox", title: "Your Invisible Power", creator: "Genevieve Behrend", year: 1921, genre: "philosophy" },
    { identifier: "alexander_great_ld_librivox", title: "Alexander the Great", creator: "Jacob Abbott", year: 1848, genre: "fiction" },
    { identifier: "city_worlds_end_1203_librivox", title: "The City at World's End", creator: "Edmond Hamilton", year: 1951, genre: "scifi" },
    { identifier: "king_solomon_librivox", title: "King Solomon's Mines", creator: "H. Rider Haggard", year: 1885, genre: "fiction" },
    { identifier: "power_concentration_0810_librivox", title: "The Power of Concentration", creator: "Theron Q. Dumont", year: 1918, genre: "philosophy" },
    { identifier: "english_fairy_tales_joy_librivox", title: "English Fairy Tales", creator: "Joseph Jacobs", year: 1890, genre: "fiction" },
    { identifier: "gods_of_mars_librivox", title: "The Gods of Mars", creator: "Edgar Rice Burroughs", year: 1918, genre: "scifi" },
    { identifier: "princess_of_mars_librivox", title: "A Princess of Mars", creator: "Edgar Rice Burroughs", year: 1917, genre: "scifi" },
    { identifier: "mysterious_island_ms_librivox", title: "The Mysterious Island", creator: "Jules Verne", year: 1875, genre: "scifi" },
    { identifier: "american_indian_tales_librivox", title: "American Indian Fairy Tales", creator: "William Trowbridge Larned", year: 1921, genre: "fiction" },
    { identifier: "penguin_island_ms_librivox", title: "Penguin Island", creator: "Anatole France", year: 1908, genre: "fiction" }
];

// Descriptions for books
const descriptions = {
    "The Art of War": "Ancient Chinese military treatise on strategy and tactics.",
    "Moby Dick": "Captain Ahab's obsessive quest for the great white whale.",
    "Peter Pan": "The boy who never grows up takes children to Neverland.",
    "Uncle Tom's Cabin": "A powerful anti-slavery novel that changed America.",
    "Grimms' Fairy Tales": "Classic collection of German folk tales including Cinderella and Snow White.",
    "The Swiss Family Robinson": "A family shipwrecked on a tropical island builds a new life.",
    "Andersen's Fairy Tales": "Beautiful fairy tales including The Little Mermaid and The Ugly Duckling.",
    "The Adventures of Pinocchio": "A wooden puppet dreams of becoming a real boy.",
    "Robinson Crusoe": "A man survives alone on a deserted island for 28 years.",
    "Walden": "Thoreau's reflections on simple living in natural surroundings.",
    "The Wonderful Wizard of Oz": "Dorothy's magical journey through the land of Oz.",
    "The Divine Comedy": "Dante's epic journey through Hell, Purgatory, and Paradise.",
    "Heart of Darkness": "A voyage up the Congo River into the heart of Africa.",
    "Beowulf": "The Old English epic poem of a hero battling monsters.",
    "The Game of Life and How to Play It": "A guide to using the power of thought to create your reality.",
    "Anthem": "A dystopian novella about individuality and freedom.",
    "Bleak House": "Dickens' masterpiece about the endless Jarndyce lawsuit.",
    "Romeo and Juliet": "Shakespeare's timeless tragedy of star-crossed lovers.",
    "Beyond Good and Evil": "Nietzsche's critique of traditional morality.",
    "The Railway Children": "Three children move to the countryside near a railway line.",
    "Ghost Story Collection": "A collection of classic ghost stories.",
    "The Prince": "Machiavelli's famous treatise on political power.",
    "The Reluctant Dragon": "A peaceful dragon who prefers poetry to fighting.",
    "2 B R 0 2 B": "A satirical short story about population control.",
    "The Amateur Cracksman": "The adventures of gentleman thief A.J. Raffles.",
    "Fanny Hill": "An 18th-century erotic novel about a woman's life.",
    "The Importance of Being Earnest": "Wilde's witty comedy of manners.",
    "The War of the Worlds": "Martians invade Victorian England.",
    "Gulliver's Travels": "A satirical voyage to strange lands and peoples.",
    "The Girl on the Boat": "A Wodehouse romantic comedy on an ocean liner.",
    "Black Beauty": "The autobiography of a horse and his various owners.",
    "My Man Jeeves": "Bertie Wooster and his brilliant valet Jeeves.",
    "Kidnapped": "A young Scotsman is kidnapped and has adventures in the Highlands.",
    "Collected Works of H.P. Lovecraft": "Tales of cosmic horror and the Cthulhu Mythos.",
    "Venus in Furs": "A novella exploring themes of obsession and submission.",
    "Northanger Abbey": "Austen's parody of Gothic novels.",
    "This Side of Paradise": "Fitzgerald's debut about disenchanted post-WWI youth.",
    "Acres of Diamonds": "Inspirational lecture about finding opportunity at home.",
    "The Antichrist": "Nietzsche's critique of Christianity.",
    "The Three Musketeers": "Swashbuckling adventures of Athos, Porthos, and Aramis.",
    "First Love": "Turgenev's tender novella about young romance.",
    "The Merry Adventures of Robin Hood": "Classic retelling of the legendary outlaw.",
    "The Thirty-Nine Steps": "A thriller about a man caught up in a spy plot.",
    "As a Man Thinketh": "A self-help classic on the power of thought.",
    "The Science of Getting Rich": "New Thought principles for achieving wealth.",
    "Your Invisible Power": "A guide to visualization and mental science.",
    "Alexander the Great": "Biography of the legendary Macedonian conqueror.",
    "The City at World's End": "A town is transported to the far future.",
    "King Solomon's Mines": "An adventure to find legendary African treasure.",
    "The Power of Concentration": "Lessons in developing mental focus.",
    "English Fairy Tales": "Collection of traditional English fairy tales.",
    "The Gods of Mars": "John Carter's further adventures on Barsoom.",
    "A Princess of Mars": "John Carter is transported to Mars and finds adventure.",
    "The Mysterious Island": "Castaways use science to survive on an island.",
    "American Indian Fairy Tales": "Native American folk tales and legends.",
    "Penguin Island": "A satirical novel about penguins who become human."
};

// Cover images from Gutenberg (mapped where available)
const coverUrls = {
    "Moby Dick": "https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg",
    "Peter Pan": "https://www.gutenberg.org/cache/epub/16/pg16.cover.medium.jpg",
    "Uncle Tom's Cabin": "https://www.gutenberg.org/cache/epub/203/pg203.cover.medium.jpg",
    "Robinson Crusoe": "https://www.gutenberg.org/cache/epub/521/pg521.cover.medium.jpg",
    "Walden": "https://www.gutenberg.org/cache/epub/205/pg205.cover.medium.jpg",
    "The Wonderful Wizard of Oz": "https://www.gutenberg.org/cache/epub/55/pg55.cover.medium.jpg",
    "Heart of Darkness": "https://www.gutenberg.org/cache/epub/219/pg219.cover.medium.jpg",
    "Beowulf": "https://www.gutenberg.org/cache/epub/16328/pg16328.cover.medium.jpg",
    "Bleak House": "https://www.gutenberg.org/cache/epub/1023/pg1023.cover.medium.jpg",
    "Romeo and Juliet": "https://www.gutenberg.org/cache/epub/1513/pg1513.cover.medium.jpg",
    "The Railway Children": "https://www.gutenberg.org/cache/epub/1874/pg1874.cover.medium.jpg",
    "The Prince": "https://www.gutenberg.org/cache/epub/1232/pg1232.cover.medium.jpg",
    "The Importance of Being Earnest": "https://www.gutenberg.org/cache/epub/844/pg844.cover.medium.jpg",
    "The War of the Worlds": "https://www.gutenberg.org/cache/epub/36/pg36.cover.medium.jpg",
    "Gulliver's Travels": "https://www.gutenberg.org/cache/epub/829/pg829.cover.medium.jpg",
    "Black Beauty": "https://www.gutenberg.org/cache/epub/271/pg271.cover.medium.jpg",
    "Kidnapped": "https://www.gutenberg.org/cache/epub/421/pg421.cover.medium.jpg",
    "Northanger Abbey": "https://www.gutenberg.org/cache/epub/121/pg121.cover.medium.jpg",
    "This Side of Paradise": "https://www.gutenberg.org/cache/epub/805/pg805.cover.medium.jpg",
    "The Three Musketeers": "https://www.gutenberg.org/cache/epub/1257/pg1257.cover.medium.jpg",
    "The Thirty-Nine Steps": "https://www.gutenberg.org/cache/epub/558/pg558.cover.medium.jpg",
    "King Solomon's Mines": "https://www.gutenberg.org/cache/epub/2166/pg2166.cover.medium.jpg",
    "A Princess of Mars": "https://www.gutenberg.org/cache/epub/62/pg62.cover.medium.jpg"
};

// Default cover for books without Gutenberg covers
const defaultCover = "https://covers.openlibrary.org/b/title/";

function generateId(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
}

function getCover(title) {
    if (coverUrls[title]) return coverUrls[title];
    // Use Open Library covers as fallback
    const encodedTitle = encodeURIComponent(title);
    return `https://covers.openlibrary.org/b/title/${encodedTitle}-M.jpg`;
}

// Filter and create new books
const newBooks = [];
let skipped = 0;

archiveBooks.forEach(book => {
    const id = generateId(book.title);
    const titleLower = book.title.toLowerCase();

    // Skip if already exists
    if (existingIds.has(id) || existingTitles.has(titleLower)) {
        console.log(`Skipping (duplicate): ${book.title}`);
        skipped++;
        return;
    }

    // Skip version 2s and collections
    if (book.title.includes('Version 2') || book.title.includes('Version 3') || book.title.includes('Collection')) {
        console.log(`Skipping (version/collection): ${book.title}`);
        skipped++;
        return;
    }

    const newBook = {
        id: id,
        title: book.title,
        author: book.creator,
        year: typeof book.year === 'number' && book.year > 100 ? book.year : 1900,
        genre: book.genre,
        description: descriptions[book.title] || `A classic work by ${book.creator}.`,
        cover: getCover(book.title),
        audiobook: {
            available: true,
            archiveId: book.identifier,
            source: "LibriVox"
        },
        ebook: {
            available: false,
            gutenbergId: "",
            epubUrl: "",
            source: ""
        }
    };

    newBooks.push(newBook);
    console.log(`Adding: ${book.title} (${book.identifier})`);
});

console.log(`\n--- Summary ---`);
console.log(`Total processed: ${archiveBooks.length}`);
console.log(`Skipped (duplicates/versions): ${skipped}`);
console.log(`New books to add: ${newBooks.length}`);

// Add new books to existing data
existingData.books.push(...newBooks);

// Save updated file
fs.writeFileSync(booksPath, JSON.stringify(existingData, null, 4));
console.log(`\nSaved! Total books now: ${existingData.books.length}`);
