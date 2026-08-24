# School FAQ Chatbot — Supabase Edition

A database-driven FAQ chatbot for students, plus an admin dashboard for
managing the knowledge base. Built with plain HTML/CSS/JS on the frontend
and **Supabase (PostgreSQL + Auth + RLS)** as the single backend.

```
SOURCE CODE  → how the chatbot works (this repo)
SUPABASE     → what the chatbot knows (FAQs, keywords, categories, logs)
```

Adding, editing, or removing a school FAQ never requires touching or
redeploying the source code — it all happens in the Admin Dashboard,
which writes straight to Supabase.

## Project structure

Everything lives in one folder — no subfolders.

```
index.html                 Student chatbot
admin-login.html            Admin sign-in (Supabase Auth)
admin-dashboard.html        Admin dashboard shell (tabs)

style.css                   Student chatbot styling
admin.css                   Admin dashboard styling

config.js                   Supabase URL/anon key (EDIT THIS)
supabaseClient.js           Shared Supabase client
keywordEngine.js            Normalize + score FAQ matches
chatbot.js                  Student chatbot logic

auth.js                     Sign in/out, admin-session guard
auditLog.js                 Writes admin_audit_logs rows
categories.js                Category CRUD
faqs.js                      FAQ + keyword CRUD
unanswered.js                Review/convert unanswered questions
analytics.js                 Dashboard analytics queries
admin-dashboard.js           Wires the admin dashboard UI together

001_initial_schema.sql      categories, faqs
002_faq_keywords.sql        faq_keywords, unanswered_questions
003_chat_logs.sql           chatbot_logs, faq_feedback
004_admin_security.sql      admins, admin_audit_logs, RLS policies
005_machine_translation.sql adds is_machine_translated flag to faqs (optional)
seed.sql                    Sample Lourdes College FAQ data (en/fil/ceb)

supabase/functions/translate-faq/index.ts   Edge Function: auto-translate a
                                             new FAQ into other languages
                                             (deploy separately, see section 7)
```

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy your **Project URL** and **anon
   public key**. You will NOT need the `service_role` key anywhere in
   this app — it is never used client-side.

## 2. Run the migrations

Using the Supabase SQL Editor (simplest for a capstone project), run
these files in order:

1. `001_initial_schema.sql`
2. `002_faq_keywords.sql`
3. `003_chat_logs.sql`
4. `004_admin_security.sql`
5. (Optional) `seed.sql` for sample categories/FAQs.
6. (Optional, only if using auto-translate) `005_machine_translation.sql` — see section 7 below.

Or, if you prefer the Supabase CLI, put these five files in a
`supabase/migrations/` folder on your machine and run:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

If your project already has some of these tables, inspect the existing
schema first and adapt the migrations rather than dropping data.

## 3. Create your first administrator

Administrators sign in with **Supabase Auth**, and are authorized by
having a row in the `admins` table (see `004_admin_security.sql` for why).

1. In Supabase: **Authentication → Users → Add user**. Create a user
   with an email/password (or invite by email).
2. In **SQL Editor**, run:
   ```sql
   insert into public.admins (id, full_name, role)
   values ('PASTE-THE-USER-UUID-HERE', 'Your Name', 'super_admin');
   ```
   You can find the user's UUID on the Authentication → Users page.
3. Repeat step 2 for any additional staff accounts. There's no
   self-service "sign up as admin" flow in the app on purpose —
   granting admin access is a deliberate, auditable action.

## 4. Configure the frontend

Edit `config.js`:

```js
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
```

The anon key is safe to ship in client-side code — every table it can
touch is protected by the RLS policies in `004_admin_security.sql`, so
the key alone can't read or write anything students/admins shouldn't see.

## 5. Run it locally

Because the JS uses ES modules (`import`/`export`), you need to serve
the files over HTTP — opening `index.html` directly as a `file://` URL
will not work. From the project folder:

```bash
# Option A: Python (already on most machines)
python3 -m http.server 5500

# Option B: Node
npx serve .
```

Then open `http://localhost:5500`. The admin dashboard is at
`http://localhost:5500/admin-login.html`.

## 6. Deploying

Any static host works (Vercel, Netlify, GitHub Pages) since there's no
build step — just upload the whole folder as-is.

**Environment variables:** because this is a static, buildless site,
`config.js` is edited directly rather than generated from environment
variables. If you'd rather inject values at deploy time (e.g. to keep
different keys for staging/production), add a small build step on your
host that writes `config.js` from `$SUPABASE_URL` / `$SUPABASE_ANON_KEY`
before the static files are published (a simple `sed` or Node one-liner
is enough).

