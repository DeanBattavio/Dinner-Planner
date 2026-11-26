export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ingredients, diet } = req.body;
  const prompt = `I have these ingredients: ${ingredients}. Dietary preference: ${diet || 'None'}. Give me 3 realistic dinner recipes I can make, and list any extra groceries I need to buy. Format cleanly with headings and bullet points.`;

  try {
    const response = await fetch(`https://googleapis.com{process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    res.status(200).json({ result: reply });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate recipes." });
  }
}
