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

Run the server with Node.js (v18+ recommended):

```bash
npm start
```
or:
```bash
node server.js
```

Open your browser at:
```
http://localhost:3000
```

---

## 🛠️ Architecture

- **`server.js`**: Lightweight, zero-dependency Node.js HTTP server.
  - Serves static assets (`public/`).
  - Proxies LeetCode GraphQL and Codeforces API to prevent CORS issues.
  - In-memory cache with 5-minute TTL to respect upstream rate limits.
  - Endpoint: `GET /api/user-data?leetcode=:username&codeforces=:handle`.
- **`public/index.html`**: Clean semantic markup.
- **`public/style.css`**: Modern, minimalist styling with theme tokens and responsive layouts.
- **`public/app.js`**: Interactive SVG heatmap generation, date calculation, tooltip management, and automatic client-side fallback.