## 7. (Optional) Set up auto-translate for Filipino & Cebuano

Instead of manually writing every FAQ three times, admins can write one
English FAQ and have Filipino and Cebuano versions generated
automatically. This uses a Supabase Edge Function that calls
**MyMemory** (mymemory.translated.net), a free translation service —
**no Google/Azure billing account, no credit card, and no API key
required.**

**All in your browser, no CLI, no terminal:**

1. **Run the migration** that adds the machine-translation flag:
   open `005_machine_translation.sql` in the Supabase SQL Editor and
   run it, same as the other migrations.
2. **Deploy the function from the dashboard.** In your Supabase
   project, go to **Edge Functions → Deploy a new function → Via
   Editor**. Name it exactly `translate-faq` (the frontend calls it by
   this name). Open `supabase/functions/translate-faq/index.ts` from
   this project, copy its full contents, paste them over the
   template code in the dashboard editor, then click **Deploy**.
3. That's it. No secrets, no API key, no billing setup — MyMemory's
   free tier works anonymously.

**Optional — raise the daily limit.** MyMemory's free tier is 5,000
words/day per caller by default. Supplying any valid email address
(no account or billing tied to it, it's just used to identify you to
MyMemory) raises that to 50,000 words/day. To do this, add one secret
under **Edge Functions → Manage → Secrets**:
```
MYMEMORY_EMAIL = your-email@example.com
```

**Alternative — Supabase CLI**, if you prefer the terminal:
```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy translate-faq
```

That's it — the "New FAQ" dialog now shows an "Auto-translate this FAQ
into Filipino and Cebuano" checkbox whenever you're creating a new
English FAQ. The two generated rows are created with
`status = 'needs_review'` and a 🌐 MT badge in the FAQ table, so
nothing machine-translated reaches students until an admin reviews and
activates each one from the FAQs tab.

One honest trade-off: MyMemory is a translation-memory service, not a
dedicated neural MT engine like Google/DeepL, so quality can be more
uneven — worth actually reading each auto-translated FAQ before
activating it, especially for anything involving dates or fees.

If you skip this section entirely, nothing breaks — you just go back to
adding each language by hand, exactly as before.

## 8. The final test (confirms the database-first architecture works)

1. Open Supabase and confirm a given FAQ does **not** exist yet.
2. Open the Admin Dashboard → FAQs → **+ New FAQ**.
3. Fill in a question, answer, category, and a few keywords, e.g.:
   - Question: *Where can students request their school ID?*
   - Keywords: `school id` (3), `student id` (3), `id` (2), `identification` (2)
4. Save. Confirm in Supabase that the FAQ and its keywords were inserted.
5. **Do not touch the source code.**
6. Open the student chatbot and ask: *"Where do I get my student ID?"*
7. The chatbot should retrieve and answer from the new Supabase row.

If that works, new school information can be added forever without a
single code change or redeploy — the database is the chatbot's brain,
and the code is just the body.

## Notes on the student chatbot design

`index.html` + `style.css` implement a rounded "messenger" chat widget
(avatar, live status dot, quick-reply chips, pill composer) similar to a
typical support-chat pattern. It's responsive out of the box:

- **Mobile** (`<900px`): a single centered chat card, matching a typical
  floating chat-widget layout.
- **Desktop** (`≥900px`): the same card widens into a two-pane "support
  hub" — a left brand panel (title, tagline, category shortcuts, staff
  sign-in link) next to the chat panel — rather than just stretching the
  mobile widget across the screen.

A light/dark theme toggle (sun/moon icon in the header) is included and
persists via `localStorage`. The "⋯" menu holds the language switcher and
staff sign-in link so the header stays uncluttered. All of this is in
`style.css` only — the admin dashboard (`admin-dashboard.html` /
`admin.css`) keeps its own separate visual style; let me know if you'd
like that restyled to match as well.

## Notes on the matching engine

`keywordEngine.js` normalizes the student's message (lowercase, strip
punctuation, remove a small stopword list), then scores every active
FAQ by summing the weights of its keywords found in the message.
Multi-word keywords (e.g. `"school id"`) are matched as phrases. Ties
are broken by the FAQ's `priority` field. If no FAQ scores at least 2
points, the chatbot shows a fallback message and logs the question into
`unanswered_questions` so an admin can review and convert it into a real
FAQ from the dashboard.

Every chat turn also writes one row to `chatbot_logs` (question asked,
which FAQ matched, score, language) for the Analytics tab — no personal
student information is captured.
