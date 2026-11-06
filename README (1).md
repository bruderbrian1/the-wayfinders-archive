# AI Cartographer proxy (optional)

The application is fully functional offline. This server adds an **optional** AI narrative layer and is the only place a provider credential exists.

## Run

```bash
AI_API_KEY=sk-... \
AI_MODEL=gpt-4o-mini \
AI_BASE_URL=https://api.openai.com/v1 \
PORT=8787 \
node server/ai-proxy.mjs
```

Open <http://localhost:8787/>. Then in **Data Vault → AI Cartographer → Enable AI** the endpoint is `/api/cartographer`.

Without `AI_API_KEY`, the proxy serves the app normally and returns `503` for narrative requests; the client automatically falls back to its deterministic archive templates.

## Security properties

- The API key stays in the server process environment. It is never written to disk, never returned by `/health`, and never sent to the browser.
- Request bodies are limited to 64 KB and narrative context to 24 KB.
- Narrative kinds are allow-listed; unknown kinds are rejected.
- Requests are rate-limited to 30/minute per source address.
- Provider output is sanitised (HTML/script stripped) and length-bounded (40–4000 chars) before it is returned.
- AI output never modifies the game state. The client uses it as display text only; all mechanics are computed by the deterministic engines.
- `GET /health` reports `{ok, configured, provider, model}` and nothing sensitive.

## Endpoints

| Method | Path | Behaviour |
|---|---|---|
| GET | `/health` | Service status; no credentials. |
| POST | `/api/cartographer` | `{kind, context}` → `{text, provider, model}` or an error. |
| GET | `/*` | Static app from `../files`. |
