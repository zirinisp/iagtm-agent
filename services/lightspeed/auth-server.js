import 'dotenv/config';
import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dirname, 'tokens.json');

const {
  LIGHTSPEED_CLIENT_ID,
  LIGHTSPEED_CLIENT_SECRET,
  LIGHTSPEED_REDIRECT_URI,
  LIGHTSPEED_AUTH_URL,
  LIGHTSPEED_TOKEN_URL,
  LIGHTSPEED_SCOPE,
} = process.env;

const app = express();
const PORT = 3000;

// Step 1: Redirect user to Lightspeed authorization page
app.get('/', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LIGHTSPEED_CLIENT_ID,
    scope: LIGHTSPEED_SCOPE,
    redirect_uri: LIGHTSPEED_REDIRECT_URI,
  });
  const authUrl = `${LIGHTSPEED_AUTH_URL}?${params}`;
  res.redirect(authUrl);
});

// Step 2: Handle callback with authorization code, exchange for tokens
app.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('Authorization error:', error);
    return res.status(400).send(`Authorization failed: ${error}`);
  }

  if (!code) {
    return res.status(400).send('No authorization code received');
  }

  console.log('Received authorization code:', code.substring(0, 10) + '...');

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveTokens(tokens);
    console.log('Tokens saved successfully');
    res.send(`
      <h1>Authorization successful!</h1>
      <p>Access token expires in ${tokens.expires_in} seconds.</p>
      <p>Tokens saved to tokens.json. You can close this window.</p>
    `);
  } catch (err) {
    console.error('Token exchange failed:', err.message);
    res.status(500).send(`Token exchange failed: ${err.message}`);
  }
});

async function exchangeCodeForTokens(code) {
  const credentials = Buffer.from(`${LIGHTSPEED_CLIENT_ID}:${LIGHTSPEED_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(LIGHTSPEED_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: LIGHTSPEED_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

async function saveTokens(tokens) {
  const data = {
    ...tokens,
    obtained_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  };
  await writeFile(TOKEN_FILE, JSON.stringify(data, null, 2));
}

app.listen(PORT, () => {
  console.log(`\nLightspeed OAuth Server running on http://localhost:${PORT}`);
  console.log(`\nOpen http://localhost:${PORT} in your browser to start authorization.\n`);
});
