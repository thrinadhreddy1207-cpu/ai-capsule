// All calls go to the same origin as the page (Express serves both),
// so the browser automatically sends the HttpOnly "token" cookie.
// The frontend never reads or stores the JWT itself.
async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request('GET', '/auth/me'),
  logout: () => request('POST', '/auth/logout'),
  list: () => request('GET', '/api/capsules'),
  create: (data) => request('POST', '/api/capsules', data),
  update: (id, data) => request('PUT', `/api/capsules/${id}`, data),
  remove: (id) => request('DELETE', `/api/capsules/${id}`)
};
