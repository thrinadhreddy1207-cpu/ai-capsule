import jwt from 'jsonwebtoken';

// JWT authentication middleware for every protected route.
// Reads the application JWT from the HttpOnly cookie named "token",
// verifies its signature and expiry with JWT_SECRET, and attaches the
// verified identity to req.user. Missing or invalid token -> 401.
export default function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: no token' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = {
      id: String(payload.sub),   // GitHub user ID - the record owner
      login: payload.login,
      name: payload.name,
      avatar: payload.avatar
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
}
