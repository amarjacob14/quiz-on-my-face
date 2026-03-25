const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchCurrentEventsQuestions({ difficulty = 'any', amount = 10 }) {
  // 1. Fetch headlines from NewsAPI
  const newsRes = await fetch(
    `https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey=${process.env.NEWS_API_KEY}`
  );
  if (!newsRes.ok) throw new Error(`NewsAPI error: ${newsRes.status}`);
  const newsData = await newsRes.json();

  if (!newsData.articles?.length) throw new Error('No news articles available');

  const headlines = newsData.articles
    .filter(a => a.title && a.description && !a.title.includes('[Removed]'))
    .slice(0, 15)
    .map(a => `- ${a.title}: ${a.description}`)
    .join('\n');

  const difficultyNote = difficulty === 'any' ? 'mixed difficulty' : `${difficulty} difficulty`;

  // 2. Ask Claude to generate trivia questions from headlines
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Based on these recent news headlines, generate exactly ${amount} multiple choice trivia questions at ${difficultyNote}.

Headlines:
${headlines}

Return ONLY a valid JSON array, no markdown, no explanation. Each object must have:
- "question": string
- "correct_answer": string  
- "incorrect_answers": array of exactly 3 strings
- "difficulty": "easy", "medium", or "hard"

Example format:
[{"question":"...","correct_answer":"...","incorrect_answers":["...","...","..."],"difficulty":"medium"}]`
    }]
  });

  const raw = message.content[0].text.trim();
  const questions = JSON.parse(raw);

  return questions.slice(0, amount).map((q, i) => {
    const answers = [...q.incorrect_answers, q.correct_answer]
      .sort(() => Math.random() - 0.5);

    return {
      index:         i,
      question:      q.question,
      answers,
      correctAnswer: q.correct_answer,
      category:      'Current Events',
      difficulty:    q.difficulty || 'medium',
    };
  });
}

module.exports = { fetchCurrentEventsQuestions };
