# RentFlow

A rent invoice builder using Next.js 16, Supabase Auth, and Supabase Postgres. Generate invoices immediately without signing in. Guests get locally saved drafts and landlord/tenant details. An optional account adds private cloud drafts, invoice history, and access across devices. Charges and discounts can be reordered with drag handles (mouse/touch drag-and-drop or Space and arrow keys); the preview and PDF follow that order. Amounts use INR. New invoices default to the first of the current month; the due date remains editable. Issue dates and personal notes are omitted.

## Setup

Requires Node.js 20.9 or newer. Use npm and the committed `package-lock.json`.

```sh
npm ci
npx supabase login
npx supabase link --project-ref hcxglckmzvqwejgyyuec
cp .env.example .env.local
```

Set the server-only `SUPABASE_URL` to your project URL and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to BillGenerator's publishable key from the Supabase Connect dialog. The connected project is **BillGenerator** (`hcxglckmzvqwejgyyuec`), not ExpenseTracker. `.env.local` and Supabase's local connection metadata are ignored by Git. The Supabase CLI is pinned as a project dependency; `npm run supabase -- --help` and `npx supabase --help` both work.

```sh
npx supabase db push --linked
npm run dev
```

Open http://localhost:3000 and start generating bills. Sign-in and account creation are optional. The migration is already applied to the connected project. No service-role or secret key is used by the application.

## Supabase Auth configuration

In the Supabase dashboard for BillGenerator:

1. Enable **Email** under Authentication → Sign In / Providers and keep **Confirm email** enabled. Use a minimum password length of 8.
2. Set **Site URL** to `http://localhost:3000` for local development. Set it to the public website URL for production, and set `NEXT_PUBLIC_SITE_URL` to the same URL in the deployment environment.
3. Add redirect URLs for `/auth/callback` and `/auth/callback?next=/auth/update-password` on each permitted origin. Keep localhost redirects while developing. `supabase/config.toml` contains local development settings. The localhost redirects and password minimum are already configured on the hosted project using the restricted file in `supabase/hosted-auth/supabase/config.toml`. For later changes, review `npx supabase config diff --workdir supabase/hosted-auth --project-ref hcxglckmzvqwejgyyuec` before pushing that file.
4. Configure **custom SMTP** for public sign-up and password-reset delivery. Supabase's default sender is limited to project-team email addresses and low rate limits. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

Default Supabase email templates using `{{ .ConfirmationURL }}` work with the PKCE `/auth/callback` endpoint. Open the verification/reset link in the browser that initiated the request. For confirmation on another browser/device, use token-hash templates pointing to `/auth/confirm?token_hash={{ .TokenHash }}&type=email` (signup) or `type=recovery` (password reset). Invalid links return to sign-in with a clear message. The app accepts only fixed local destinations after authentication.

The local CLI is already logged in on this machine. To switch accounts, run `npx supabase login`, then `npx supabase projects list` and link the intended project again.

## Drafts and invoice numbering

**Guests:** The full builder works without Supabase configuration or an account. Drafts, saved landlord/tenant details, item order, and monthly numbering are stored in localStorage on this browser. Old `rentflow_draft_v1`, `rentflow_landlord_info`, and `rentflow_tenant_info` data are restored when valid. Starting fresh keeps the people/property details. Clearing browser data removes guest drafts and counters. When storage is blocked or corrupt, generation and PDF downloads still work, with a warning if changes cannot be saved. Full invoice data is not put in cookies or sent to the backend for guests.

**Accounts:** Each account has one current draft in `rentflow_drafts`, protected by row-level security. Autosave uses optimistic revisions: if another tab or device changes the draft, it reports a conflict instead of overwriting it. Unsynced changes remain in the open form and can be exported; retry a failed save before closing the tab. Starting fresh replaces the draft while keeping saved landlord and tenant details. These details preload when you return.

Signed-in PDF downloads save a copy to `rentflow_invoices`. The **Invoice history** page lists your exports, with preview and PDF download. Re-exporting the same invoice number updates its saved copy instead of creating a duplicate. Starting a new invoice does not remove history. Only the owner can access these records; guests visiting history see an optional account explanation and can return to the builder.

Both modes use `INV-YYYYMM-001`. Guests use browser-local counters; accounts use transactional database counters scoped to each account and month. Cloud counters work across devices and survive clearing browser data. Numbers remain editable, reloading never consumes a number, and unused numbers may leave gaps if you start fresh repeatedly.

