# BookLeaf Author Support & Communication Portal

A full-stack technical-assignment implementation with an author portal, operations/admin portal, REST API, seeded sample catalogue, AI-assisted ticket triage and response drafts, and near-real-time ticket refresh (5-second polling).

> **Confidential evaluation project.** Keep the repository private and share it only with the evaluator. Demo credentials are for local evaluation; change them before any hosted demo.

## Stack and architecture

- **Frontend:** React 18 + Vite; responsive author and admin workspaces.
- **Backend:** Node.js + Express REST API.
- **Persistence:** MongoDB Atlas via the official Node.js driver. Authors, users, tickets, messages, internal notes, and counters are stored in separate collections. The provided JSON dataset is retained as the first-run seed source.
- **Authentication:** Email/password login, bcrypt password hashes, signed JWTs, role middleware, and per-author resource checks.
- **Validation:** Zod validates API request bodies and returns actionable 400 errors.
- **AI:** OpenAI Chat Completions using `gpt-4o-mini` by default when `OPENAI_API_KEY` is configured. Without a key, deterministic local classification and a policy-grounded response template keep the ticket workflow functional. Provider failures also fall back gracefully.
- **Updates:** The UI refreshes ticket data every five seconds; authors see staff replies without manually refreshing the page.

### Project layout

```text
bookleaf-portal/
├── client/                 # React/Vite UI
│   └── src/main.jsx         # Author/admin flows and components
│   └── src/style.css        # Responsive styling
├── server/
│   ├── data/bookleaf_sample_data.json  # Exact 10-author/18-book seed records
│   └── src/
│       ├── index.js         # Express API, authentication, RBAC, validation
│       ├── ai.js            # AI prompt, classification, fallback drafts
│       ├── store.js         # MongoDB Atlas persistence / first-run seed
│       └── seed.js          # Re-hash demo account passwords
├── docs/                    # API reference and approach write-up
└── README.md
```

## Requirements

- Node.js 20 or later (Node 22 recommended)
- npm 10 or later
- Optional: OpenAI API key for live LLM classification and draft generation

## Run locally

Open a terminal in the project root.

### 1. Install dependencies

```bash
npm install
npm run install:all
```

### 2. Configure MongoDB Atlas and the API

1. In [MongoDB Atlas](https://cloud.mongodb.com/), create/select a project and create a cluster (the free tier is sufficient for a small demo if offered in your account/region).
2. Create a **database user** under Database Access. This is separate from your Atlas website login. Give it read/write access to the application database, not Atlas project-admin privileges.
3. Under Network Access / IP Access List, add your current public IP. Add the deployment host's outbound IP when deploying. Avoid `0.0.0.0/0` unless you specifically understand and accept the exposure.
4. Open the cluster's **Connect → Drivers → Node.js** screen and copy the SRV connection string. Replace the password placeholder with the database user's password. URL-encode special characters in the password (or generate a password without URI-reserved characters).
5. Copy the environment template:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

   On macOS/Linux, use `cp server/.env.example server/.env`.
6. Edit `server/.env` and set `MONGODB_URI`, `MONGODB_DB`, and a long random `JWT_SECRET`. Optionally set `OPENAI_API_KEY`; without it, AI classification/drafting falls back to local rules.

Example `server/.env` (replace placeholders; never commit this file):

```env
PORT=4000
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb+srv://<DB_USERNAME>:<URL_ENCODED_DB_PASSWORD>@<CLUSTER_HOST>/?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB=bookleaf_portal
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Atlas creates the database and collections on the first successful write. The API seeds the provided 10-author/18-book dataset when the database has no users, and assigns the documented demo passwords. Keep the Atlas URI only in `server/.env`; never put it in a `VITE_` frontend variable.

### 3. Start both applications

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API health check: http://localhost:4000/api/health

Or start each in a separate terminal:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

### 4. Production frontend build

```bash
npm run build
```

Run the API in production with `npm start` from the project root (or `npm start --prefix server`). Serve the generated `client/dist` directory with a static host and set `VITE_API_URL` at build time if the API is hosted at a different origin. Configure `CLIENT_ORIGIN` on the API to the exact frontend origin.

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bookleaf.test` | `Admin123!` |
| Author | `priya.sharma@email.com` | `Author123!` |
| Author | `rohit.kapoor@email.com` | `Author123!` |
| Any seeded author | Use the author's email in the dataset | `Author123!` |

On first API startup, the app seeds the sample data if the configured database has no users and hashes the demo passwords. To reset the Atlas database, delete the application collections (`users`, `authors`, `tickets`, `messages`, `notes`, `counters`) from the `bookleaf_portal` database in Atlas, then restart the API. This removes all test tickets and responses; do not do this if you need to retain them.

## Functionality checklist

### Author portal
- Email/password login and author-only data access.
- My Books catalogue with ISBN, genre, publication date, status, MRP, sales, earned/paid/pending royalties; null production values and zero payouts display safely.
- Create a support ticket against a book or General / Account Level; attachment selector is UI-only as permitted by the brief.
- View tickets, status, original query and official support responses; ticket data polls every five seconds.

### Admin portal
- Queue across authors with status/category/priority/search filters; urgent and older unresolved tickets sort first.
- AI-generated category and priority on ticket creation, with editable overrides.
- Generate an AI draft on demand, edit it, and send the official response to the author.
- Update status, assign to self, add private internal notes, and inspect author records.

### AI integration and cost choices
- The prompt includes a compact BookLeaf policy knowledge base and asks for strict JSON output with a known category, priority, and draft.
- Only the current ticket, relevant book status, and author name are sent; no full ticket history is sent to the model.
- AI drafts are suggestions and are never automatically sent.
- No API key is exposed to the browser. Provider errors or missing configuration fall back to a deterministic rule classifier and templated response, so ticket creation is not blocked.
- The fallback is intentionally transparent and is not presented as an LLM response.

## API reference

See [`docs/API.md`](docs/API.md) for endpoint details and example payloads.

## Known limitations / production improvements

- The current MongoDB adapter loads the collections into memory and upserts the application state after writes. It is suitable only for a single API instance in this assignment demo; for production/multiple instances, use per-record repository operations, indexes, atomic updates/transactions where appropriate, and avoid whole-state persistence.
- Demo account creation and default passwords are for local evaluation only. Production should use controlled account provisioning, password reset, rate limiting, secure cookies or short-lived tokens, audit logs, and secret management.
- The attachment picker is UI-only; no file is uploaded or stored.
- Polling is near-real-time rather than WebSockets/SSE. At scale, use SSE or WebSockets.
- Add automated unit/integration tests, migrations, structured logging/monitoring, and deployment-specific health/readiness checks.
- The provided ISBN values are sample data and should not be treated as real ISBN validation examples.

## Assignment write-up

See [`docs/APPROACH.md`](docs/APPROACH.md) for the concise prioritisation, trade-offs, and production roadmap.
