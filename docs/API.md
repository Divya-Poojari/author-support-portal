# REST API Reference

Base URL for local development: `http://localhost:4000/api`. Except for health and login, endpoints require `Authorization: Bearer <JWT>`. Role-restricted endpoints return `403`; missing/invalid tokens return `401`. Errors use JSON such as `{ "error": "..." }`, with validation details where useful.

## Authentication

### `POST /auth/login`

```json
{ "email": "priya.sharma@email.com", "password": "Author123!" }
```

Returns `{ "token": "...", "user": { "id": "AUTH001", "role": "author", "name": "Priya Sharma", "email": "..." } }`.

### `GET /auth/me`
Returns the authenticated user's public profile.

## Books and authors

- `GET /books` — author role only; returns the current author's books, never another author's data.
- `GET /authors` — admin role only; returns author directory and book counts.

## Tickets

### `GET /tickets`
Returns tickets accessible to the caller. Optional query parameters: `status`, `category`, `priority`, `from` and `to` (`YYYY-MM-DD`), `search`. Admins see all tickets; authors see only their own.

### `POST /tickets` — author role only

```json
{
  "bookId": "BK001",
  "subject": "Royalty payment query",
  "description": "I have a question about the pending royalty amount on my dashboard."
}
```

`bookId` can be `null` or omitted for General / Account Level. When a book is supplied, the API verifies that it belongs to the signed-in author. The response contains the created ticket and an optional `aiWarning` if the LLM provider was unavailable.

### `GET /tickets/:id`
Returns ticket details, public messages, and—only for admins—internal notes. Authors cannot read another author's ticket.

### `POST /tickets/:id/ai-draft` — admin role only
Generates a draft based on the ticket, associated book status, and BookLeaf knowledge base. Returns `draft`, suggested `category` and `priority`, `aiMode` (`openai` or `fallback`) and optional `aiWarning`. It does not send the response.

### `PATCH /tickets/:id` — admin role only
Accepts any subset of the following fields:

```json
{ "status": "In Progress", "category": "Royalty & Payments", "priority": "High", "assignToMe": true }
```

Allowed statuses: `Open`, `In Progress`, `Resolved`, `Closed`. Allowed priorities: `Critical`, `High`, `Medium`, `Low`. Allowed categories are listed in the assignment. `assignToMe` records the authenticated admin's user ID as assignee.

### `POST /tickets/:id/messages` — admin role only

```json
{ "body": "Thank you for flagging this. We will review the details and update you within 48 hours." }
```

Adds an official response visible to the author. Sending the first response automatically moves an `Open` ticket to `In Progress`.

### `POST /tickets/:id/notes` — admin role only

```json
{ "body": "Check the quarterly payout report before the next response." }
```

Adds a private internal note, never exposed in the author's ticket view.

## Other

- `GET /health` — liveness check.
- Unknown routes return a JSON `404` response.
