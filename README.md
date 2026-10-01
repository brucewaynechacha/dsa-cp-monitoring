# DSA Activity Heatmap ⚡

A minimalist, high-performance website that tracks your **LeetCode** and **Codeforces** question submissions in a unified activity heatmap.

---

## ✨ Features

- **Unified Activity Heatmap**: Merges your daily submissions from both LeetCode and Codeforces into an interactive GitHub-style calendar heatmap.
- **Platform Filters**: View combined activity, or filter exclusively by **LeetCode** (amber/orange palette) or **Codeforces** (blue/cyan palette).
- **Streak & Consistency Metrics**:
  - Total problems solved across platforms (with LC & CF breakdown pills)
  - Current active streak
  - Longest streak (personal record)
  - Total active days & consistency percentage
- **Interactive Day Inspector**:
  - Hover over any day on the heatmap to view submission counts and platform breakdown.
  - Click any day cell to inspect the problems solved on that date.
  - Recent submissions list with direct links to the problem statements.
- **Accepted vs. All Submissions**: Toggle between accepted solves or total attempts.
- **Time Range Selector**: View the past 365 days or choose a specific calendar year.
- **Minimalist Aesthetic**:
  - Fast, lightweight, zero external runtime dependencies.
  - Default dark mode with instant light mode toggle.
  - Saved handles in `localStorage` for instant return visits.
  - One-click "Demo" mode with sample active handles (`lee215` & `tourist`).

---

## 🚀 Quick Start

### Development
1. Start the backend API server:
```bash
npm run server
```
2. In a separate terminal, launch the Vite dev server with HMR:
```bash
npm run dev
```
Open `http://localhost:5173`. Requests to `/api` are automatically proxied to `http://localhost:3000`.

### Production Build & Serve
Build the production bundle with Vite and start the server:
```bash
npm run build
npm start
```
Open `http://localhost:3000`. `server.js` serves optimized static assets directly from `dist/`.

---

## 🛠️ Architecture

- **`vite.config.js`**: Vite configuration supporting build bundling into `dist/` and local dev proxying.
- **`src/`**: Modern frontend source code:
  - `src/main.js`: Main ES module entry point for interactive heatmap, live sync, and multi-user comparison.
  - `src/style.css`: Theme tokens, responsive styling, and animations.
- **`index.html`**: Root HTML entry point referencing `/src/main.js`.
- **`server.js`**: Lightweight Node.js server:
  - Serves static assets from `dist/` (or `public/`).
  - Proxies LeetCode GraphQL and Codeforces API to prevent CORS issues.
  - In-memory cache with 5-minute TTL to respect upstream rate limits.
  - Endpoints: `GET /api/activity`, `GET /api/comparison`, `GET /api/upcoming-contests`.
