import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Cookie options for the application JWT.
// Secure + HttpOnly as required. Browsers treat http://localhost as a
// secure context, so Secure cookies still work in local development (Chrome/Firefox/Edge).
const tokenCookie = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',          // 'lax' lets the cookie survive the redirect back from GitHub
  path: '/',
  maxAge: 24 * 60 * 60 * 1000 // 1 day, same as JWT expiry
};

const clientUrl = () => process.env.CLIENT_URL || '';

// Step 1: send the browser to GitHub's authorize page.
// A random "state" value is stored in a short-lived cookie to prevent CSRF.
router.get('/github', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'read:user',
    state
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Step 2: GitHub redirects back here with ?code&state.
router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state');

  if (!code || !state || state !== savedState) {
    return res.redirect(`${clientUrl()}/login?error=state`);
  }

  try {
    // Exchange the code for a GitHub access token (server-to-server; secret never reaches the browser)
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(tokenData.error_description || 'No access token');

    // Use the GitHub token once to identify the user. It is NOT stored or sent to the browser.
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-capsule'
      }
    });
    if (!userRes.ok) throw new Error(`GitHub user lookup failed: ${userRes.status}`);
    const gh = await userRes.json();

    // Step 3: Express issues its OWN application JWT (not the GitHub token).
    const appToken = jwt.sign(
      { sub: String(gh.id), login: gh.login, name: gh.name || gh.login, avatar: gh.avatar_url },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1d' }
    );

    res.cookie('token', appToken, tokenCookie);
    return res.redirect(`${clientUrl()}/dashboard`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    return res.redirect(`${clientUrl()}/login?error=oauth`);
  }
});

// Who am I? Used by the React dashboard to check the session.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Log out: clear the JWT cookie (same options, so the browser matches it).
router.post('/logout', (req, res) => {
  const { maxAge, ...opts } = tokenCookie;
  res.clearCookie('token', opts);
  res.json({ ok: true });
});

export default router;
