"use strict";

/* ---------- Motivational quote (changes every time the app is opened) ---------- */

const QUOTES = [
  { t: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", a: "Will Durant", s: "The Story of Philosophy, 1926" },
  { t: "A journey of a thousand miles begins with a single step.", a: "Laozi", s: "Tao Te Ching, chapter 64" },
  { t: "Knowing is not enough; we must apply. Willing is not enough; we must do.", a: "Johann Wolfgang von Goethe", s: "Wilhelm Meister's Apprenticeship" },
  { t: "Lost time is never found again.", a: "Benjamin Franklin", s: "Poor Richard's Almanack, 1748" },
  { t: "Never put off to tomorrow what you can do today.", a: "Thomas Jefferson", s: "A Decalogue of Canons for Observation in Practical Life, 1825" },
  { t: "Plans are worthless, but planning is everything.", a: "Dwight D. Eisenhower", s: "Speech to the National Defense Executive Reserve Conference, 1957" },
  { t: "Genius is one percent inspiration and ninety-nine percent perspiration.", a: "Thomas Edison", s: "Quoted in Harper's Monthly, 1932" },
  { t: "It is not that we have a short time to live, but that we waste a lot of it.", a: "Seneca", s: "On the Shortness of Life" },
  { t: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt", s: "An Autobiography, 1913" },
  { t: "I learned that courage was not the absence of fear, but the triumph over it.", a: "Nelson Mandela", s: "Long Walk to Freedom, 1994" },
  { t: "Education is the most powerful weapon which you can use to change the world.", a: "Nelson Mandela", s: "Speech at the Mindset Network launch, 2003" },
  { t: "The only way to do great work is to love what you do.", a: "Steve Jobs", s: "Stanford Commencement Address, 2005" },
  { t: "Waste no more time arguing what a good man should be. Be one.", a: "Marcus Aurelius", s: "Meditations, Book 10 (trans. George Long)" },
  { t: "He who has a why to live for can bear almost any how.", a: "Friedrich Nietzsche", s: "Twilight of the Idols, 1889" },
  { t: "The only limit to our realization of tomorrow will be our doubts of today.", a: "Franklin D. Roosevelt", s: "Undelivered Jefferson Day address, 1945" },
  { t: "Failure is simply the opportunity to begin again, this time more intelligently.", a: "Henry Ford", s: "My Life and Work, 1922" },
  { t: "If there is no struggle, there is no progress.", a: "Frederick Douglass", s: "West India Emancipation speech, 1857" },
  { t: "Nothing great was ever achieved without enthusiasm.", a: "Ralph Waldo Emerson", s: "Essays: First Series (\u201cCircles\u201d), 1841" },
  { t: "Nothing will ever be attempted, if all possible objections must first be overcome.", a: "Samuel Johnson", s: "Rasselas, 1759" },
  { t: "If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.", a: "Henry David Thoreau", s: "Walden, 1854" },
  { t: "Fall seven times, stand up eight.", a: "Japanese proverb", s: "" }
];

const QUOTE_KEY = "last-quote-v1";

function pickQuote() {
  let last = -1;
  try { last = parseInt(localStorage.getItem(QUOTE_KEY), 10); } catch (e) {}
  let i;
  do { i = Math.floor(Math.random() * QUOTES.length); } while (QUOTES.length > 1 && i === last);
  try { localStorage.setItem(QUOTE_KEY, String(i)); } catch (e) {}
  return QUOTES[i];
}

function showQuote() {
  const q = pickQuote();
  document.getElementById("quoteText").textContent = "\u201C" + q.t + "\u201D";
  document.getElementById("quoteCite").textContent = "\u2014 " + q.a + (q.s ? ", " + q.s : "");
}

showQuote();

// When the installed app is brought back from the background, treat it as "re-opened"
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > 3000) showQuote();
  hiddenAt = 0;
});
