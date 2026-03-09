const fetch = require('node-fetch');

const BASE_URL = 'https://opentdb.com/api.php';

// Decode HTML entities from Open Trivia DB
function decodeHTMLEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&mdash;': '\u2014',
    '&ndash;': '\u2013',
    '&hellip;': '\u2026',
    '&eacute;': '\u00E9',
    '&agrave;': '\u00E0',
    '&egrave;': '\u00E8',
    '&uuml;': '\u00FC',
    '&ouml;': '\u00F6',
    '&auml;': '\u00E4',
    '&ocirc;': '\u00F4',
    '&ntilde;': '\u00F1',
    '&ccedil;': '\u00E7',
    '&szlig;': '\u00DF',
    '&alpha;': '\u03B1',
    '&beta;': '\u03B2',
    '&pi;': '\u03C0',
    '&Prime;': '\u2033',
    '&prime;': '\u2032',
    '&deg;': '\u00B0',
    '&sup2;': '\u00B2',
    '&sup3;': '\u00B3',
    '&frac12;': '\u00BD',
    '&frac14;': '\u00BC',
    '&frac34;': '\u00BE',
    '&times;': '\u00D7',
    '&divide;': '\u00F7',
    '&plusmn;': '\u00B1',
    '&ne;': '\u2260',
    '&le;': '\u2264',
    '&ge;': '\u2265',
    '&copy;': '\u00A9',
    '&reg;': '\u00AE',
    '&trade;': '\u2122',
    '&euro;': '\u20AC',
    '&pound;': '\u00A3',
    '&yen;': '\u00A5',
    '&sect;': '\u00A7',
    '&para;': '\u00B6',
    '&middot;': '\u00B7',
    '&bull;': '\u2022',
  };

  let decoded = text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
    if (entities[match]) return entities[match];
    // Handle numeric entities
    const numMatch = match.match(/^&#(\d+);$/);
    if (numMatch) return String.fromCharCode(parseInt(numMatch[1], 10));
    const hexMatch = match.match(/^&#x([0-9a-fA-F]+);$/);
    if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
    return match;
  });

  return decoded;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchQuestions({ amount = 10, category, difficulty }) {
  const params = new URLSearchParams({ amount, type: 'multiple' });
  if (category && category !== 'any') params.append('category', category);
  if (difficulty && difficulty !== 'any') params.append('difficulty', difficulty);

  const url = `${BASE_URL}?${params.toString()}`;

  let data;
  try {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (err) {
    throw new Error(`Failed to fetch questions from Open Trivia DB: ${err.message}`);
  }

  if (data.response_code !== 0) {
    const codes = {
      1: 'Not enough questions available for these settings.',
      2: 'Invalid parameter sent to Open Trivia DB.',
      3: 'Token not found.',
      4: 'Token empty — all questions returned, reset the token.',
      5: 'Rate limited by Open Trivia DB. Please wait.',
    };
    throw new Error(codes[data.response_code] || `Open Trivia DB error code ${data.response_code}`);
  }

  return data.results.map((q, index) => {
    const question = decodeHTMLEntities(q.question);
    const correctAnswer = decodeHTMLEntities(q.correct_answer);
    const incorrectAnswers = q.incorrect_answers.map(decodeHTMLEntities);
    const allAnswers = shuffleArray([correctAnswer, ...incorrectAnswers]);

    return {
      index,
      question,
      category: decodeHTMLEntities(q.category),
      difficulty: q.difficulty,
      correctAnswer,
      answers: allAnswers,
      // We do NOT send correctAnswer to clients — only to server-side validation
    };
  });
}

// Return a sanitized version safe to send to clients
function sanitizeQuestion(q) {
  return {
    index: q.index,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    answers: q.answers,
    // correctAnswer intentionally omitted
  };
}

// Category list from Open Trivia DB
const CATEGORIES = [
  { id: 'any', name: 'Any Category' },
  { id: '9', name: 'General Knowledge' },
  { id: '10', name: 'Entertainment: Books' },
  { id: '11', name: 'Entertainment: Film' },
  { id: '12', name: 'Entertainment: Music' },
  { id: '13', name: 'Entertainment: Musicals & Theatres' },
  { id: '14', name: 'Entertainment: Television' },
  { id: '15', name: 'Entertainment: Video Games' },
  { id: '16', name: 'Entertainment: Board Games' },
  { id: '17', name: 'Science & Nature' },
  { id: '18', name: 'Science: Computers' },
  { id: '19', name: 'Science: Mathematics' },
  { id: '20', name: 'Mythology' },
  { id: '21', name: 'Sports' },
  { id: '22', name: 'Geography' },
  { id: '23', name: 'History' },
  { id: '24', name: 'Politics' },
  { id: '25', name: 'Art' },
  { id: '26', name: 'Celebrities' },
  { id: '27', name: 'Animals' },
  { id: '28', name: 'Vehicles' },
  { id: '29', name: 'Entertainment: Comics' },
  { id: '30', name: 'Science: Gadgets' },
  { id: '31', name: 'Entertainment: Japanese Anime & Manga' },
  { id: '32', name: 'Entertainment: Cartoon & Animations' },
];

module.exports = { fetchQuestions, sanitizeQuestion, CATEGORIES };
