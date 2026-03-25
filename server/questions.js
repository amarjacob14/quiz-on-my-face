const he = require('he');

const CATEGORIES = [
  { id: 'any',  name: 'Any Category' },
  { id: 'current-events', name: '📰 Current Events' },
  { id: '9',   name: 'General Knowledge' },
  { id: '10',  name: 'Entertainment: Books' },
  { id: '11',  name: 'Entertainment: Film' },
  { id: '12',  name: 'Entertainment: Music' },
  { id: '14',  name: 'Entertainment: Television' },
  { id: '15',  name: 'Entertainment: Video Games' },
  { id: '16',  name: 'Entertainment: Board Games', maxQuestions: 10 },
  { id: '17',  name: 'Science & Nature' },
  { id: '18',  name: 'Science: Computers' },
  { id: '19',  name: 'Science: Mathematics' },
  { id: '20',  name: 'Mythology' },
  { id: '21',  name: 'Sports' },
  { id: '22',  name: 'Geography' },
  { id: '23',  name: 'History' },
  { id: '24',  name: 'Politics' },
  { id: '25',  name: 'Art' },
  { id: '26',  name: 'Celebrities' },
  { id: '27',  name: 'Animals' },
  { id: '28',  name: 'Vehicles' },
  { id: '30',  name: 'Science: Gadgets' },
  { id: '31',  name: 'Entertainment: Japanese Anime & Manga' },
  { id: '32',  name: 'Entertainment: Cartoon & Animations' },
];

async function fetchQuestions({ category = 'any', difficulty = 'any', amount = 10 }) {
  // Some categories have limited questions — cap to their max
  const catConfig = CATEGORIES.find(c => c.id === String(category));
  const maxAllowed = catConfig?.maxQuestions ?? Infinity;
  const safeAmount = Math.min(amount, maxAllowed);

  let url = `https://opentdb.com/api.php?amount=${safeAmount}&type=multiple`;
  if (category !== 'any') url += `&category=${category}`;
  if (difficulty !== 'any') url += `&difficulty=${difficulty}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenTDB HTTP error: ${res.status}`);

  const data = await res.json();

  if (data.response_code === 5) throw new Error('Rate limited by OpenTDB. Please wait a moment and try again.');
  if (data.response_code === 1) throw new Error(`Not enough questions available for this category/difficulty combination. Try reducing the number of questions or changing the difficulty.`);
  if (data.response_code !== 0) throw new Error(`OpenTDB error code: ${data.response_code}`);

  return data.results.map((q, i) => {
    const answers = [...q.incorrect_answers, q.correct_answer]
      .map(a => he.decode(a))
      .sort(() => Math.random() - 0.5);

    return {
      index:         i,
      question:      he.decode(q.question),
      answers,
      correctAnswer: he.decode(q.correct_answer),
      category:      he.decode(q.category),
      difficulty:    q.difficulty,
    };
  });
}

module.exports = { fetchQuestions, CATEGORIES };
