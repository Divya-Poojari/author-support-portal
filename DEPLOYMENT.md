# Private deployment notes

The assignment asks for a live demo, but the source ZIP alone does not create a hosted URL. Keep the repository private and only share access with the evaluator.

## Suggested deployment layout

1. Deploy `server/` as a private Node web service on a host approved for the evaluation.
   - Build/install command: `npm install`
   - Start command: `npm start`
   - Set `PORT` from the host, a long random `JWT_SECRET`, `CLIENT_ORIGIN` to the frontend URL, `MONGODB_URI`, `MONGODB_DB=bookleaf_portal`, and optionally `OPENAI_API_KEY` / `OPENAI_MODEL`. Add the host outbound IP to Atlas Network Access if the host has a stable IP; otherwise configure a suitable secure network approach for that host.
2. Deploy `client/` as a static site.
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Build-time environment variable: `VITE_API_URL=https://YOUR-API-HOST/api`
3. Seeded data is initialised in MongoDB Atlas on the API's first start if the configured database has no users. The current adapter is still single-instance only because it loads state into memory; do not scale the API to multiple instances without changing it to per-record database operations.
4. Verify `/api/health`, author login, admin login, create-ticket flow, AI fallback, sending a response, and author visibility before sharing the URL.

Do not deploy with the sample JWT secret, demo passwords, or a public repository. For an evaluator-facing demo, use a private URL and rotate demo credentials/secrets as appropriate.
