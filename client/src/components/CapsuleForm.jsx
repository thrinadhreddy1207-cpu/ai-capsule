import { useState } from 'react';

export const EMPTY = {
  project_name: '', prompt_title: '', prompt_version: 'v1', prompt_text: '',
  response_summary: '', category: 'Coding', usefulness: 'Good',
  reviewed: false, improved: false, screenshot_url: '', notes: ''
};

const CATEGORIES = ['Coding', 'Writing', 'Research', 'Debugging', 'Study', 'Other'];
const USEFULNESS = ['Good', 'Needs Improvement'];

export default function CapsuleForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Note: no user_id is sent - the server takes it from the verified JWT.
      const { id, user_id, created_at, ...payload } = form;
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="capsule-form" onSubmit={handleSubmit}>
      <div className="grid-2">
        <label>
          <span>Project name *</span>
          <input value={form.project_name} onChange={set('project_name')} required placeholder="SmartFarm Irrigation" />
        </label>
        <label>
          <span>Prompt title *</span>
          <input value={form.prompt_title} onChange={set('prompt_title')} required placeholder="Debug cloud deployment" />
        </label>
      </div>

      <label>
        <span>Prompt text *</span>
        <textarea rows={4} value={form.prompt_text} onChange={set('prompt_text')} required placeholder="Paste the exact prompt you used" />
      </label>

      <label>
        <span>Response summary</span>
        <textarea rows={2} value={form.response_summary || ''} onChange={set('response_summary')} placeholder="What did the AI tell you?" />
      </label>

      <div className="grid-3">
        <label>
          <span>Version</span>
          <input value={form.prompt_version || ''} onChange={set('prompt_version')} placeholder="v1" />
        </label>
        <label>
          <span>Category</span>
          <select value={form.category || ''} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <span>Usefulness</span>
          <select value={form.usefulness || ''} onChange={set('usefulness')}>
            {USEFULNESS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
      </div>

      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={!!form.reviewed} onChange={set('reviewed')} />
          <span>I checked the response</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={!!form.improved} onChange={set('improved')} />
          <span>The output improved</span>
        </label>
      </div>

      <label>
        <span>Screenshot URL</span>
        <input type="url" value={form.screenshot_url || ''} onChange={set('screenshot_url')} placeholder="https://..." />
      </label>

      <label>
        <span>Notes</span>
        <textarea rows={2} value={form.notes || ''} onChange={set('notes')} placeholder="Tested and worked" />
      </label>

      {error && <p className="alert" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
