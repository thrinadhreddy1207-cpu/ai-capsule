import { Router } from 'express';
import db from '../db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Every /api/capsules route below goes through the JWT middleware.
router.use(requireAuth);

const TEXT_FIELDS = [
  'project_name', 'prompt_title', 'prompt_version', 'prompt_text',
  'response_summary', 'category', 'usefulness', 'screenshot_url', 'notes'
];
const REQUIRED = ['project_name', 'prompt_title', 'prompt_text'];

// Build a clean record from the request body. user_id is deliberately
// NOT read from the body - ownership always comes from the verified JWT.
function cleanInput(body = {}) {
  const data = {};
  for (const f of TEXT_FIELDS) {
    const v = body[f];
    data[f] = typeof v === 'string' ? v.trim() : null;
    if (data[f] === '') data[f] = null;
  }
  data.reviewed = body.reviewed === true || body.reviewed === 1 ? 1 : 0;
  data.improved = body.improved === true || body.improved === 1 ? 1 : 0;

  const missing = REQUIRED.filter((f) => !data[f]);
  if (missing.length) return { error: `Missing required field(s): ${missing.join(', ')}` };
  if (data.screenshot_url && !/^https?:\/\//i.test(data.screenshot_url)) {
    return { error: 'Screenshot URL must start with http:// or https://' };
  }
  return { data };
}

function toApi(row) {
  return { ...row, reviewed: !!row.reviewed, improved: !!row.improved };
}

// READ - only the authenticated user's records
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.user.id);
  res.json(rows.map(toApi));
});

// CREATE - owner is the authenticated user
router.post('/', (req, res) => {
  const { data, error } = cleanInput(req.body);
  if (error) return res.status(400).json({ error });

  const info = db.prepare(`
    INSERT INTO capsules (user_id, project_name, prompt_title, prompt_version, prompt_text,
      response_summary, category, usefulness, reviewed, improved, screenshot_url, notes)
    VALUES (@user_id, @project_name, @prompt_title, @prompt_version, @prompt_text,
      @response_summary, @category, @usefulness, @reviewed, @improved, @screenshot_url, @notes)
  `).run({ ...data, user_id: req.user.id });

  const row = db.prepare('SELECT * FROM capsules WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(toApi(row));
});

// UPDATE - WHERE clause includes user_id, so other users' records cannot be changed
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  const { data, error } = cleanInput(req.body);
  if (error) return res.status(400).json({ error });

  const info = db.prepare(`
    UPDATE capsules SET project_name=@project_name, prompt_title=@prompt_title,
      prompt_version=@prompt_version, prompt_text=@prompt_text,
      response_summary=@response_summary, category=@category, usefulness=@usefulness,
      reviewed=@reviewed, improved=@improved, screenshot_url=@screenshot_url, notes=@notes
    WHERE id=@id AND user_id=@user_id
  `).run({ ...data, id, user_id: req.user.id });

  // 404 whether the record doesn't exist or belongs to someone else,
  // so we don't reveal which ids exist.
  if (info.changes === 0) return res.status(404).json({ error: 'Capsule not found' });
  const row = db.prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?').get(id, req.user.id);
  res.json(toApi(row));
});

// DELETE - same ownership check
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  const info = db.prepare('DELETE FROM capsules WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Capsule not found' });
  res.status(204).end();
});

export default router;
