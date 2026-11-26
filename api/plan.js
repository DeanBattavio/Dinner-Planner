import https from 'node:https';

function callGoogle(path, method, apiKey, payload) {
  return new Promise(function(resolve, reject) {
    const bodyStr = payload ? JSON.stringify(payload) : null;
    const headers = { 'x-goog-api-key': apiKey };
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const host = ['generativelanguage', 'googleapis', 'com'].join('.');

    const req = https.request({
      hostname: host,
      port: 443,
      path: path,
      method: method,
      family: 4,
      headers: headers
    }, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        resolve({ status: res.statusCode, text: data });
      });
    });

    req.on('error', function(err) { reject(err); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

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
    const genRes = await callGoogle('/v1beta/models/gemini-3.8-flash:generateContent', 'POST', apiKey, {
      contents: [{ parts: [{ text: prompt }] }]
    });

    const data = JSON.parse(genRes.text);

    if (genRes.status !== 200 || data.error) {
      const errMsg = (data.error && data.error.message) ? data.error.message : ('Status ' + genRes.status);
      return res.status(500).json({ error: 'Google API Error: ' + errMsg });
    }

    const firstCandidate = data.candidates && data.candidates.at(0);
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.at(0);
    const reply = (firstPart && firstPart.text) || 'No response generated.';

    return res.status(200).json({ result: reply });
  } catch (err) {
    return res.status(500).json({ error: 'Connection Error: ' + err.message });
  }
}
