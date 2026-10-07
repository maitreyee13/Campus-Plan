# College Girl Planner — implementation plan

## Product approach

Build a static, GitHub Pages-compatible single-page planner using semantic HTML, CSS variables, and vanilla JavaScript modules. Supabase is the only source of truth for authenticated planner data; localStorage is limited to theme/UI preferences. When Supabase credentials are not configured, the app opens a clearly labelled temporary preview mode so the interface can be evaluated without pretending that a demo login is a real account system; preview edits stay in memory and are reset when the preview is exited.

## Architecture

- `index.html`: auth screens, protected app shell, view templates, accessible modal and toast regions.
- `css/styles.css`: responsive layout, light/dark themes, cards, tables, calendar, motion and reduced-motion rules.
- `js/config.js`: browser-safe Supabase URL/anon-key placeholders and runtime config detection.
- `js/database.js`: Supabase client, auth helpers, user-scoped CRUD, and preview dataset.
- `js/theme.js`: theme preference and system preference handling.
- `js/app.js`: view routing, dashboard rendering, forms, filters, calendar, timetable, settings, and event wiring.
- `supabase/schema.sql`: tables, indexes, trigger, and Row Level Security policies for every user-owned record.
- `README.md`: exact backend, auth, GitHub Pages, redirect, and cross-device setup instructions.

## Design direction

- **Design movement:** soft editorial productivity UI with a calm neo-grotesque base and warm study-journal accents.
- **Core principles:** glanceable hierarchy, gentle encouragement, practical density, and confident simplicity.
- **Color philosophy:** lavender and coral provide warmth and ownership; ink navy keeps the product mature; mint and amber are reserved for progress and urgency rather than decoration.
- **Layout paradigm:** a persistent left rail anchors navigation while the content canvas uses asymmetrical dashboard bands: an editorial greeting, a wide task focus panel, and compact supporting cards.
- **Signature elements:** lavender halo behind the greeting, pill-shaped status labels, and a small sunburst mark in the wordmark.
- **Interaction philosophy:** every action has a visible response—progress changes immediately, completed tasks soften rather than disappear, and CRUD feedback uses friendly toasts.
- **Animation:** 160–220ms ease-out hover/focus transitions, a subtle task-complete check animation, and no looping motion. Respect `prefers-reduced-motion`.
- **Typography:** Inter/system sans for dependable UI readability, with a slightly expressive display weight for dashboard headlines.
- **Brand essence:** a calm daily command center for students who want fewer tabs and more follow-through; **warm, focused, optimistic**.
- **Brand voice:** clear, encouraging, never babyish. Example lines: “Let’s make today feel lighter.” and “Small wins compound.”
- **Wordmark:** “CampusPlan” with a four-ray sunburst replacing the dot in the i-like accent mark.
- **Signature brand color:** `#7c5cff` electric lavender.

## Data model

All records carry `user_id` and are protected with `auth.uid() = user_id` RLS policies. Tables cover profiles, tasks, assignments, exams, timetable entries, notes, events, and streaks. A profile trigger provisions a profile and streak row on registration. The frontend never accepts a client-supplied user ID for ownership; insert operations use the authenticated session user ID.

## Runtime and delivery

The project runs as static files on port 3000 for Preview and GitHub Pages. `manus-routes.json` declares `/` as the only page route. A tiny Python static server is included for local development; no build step or package install is required. The Supabase CDN client is imported as an ES module in the browser. Before delivery, inspect the source, verify the route manifest, start the server, check representative HTTP responses, and capture desktop/mobile previews when needed.
