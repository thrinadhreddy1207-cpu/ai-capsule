import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import CapsuleForm, { EMPTY } from '../components/CapsuleForm.jsx';
import CapsuleCard from '../components/CapsuleCard.jsx';
import { api } from '../api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = new, record = edit
  const [flash, setFlash] = useState('');

  // Any 401 means the session is missing/expired -> back to /login.
  function handleError(err) {
    if (err.status === 401) navigate('/login', { replace: true });
    else setError(err.message);
  }

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api.me();
        setUser(user);
        setCapsules(await api.list());   // READ
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showFlash(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2500);
  }

  async function handleSave(payload) {
    try {
      if (editing?.id) {
        const updated = await api.update(editing.id, payload);          // UPDATE
        setCapsules((list) => list.map((c) => (c.id === updated.id ? updated : c)));
        showFlash('Capsule updated');
      } else {
        const created = await api.create(payload);                      // CREATE
        setCapsules((list) => [created, ...list]);
        showFlash('Capsule saved');
      }
      setEditing(null);
    } catch (err) {
      if (err.status === 401) return handleError(err);
      throw err; // shown inside the form
    }
  }

  async function handleDelete(capsule) {
    if (!window.confirm(`Delete "${capsule.prompt_title}"? This can't be undone.`)) return;
    try {
      await api.remove(capsule.id);                                     // DELETE
      setCapsules((list) => list.filter((c) => c.id !== capsule.id));
      showFlash('Capsule deleted');
    } catch (err) {
      handleError(err);
    }
  }

  async function handleLogout() {
    await api.logout().catch(() => {});
    navigate('/', { replace: true });
  }

  if (loading) {
    return (<><Header /><main className="dashboard"><p className="muted">Loading your capsules…</p></main></>);
  }
  if (!user) return null;

  return (
    <>
      <Header>
        <span className="user">
          {user.avatar && <img src={user.avatar} alt="" width="28" height="28" />}
          {user.login}
        </span>
        <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
      </Header>

      <main className="dashboard">
        <div className="dash-head">
          <div>
            <h1>Your capsules</h1>
            <p className="muted">
              {capsules.length === 0 ? 'No prompts saved yet.' : `${capsules.length} saved prompt${capsules.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {!editing && (
            <button className="btn btn-primary" onClick={() => setEditing({})}>New capsule</button>
          )}
        </div>

        {flash && <p className="flash" role="status">{flash}</p>}
        {error && <p className="alert" role="alert">{error}</p>}

        {editing && (
          <section className="form-panel">
            <h2>{editing.id ? `Edit “${editing.prompt_title}”` : 'New capsule'}</h2>
            <CapsuleForm
              key={editing.id || 'new'}
              initial={editing.id ? editing : EMPTY}
              submitLabel={editing.id ? 'Save changes' : 'Save capsule'}
              onSubmit={handleSave}
              onCancel={() => setEditing(null)}
            />
          </section>
        )}

        {capsules.length === 0 && !editing ? (
          <div className="empty">
            <p>Save the first prompt you want to keep. A good one to start with is the last prompt that actually fixed something for you.</p>
            <button className="btn btn-primary" onClick={() => setEditing({})}>New capsule</button>
          </div>
        ) : (
          <div className="capsule-list">
            {capsules.map((c) => (
              <CapsuleCard
                key={c.id}
                capsule={c}
                onEdit={(rec) => { setEditing(rec); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
