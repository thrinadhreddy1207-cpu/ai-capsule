function formatDate(s) {
  if (!s) return '';
  // SQLite CURRENT_TIMESTAMP is UTC without a "Z"
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(d) ? s : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CapsuleCard({ capsule, onEdit, onDelete }) {
  const c = capsule;
  return (
    <article className="capsule">
      <div className="capsule-top">
        <span className="capsule-project">{c.project_name}</span>
        {c.prompt_version && <span className="version">{c.prompt_version}</span>}
      </div>
      <h3 className="capsule-title">{c.prompt_title}</h3>
      <p className="capsule-prompt">{c.prompt_text}</p>
      {c.response_summary && (
        <p className="capsule-answer"><strong>Answer summary.</strong> {c.response_summary}</p>
      )}
      {c.notes && <p className="capsule-notes"><strong>Notes.</strong> {c.notes}</p>}

      <div className="pills">
        {c.category && <span className="pill">{c.category}</span>}
        {c.usefulness && (
          <span className={`pill ${c.usefulness === 'Good' ? 'pill-good' : 'pill-warn'}`}>{c.usefulness}</span>
        )}
        <span className={`pill ${c.reviewed ? '' : 'pill-off'}`}>{c.reviewed ? 'Reviewed' : 'Not reviewed'}</span>
        <span className={`pill ${c.improved ? '' : 'pill-off'}`}>{c.improved ? 'Improved' : 'Not improved'}</span>
      </div>

      <div className="capsule-foot">
        <span className="muted">
          Saved {formatDate(c.created_at)}
          {c.screenshot_url && (
            <> · <a href={c.screenshot_url} target="_blank" rel="noopener noreferrer">Screenshot</a></>
          )}
        </span>
        <span className="capsule-actions">
          <button className="btn btn-small btn-ghost" onClick={() => onEdit(c)}>Edit</button>
          <button className="btn btn-small btn-danger" onClick={() => onDelete(c)}>Delete</button>
        </span>
      </div>
    </article>
  );
}
