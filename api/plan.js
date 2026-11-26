export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').replace(/\s+/g, '');
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel Environment Variables.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const ingredients = body.ingredients || '';
  const diet = body.diet || 'None';

  const prompt = 'I have these ingredients: ' + ingredients + '. Dietary preference: ' + diet + '. Give me 3 realistic dinner recipes I can make using these ingredients, and list any extra groceries I need to buy. Format cleanly with clear titles and bullet points.';

  try {
    let modelPath = 'models/gemini-2.5-flash';
    const listRes = await fetch('https://googleapis.com', {
      headers: { 'x-goog-api-key': apiKey }
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const models = listData.models || [];
      const validModels = models.filter(function(m) {
        return m.supportedGenerationMethods &&
          m.supportedGenerationMethods.indexOf('generateContent') !== -1 &&
          m.name.indexOf('flash') !== -1 &&
          m.name.indexOf('tts') === -1 &&
          m.name.indexOf('image') === -1 &&
          m.name.indexOf('live') === -1;
      });
      if (validModels.length > 0) {
        modelPath = validModels.at(0).name;
      }
    }

    const apiUrl = 'https://googleapis.com' + modelPath + ':generateContent';

    const response = await fetch(apiUrl, {
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
      const errMsg = (data.error && data.error.message) ? data.error.message : response.statusText;
      return res.status(500).json({ error: 'Google API Error: ' + errMsg });
    }

    const firstCandidate = data.candidates && data.candidates.at(0);
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.at(0);
    const reply = (firstPart && firstPart.text) || 'No response generated.';

    return res.status(200).json({ result: reply });
  } catch (err) {
    return res.status(500).json({ error: 'Error: ' + err.message });
  }
}
