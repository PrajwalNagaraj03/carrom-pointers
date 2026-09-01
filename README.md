# Carrom Points

A private dashboard for our carrom board: multiple seasons, a match log for
singles and doubles, and a leaderboard ranked by board points scored.

Next.js (App Router) + TypeScript + Tailwind on the front, Supabase Postgres
behind it. Sign-in is email and password, limited to three approved addresses.

---

## How the data works

A **season** holds many **matches**. A match has two sides, A and B, each with a
board score, and a roster in `match_players` — one player per side for singles,
two for doubles. Nothing about standings is stored: the `season_standings` view
derives played / won / lost / points scored / points conceded from the matches
themselves, so correcting a match immediately corrects the table.

The leaderboard ranks by **points scored**, with point difference and then wins
breaking ties.

## How access works

Three independent locks, so no single mistake opens the data:

1. **Signup trigger** — `enforce_member_signup()` on `auth.users` refuses to
   create an account whose email is not in `app_members`. That fires on *any*
   insert, including one you make yourself in the Supabase dashboard, so a
   fourth address cannot become a user even by accident.
2. **Row level security** — every policy is `using (public.is_member())`, which
   checks the requesting JWT's email against `app_members`. A session that
   somehow existed for an unlisted address would still read nothing and write
   nothing. The `season_standings` view is `security_invoker`, so it cannot be
   used to sidestep this.
3. **The app** — `requireMember()` runs on every page and every server action;
   `src/proxy.ts` bounces signed-out visitors to `/login`.

Adding a person is two steps in the Supabase dashboard: a row in `app_members`
first, then a user under **Authentication → Users**. In that order — the trigger
rejects the user otherwise. There is deliberately no sign-up page and no UI for
managing the allowlist.

Passwords are Supabase's business, not this app's. GoTrue stores a bcrypt hash
in `auth.users.encrypted_password` and verifies it at sign-in; no password
appears in these migrations, in `seed.sql`, or anywhere in the app code.

---

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then from
**Project Settings → API** copy the **Project URL** and the **anon** (a.k.a.
publishable) key.

### 2. Apply the schema

With the [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or paste `supabase/migrations/0001` → `0004` into the SQL editor in order.

### 3. Fill in the allowlist

Edit `supabase/seed.sql`, replace the placeholder emails with the three real
addresses, and run it in the SQL editor. Every address must be lowercase.

```sql
insert into public.app_members (email, display_name) values
  ('you@example.com',    'You'),
  ('friend@example.com', 'Friend'),
  ('other@example.com',  'Other');
```

### 4. Create the three accounts

In the Supabase dashboard, **Authentication → Users → Add user**, once per
address. Set a password for each and tick *Auto Confirm User* so nobody has to
click a confirmation email.

Do this **after** step 3 — the trigger refuses any address that is not already
in `app_members`, and it does not care that the request came from you.

Then turn sign-ups off: **Authentication → Sign In / Providers → Email**,
disable *Allow new users to sign up*. The trigger already blocks unlisted
addresses; this closes the door in front of it.

Do not put passwords in `seed.sql` — a password in a migration is a password in
your git history. To change one later, use **Authentication → Users** and reset
it from there.

### 5. Run it

```bash
cp .env.example .env.local   # fill in the two values from step 1
npm install
npm run dev
```

### 6. Deploy

Import the repo on Vercel and set the same two environment variables
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Nothing else to
configure — password sign-in needs no redirect URLs.

---

## Checking it works

1. Sign in with one of the three accounts — you land on the dashboard.
2. Try adding a user with an unlisted address in the dashboard — Supabase
   refuses it, which is the signup trigger doing its job.
3. Add players, start a season, log a singles match and a doubles match.
4. The leaderboard totals match what you entered, ordered by points scored.
5. Start a second season — its table is empty and the first season's is untouched.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:db` | Applies the migrations to a throwaway Postgres and asserts the schema, the RLS policies, the signup gate and the standings maths |

`npm run test:db` needs local Postgres **server** binaries (`initdb`, `pg_ctl`) —
no Docker. It stands up a temporary cluster, installs stand-ins for the Supabase
roles and `auth` schema (`supabase/tests/00_supabase_stubs.sql`), applies the
migrations and runs `supabase/tests/01_assertions.sql`. If you have Docker and
the Supabase CLI, `supabase start && supabase db reset` is the closer-to-real
equivalent.

## Layout

```
src/
  proxy.ts                     session refresh + signed-out redirect
  app/
    login, auth/no-access
    (app)/                     everything behind the members-only gate
  components/                  leaderboard, match form, match list, primitives
  lib/
    auth.ts                    requireMember() -- the real gate
    queries.ts                 all reads
    actions/                   all writes, zod-validated server actions
    supabase/                  browser and server client factories
    types/database.ts          typed mirror of the migrations
supabase/
  migrations/                  0001 schema, 0002 standings view, 0003 RLS, 0004 functions
  seed.sql                     the three approved accounts
  tests/                       local Postgres harness
```

Writes go through server actions rather than the browser client, and a match is
created by one `create_match()` call so that a match and its roster can never be
written half-way.
