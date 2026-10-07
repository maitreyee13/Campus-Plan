# College Girl Planner — delivery checklist

- [ ] The frontend uses HTML5, CSS3, and vanilla JavaScript, has a clean modular structure, and is deployable as static files from GitHub Pages without a traditional backend server.
- [ ] Supabase configuration has a clear browser-safe URL and anon-key location; service-role keys and plain-text passwords are never placed in frontend code.
- [ ] Registration, login, logout, password reset, protected dashboard routing, session persistence, profile creation, and friendly validation/error messages are implemented.
- [ ] Authenticated planner records are private per user, use the authenticated user ID, and are protected by Supabase Row Level Security policies for select/insert/update/delete.
- [ ] The dashboard prioritizes today’s tasks, completion progress, current/longest streak, today’s schedule, upcoming assignments, exams, events, notifications, theme toggle, profile, logout, and quick-add actions.
- [ ] Tasks support create, edit, delete, complete/uncomplete, title, description, date, category, priority, live counts, progress percentage, and empty/loading/error states.
- [ ] Persistent streak logic counts a day when at least one dated task is completed, increments on consecutive completed dates, resets after a missed day, and tracks the longest streak in the cloud.
- [ ] Calendar, assignments, exams, timetable, notes, and events are implemented with the requested fields, CRUD actions, search/filter/sort where useful, date indicators, countdowns, and responsive layouts.
- [ ] Dark/light mode uses CSS variables, transitions, a prominent toggle, and a remembered UI preference across pages.
- [ ] Desktop sidebar navigation, mobile navigation, stacked cards, readable timetable scrolling, usable calendar, accessible labels/focus states, contrast, reduced motion, and no horizontal overflow are implemented.
- [ ] Empty states, loading states, friendly backend/network errors, toast feedback, and optional first-time sample-data onboarding are included.
- [ ] README documents Supabase project creation, schema, authentication, RLS, configuration, local run, GitHub upload, Pages setup, auth redirects, and cross-device testing.
- [ ] The app is verified through source inspection, diagnostics, HTTP checks, and a responsive visual review; the source is committed as a recoverable project checkpoint.
