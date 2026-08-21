# JISR — Auth + Google + Smart Search Stage 1

## 1. Replace/add these files

Replace:
- lib/actions/auth.ts
- app/login/page.tsx
- lib/actions/marketplace-discovery.ts

Add:
- lib/ai/smart-search.ts

No database migration is required for this stage.

---

## 2. CRITICAL: Supabase email verification

Code alone cannot prove that a mailbox exists.

Go to:

Supabase Dashboard
→ Authentication
→ Providers
→ Email

Set:

Confirm email = ON

This is the setting that prevents a password account from receiving a usable session before proving ownership of the mailbox.

After enabling it, delete any fake TEST users that were created while confirmation was disabled.

---

## 3. Make Supabase emails actually arrive

For production, configure a real SMTP provider.

Supabase Dashboard
→ Project Settings / Authentication
→ SMTP Settings

Use a real provider such as:
- Resend
- Postmark
- Amazon SES

Make sure sender domain/email is verified.

Also configure:

Authentication
→ URL Configuration

Site URL:
- local: http://localhost:3000
- production: your real HTTPS domain

Redirect allow list should include at least:

http://localhost:3000/auth/callback
https://YOUR-DOMAIN/auth/callback

The project already uses /auth/callback and exchanges the PKCE code there.

---

## 4. OTP email template

If you want users to type a 6-digit code, edit the relevant Supabase email template so it displays the token:

{{ .Token }}

Do not rely only on a magic-link button if the UI asks for a numeric code.

---

## 5. Google Login

Supabase Dashboard
→ Authentication
→ Providers
→ Google
→ Enable

Then create Google OAuth credentials in Google Cloud / Google Auth Platform.

Put the Supabase callback URL shown by the Google provider page into Google's Authorized redirect URIs.

Also ensure your app callback is allowed in Supabase Redirect URLs.

The button is already added to app/login/page.tsx.

---

## 6. AI Smart Search

Add to .env.local:

OPENAI_API_KEY=YOUR_SERVER_SIDE_KEY
OPENAI_SEARCH_MODEL=gpt-5-mini

Important:
- NEVER prefix OPENAI_API_KEY with NEXT_PUBLIC_.
- The key stays server-side.
- AI is NOT called for every search.
- Normal search runs first.
- AI only runs when normal search returns zero results.
- There is rate limiting.
- AI can only choose from the real Jisr services/categories loaded from the database.
- Low-confidence guesses are ignored.

Examples the fallback should understand:

"المي بتنقط من تحت المجلى"
→ "تسريب مياه سباكة"

"بدي حدا يصلح مواسير المي"
→ plumbing-related service/category

"اللابتوب كثير بعلق"
→ relevant technical support/computer service, only if that service exists in the catalog.

---

## 7. Run checks

npx tsc --noEmit
npx eslint .
npm run test
npm run build

Then test:

A) Fake email registration:
- Register with an address you cannot access.
- It must NOT become a usable password account.
- Login must not succeed before confirmation.

B) Real email registration:
- Register.
- Receive email/code.
- Verify.
- Login.

C) Forgot password:
- Enter a real registered email.
- Confirm the reset email arrives.

D) Google:
- Click "المتابعة باستخدام Google".
- Pick an account.
- It should return through /auth/callback.

E) Smart Search:
- Search a phrase that does not literally match a service title.
