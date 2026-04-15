# Aviation Updates — Israel Flight Status

A full-stack web app for tracking which airlines are currently flying to/from Israel. Built for managing a Telegram aviation channel.

## Features

- **Public view** — clean card-based UI showing all airlines with color-coded status
- **Admin dashboard** — secure login, add/edit/delete airlines, change log
- **Status types** — Flying (green), Partial/Uncertain (yellow), Not Flying (red)
- **Search & filter** — by name, IATA code, route
- **Copy for Telegram** — one-click export formatted for Telegram Markdown
- **Change log** — tracks every status change with timestamps
- **SQLite** — zero-config database, stored in `backend/data/aviation.db`

## Project Structure

```
aviation-updates/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.js        # SQLite setup + schema
│   │   │   └── seed.js      # Create admin user + example airlines
│   │   ├── middleware/
│   │   │   └── auth.js      # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js      # POST /api/auth/login
│   │   │   ├── airlines.js  # CRUD /api/airlines
│   │   │   └── changelog.js # GET /api/changelog
│   │   └── app.js           # Express entry point
│   ├── data/                # SQLite database (auto-created)
│   ├── .env                 # Environment variables
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/client.js         # Axios instance + interceptors
    │   ├── components/
    │   │   ├── AirlineCard.jsx   # Public-facing airline card
    │   │   ├── AirlineForm.jsx   # Add/edit form
    │   │   ├── ChangeLog.jsx     # Change history list
    │   │   ├── Navbar.jsx        # Top navigation
    │   │   └── StatusBadge.jsx   # Flying/Not Flying/Partial badge
    │   └── pages/
    │       ├── PublicView.jsx    # / — public status page
    │       ├── Login.jsx         # /login — admin login
    │       └── Dashboard.jsx     # /admin — admin dashboard
    ├── index.html
    └── package.json
```

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run seed     # creates DB, admin user, and 12 example airlines
npm run dev      # starts on http://localhost:3001
```

### 2. Frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev      # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## Default Credentials

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

Change these in `backend/.env` before running `npm run seed`.

## API Endpoints

| Method | Route                  | Auth | Description              |
|--------|------------------------|------|--------------------------|
| POST   | /api/auth/login        | No   | Login, returns JWT token |
| GET    | /api/airlines          | No   | List all airlines        |
| GET    | /api/airlines/:id      | No   | Get single airline       |
| POST   | /api/airlines          | Yes  | Create airline           |
| PUT    | /api/airlines/:id      | Yes  | Update airline           |
| DELETE | /api/airlines/:id      | Yes  | Delete airline           |
| GET    | /api/changelog         | Yes  | Get change history       |
| GET    | /api/health            | No   | Health check             |

## Airline Status Fields

| Field                  | Type    | Notes                                        |
|------------------------|---------|----------------------------------------------|
| name                   | string  | Required                                     |
| iata_code              | string  | 2-3 letter code (e.g. LY, LH)               |
| status                 | enum    | `flying`, `not_flying`, `partial`            |
| destinations           | array   | Route codes (e.g. TLV-JFK)                  |
| cancellation_reason    | string  | Why the airline stopped flying               |
| cancellation_end_date  | date    | When they plan to resume (null = unknown)    |
| notes                  | string  | Free text notes                              |
| website                | url     | Airline website                              |

## Telegram Export Format

The "Copy for Telegram" button generates Markdown-formatted text like:

```
✈️ *Israel Flight Status Update*
📅 9 April 2026

🟢 *FLYING TO ISRAEL:*
• El Al — TLV-JFK, TLV-LHR
• Delta Air Lines — TLV-JFK, TLV-ATL

🟡 *PARTIAL / UNCERTAIN:*
• Ryanair — TLV-STN, TLV-BGY

🔴 *NOT FLYING:*
• Lufthansa — Security assessment (until 30 Jun 2025)
• British Airways — Indefinite suspension

📊 *3 flying · 1 partial · 2 not flying*
```

## Future Expansion (structure is ready)

- **Web scraping** — add a `scrapers/` directory in backend, call `PUT /api/airlines/:id` to update automatically
- **Telegram bot** — watch the `/api/changelog` endpoint for new entries and post updates
- **Webhooks** — add a `POST /api/webhooks/notify` route to trigger Telegram posts on status change
- **More admins** — add `POST /api/auth/register` behind a secret key

## Tech Stack

- **Frontend**: React 18, React Router 6, Tailwind CSS 3, Vite
- **Backend**: Node.js, Express 4, better-sqlite3, JWT, bcryptjs
- **Database**: SQLite (via better-sqlite3)
