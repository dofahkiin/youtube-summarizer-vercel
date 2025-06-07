// Vercel serverless function for YouTube transcript summarization
export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { transcript } = req.body;

    // Validate input
    if (!transcript || transcript.trim().length === 0) {
      res.status(400).json({ error: 'Transcript is required' });
      return;
    }

    // Check if API key is configured
    if (!process.env.DEEPSEEK_API_KEY) {
      res.status(500).json({ error: 'API key not configured' });
      return;
    }

    // Call DeepSeek API
    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `Summarize this YouTube video transcript in exactly 100 words:\n\n${transcript}`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!deepSeekResponse.ok) {
      const errorData = await deepSeekResponse.text();
      console.error('DeepSeek API error:', errorData);
      res.status(deepSeekResponse.status).json({
        error: 'DeepSeek API error',
        details: errorData
      });
      return;
    }

    const data = await deepSeekResponse.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      res.status(500).json({ error: 'No summary generated' });
      return;
    }

    // Return the summary
    res.status(200).json({
      success: true,
      summary: summary.trim()
    });

  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
