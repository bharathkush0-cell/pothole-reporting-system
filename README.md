# RoadWatch — AI-Powered Pothole Reporting System

RoadWatch is a civic tech prototype for reporting potholes, tracking repair progress, viewing AI severity analysis, and managing municipal dispatch.

## Project Structure

- `frontend/`
  - `index.html` — SPA landing page and dashboard UI
  - `style.css` — application styling
  - `script.js` — client-side app logic and UI interactions
  - `assets/` — images and icon resources
  - `pages/` — placeholder for future multi-page content

- `backend/`
  - `server.js` — minimal Node.js static server
  - `api.js` — simulated HTTP API gateway
  - `auth.js` — authentication and session services
  - `admin.js` — admin workflows and reports management
  - `ai-engine.js` — pothole AI severity and cost estimation logic
  - `analytics.js` — dashboard analytics services
  - `notifications.js` — notification events and user messages
  - `database.js` — browser data persistence and seeded records
  - `reports.js` — report CRUD, search, and lifecycle management
  - `storage.js` — browser storage wrapper

- `uploads/` — runtime file uploads (ignored by git)
- `static/` — future static assets and build output
- `templates/` — future HTML or server template files
- `config/` — configuration files and environment settings
- `docs/` — documentation
- `tests/` — automated tests and validation scripts

## Getting Started

1. Install dependencies:

```bash
cd pothole-reporting-system
npm install
```

2. Start the app locally:

```bash
npm start
```

3. Open your browser at `http://localhost:3000`

## Notes

- This repo contains a demonstration frontend app with browser-based simulated backend modules.
- Data is stored in browser storage and reset when the browser cache is cleared.
- Use `backend/server.js` to serve the app locally.