Guest and account data stay separate. A signed-in user can explicitly **Import browser draft** to copy local details, charges, date, and order into the account draft while keeping the account invoice number. Signing out returns to the guest workspace and does not expose cloud details in local storage.

## Validation

```sh
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm test
# Guest-only checks work without administrative CLI credentials:
npm run test:guest
npx supabase db query --linked --file supabase/tests/account_isolation.sql
npx supabase db advisors --linked --type security --level warn
```

Browser tests use the linked BillGenerator project's administrative key **only in the test process** to create temporary `rentflow-e2e-…@example.test` users, confirm/generate recovery links without sending emails, and delete test users afterward. They exercise actual sign-in, password recovery, cloud drafts, concurrent-save conflicts, PDF export, responsive layouts, and accessibility. You must be logged into the CLI with permission to manage the test project. Do not run these tests against another project's credentials. Failure traces may contain temporary test-session information and are ignored by Git.

The SQL test runs in a transaction and rolls back all test users/data. It verifies draft/history account isolation, ownership reassignment protection, anonymous restrictions, and account-scoped numbering. Production SMTP delivery should be checked with a real intended recipient after configuring the sender.

## Implementation

The Supabase URL uses the server-only `SUPABASE_URL` variable; `.env.example` contains no project-specific URL or `NEXT_PUBLIC_SUPABASE_URL` entry. Auth uses request-scoped `@supabase/ssr` clients and the Next.js 16 proxy for session refresh. Server components and API routes verify users. Personalized responses disable shared caching. API mutations verify the origin and expected account. Tables and the numbering function use caller permissions and owner policies; the application never bypasses RLS.

Static page content stays in Server Components, fonts are served locally, and PDF dependencies load only when requested. PDF export supports multi-page invoices, uses built-in Helvetica, and represents currency as `Rs.`. Characters outside the font's supported set require an embedded Unicode font.

```sh
npm run build
npm start
```

No application deployment is performed by the setup commands above. Add the three `.env.example` variables to your hosting environment before deploying.

## Automatic production releases

`.github/workflows/deploy.yml` runs lint, type checking, a production build, and the guest browser tests on pull requests and pushes to `master`. After those checks pass on `master`, it applies pending migrations to BillGenerator, then asks Vercel to build and deploy that exact Git commit using the project's Production environment variables. It waits for Vercel to report Ready and fails the workflow if the deployment fails. Manual runs deploy only when started from `master`.

Before pushing this workflow, add these repository secrets under [GitHub Actions settings](https://github.com/Raghvender1205/BillGenerator/settings/secrets/actions):

| Secret                  | Value                                                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | A scoped Supabase personal access token limited to BillGenerator. The CLI link command needs Project Settings, API Keys, and API Key Secrets read permissions; allow database pooler configuration reads for connection discovery. |
| `SUPABASE_DB_PASSWORD`  | BillGenerator's database password, not its publishable or service-role key.                                                                                                                                                        |
| `VERCEL_TOKEN`          | A Vercel access token with access to `raghvender1205s-projects` and the `bill-generator` project.                                                                                                                                  |

The workflow fixes the Supabase project, Vercel project, and Vercel team IDs to this application. Configure the optional GitHub `production` environment's reviewers and branch restrictions as desired. The app's three runtime variables stay in Vercel; no service-role key is required for releases.

`vercel.json` disables Vercel's independent Git-triggered deployment for `master`, so it cannot publish before the migration step succeeds. Other branches retain Vercel's normal preview deployments; preview Supabase credentials are not configured by this workflow. Missing Actions secrets stop production releases, so add them before pushing. If Supabase's native GitHub integration is enabled, turn off **Deploy to production** there so this workflow is the sole migration runner.

Production releases are serialized and never canceled by newer pushes. They apply migrations only: hosted Auth configuration and SMTP must be managed separately. The workflow does not run the administrative browser tests against production. A failed Vercel build does not roll back database migrations; keep schema changes compatible with the currently deployed app. Do not manually cancel a release while it is migrating or deploying. If a run times out, inspect the linked Vercel deployment before rerunning it.

See [Supabase CI deployment](https://supabase.com/docs/guides/deployment/managing-environments), [Vercel Git deployment controls](https://vercel.com/docs/project-configuration/git-configuration), and [Vercel deployment API](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment).
