Frontend notes

- During development with Vite, use the proxy so frontend requests to `/api/*` are forwarded to the backend at `http://localhost:5000`.
- Example `vite.config.js` is included in this folder.

Updating React components

If you have React components that currently call third-party URLs directly, update them to use a single base API URL. Two recommended approaches:

1) Use relative `/api` paths + Vite proxy (recommended for dev):

```js
// Example in a React component
async function fetchWeather(lat, lon) {
  const resp = await fetch(`/api/weather?latitude=${lat}&longitude=${lon}`);
  const data = await resp.json();
  return data;
}
```

2) Use an environment variable to point to backend (useful for production):

```js
// set VITE_API_BASE in .env (Vite): VITE_API_BASE=https://api.myapp.example
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
async function fetchWeather(lat, lon) {
  const resp = await fetch(`${API_BASE}/weather?latitude=${lat}&longitude=${lon}`);
  return resp.json();
}
```

CORS notes

- With the Vite proxy in `vite.config.js`, you can keep fetch calls as `/api/...` and avoid CORS errors in development.
- For production, serve the frontend from the same domain as the backend or configure proper CORS on the server.
