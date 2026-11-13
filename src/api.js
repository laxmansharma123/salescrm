const API_URL = import.meta.env.VITE_API_URL;

export function getToken() {
  return localStorage.getItem('crm_token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('crm_user'));
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem('crm_token', token);
  localStorage.setItem('crm_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user');
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`${API_URL}/${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty response */
  }

  if (res.status === 401 && path !== 'login.php') {
    clearSession();
    window.location.hash = '#/login';
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}