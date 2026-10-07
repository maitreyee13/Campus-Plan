# CampusPlan — College Girl Planner

CampusPlan is a polished, responsive college-life planner built with **HTML5, CSS3, and vanilla JavaScript**. It is designed to run as static files on GitHub Pages while using Supabase for secure authentication and cloud persistence.

The UI is available immediately in an explicitly labelled **interface preview**. Preview mode is not a fake login and does not claim to be a cloud account; its sample edits are temporary in-memory changes that reset when the preview is exited. To enable real accounts and cross-device sync, add the two browser-safe Supabase values described below.

## Included features

The app includes email/password registration and login, password reset, protected planner views, a dashboard, daily task CRUD, live daily progress, persistent streak calculations, monthly calendar, assignments, exam countdowns, weekly timetable, searchable notes, personal events, profile/settings, light/dark mode, responsive mobile navigation, friendly loading/error/empty states, and accessible keyboard/focus behavior.

## 1. Create the Supabase project

1. Open [supabase.com](https://supabase.com) and create a project.
2. In the Supabase dashboard, open **SQL Editor**.
3. Copy and run the complete contents of [`supabase/schema.sql`](supabase/schema.sql).
4. Open **Project Settings → API** and copy the **Project URL** and the public **anon key**. Never copy the `service_role` key into this project.

## 2. Configure the frontend

Open `js/config.js` and replace only these placeholders:

```js
export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-PUBLIC-ANON-KEY";
```

These values are safe for a browser client when Row Level Security is enabled. Do not add passwords, private keys, or a service-role key to the file.

## 3. Configure authentication

In Supabase, open **Authentication → URL Configuration** and add:

- Local development: `http://localhost:3000`
- GitHub Pages: `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

If the repository is deployed at a project path, keep the trailing slash in the GitHub Pages URL. Supabase email confirmation and password-reset links use the current page URL automatically.

For a classroom project, the default email confirmation flow is recommended. If you want to test without email confirmation, adjust **Authentication → Providers → Email** in Supabase.

## 4. Run locally

No Node server or package install is required. With Python 3 installed:

```bash
python3 server.py
```

Open [http://localhost:3000](http://localhost:3000). The included `package.json` also exposes `npm run dev` and `npm start` as aliases.

If you open `index.html` directly with `file://`, browser module and Supabase requests may be blocked. Use the local server instead.

## 5. Upload to GitHub and enable Pages

```bash
git init
git add .
git commit -m "Build CampusPlan planner"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Then in GitHub:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and `/ (root)`, then save.
4. Wait for the deployment and open the URL GitHub provides.
5. Add that exact URL to Supabase **Authentication → URL Configuration → Redirect URLs**.

## 6. Security model

Every application table has a `user_id` column that references `auth.users(id)`. The signup trigger creates a profile and a streak row. Every select, insert, update, and delete policy checks `auth.uid() = user_id`. The profile table uses `auth.uid() = id`. This means the browser can use the anon key without being able to read another user's planner records.

The frontend never trusts a user-entered owner ID: insert calls attach the authenticated session's ID, and update/delete calls scope the record to both the record ID and the authenticated user ID. The streak is recalculated from completed task dates and saved in the `streaks` table, so it follows the account across devices.

## 7. Cross-device test

1. Register an account on a laptop and confirm the email if required.
2. Add a task, assignment, event, or note.
3. Refresh and verify it remains.
4. Mark a task complete and confirm the counter/streak changes.
5. Open the deployed Pages URL on a phone or another browser.
6. Sign in with the same email/password and confirm the same records appear.
7. Register a second account and verify it sees an empty/private planner, not the first user's data.

## Files to know

| File | Responsibility |
| --- | --- |
| `index.html` | Semantic application shell and view templates |
| `css/styles.css` | Responsive layout, themes, components, motion |
| `js/config.js` | Supabase URL/anon key placeholders |
| `js/database.js` | Auth, cloud CRUD, preview dataset, friendly errors |
| `js/theme.js` | Light/dark preference |
| `js/app.js` | Rendering, navigation, forms, calendar, streaks |
| `supabase/schema.sql` | Tables, indexes, trigger, and RLS policies |
| `server.py` | Simple local static server |

## Configuration values to replace

Only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the redirect URLs in Supabase need replacing. Do not replace them with a service-role key. The GitHub repository URL also needs to be added to Supabase's redirect allow-list after deployment.
