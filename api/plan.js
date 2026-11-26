export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel Environment Variables.' });
  }

  const { ingredients, diet } = req.body;
  const prompt = `I have these ingredients: ${ingredients}. Dietary preference: ${diet || 'None'}. Give me 3 realistic dinner recipes I can make, and list any extra groceries I need to buy. Format cleanly with headings and bullet points.`;

  try {
    const response = await fetch('https://googleapis.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(500).json({ error: 'Google API Error: ' + (data.error?.message || response.statusText) });
    }

    const firstCandidate = data.candidates && data.candidates.at(0);
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.at(0);
    const reply = (firstPart && firstPart.text) || 'No response generated.';

    res.status(200).json({ result: reply });
  } catch (err) {
    const details = err.cause ? err.cause.message : err.message;
    res.status(500).json({ error: 'Network Error: ' + details });
  }
}
