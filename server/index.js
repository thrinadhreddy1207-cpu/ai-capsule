import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import capsuleRoutes from './routes/capsules.js';

// Fail fast if required secrets are missing, instead of failing mysteriously at login.
for (const name of ['JWT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL']) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Render (and most cloud hosts) terminate HTTPS at a proxy in front of the app.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Public health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// OAuth login / callback / logout / me
app.use('/auth', authRoutes);

// Protected CRUD (JWT middleware is applied inside the router)
app.use('/api/capsules', capsuleRoutes);

// Unknown API routes -> JSON 404 (not the React page)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app from the same origin as the API.
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // Client-side routes (/, /login, /dashboard) all return index.html
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  app.get('/', (req, res) => res.send('API running. Build the frontend with "npm run build".'));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI Capsule listening on port ${port}`));
