# guns-bio

Multi-user bio pages for a closed friend group. You (the admin) create an
account for each friend; they log in with a username and password to edit
their own page at `yourdomain.com/their-username`.

## What changed from the single-file version

This is a real app now, not one HTML file:
- **Auth is server-side.** Passwords are hashed with bcrypt and checked on
  the server. There's no client-visible hash to inspect anymore.
- **Data lives in Vercel KV** (Redis), one record per user, instead of being
  baked into a downloaded HTML file.
- **Uploads go to Vercel Blob** instead of being embedded as base64 — pages
  stay small no matter how many people use this.
- **Editing saves instantly** — no more download-and-redeploy loop.

### Not yet ported from the single-file version
To keep this first version correct and shippable, a few of the more elaborate
visual extras were left out for now — straightforward to add back later if
you want them:
- Avatar cropping tool (uploads just use the image as-is)
- Custom font file upload (curated Google Fonts still work)
- Cursor trail effect
- Particles background effect (scanlines/grain/vignette still work)

## One-time setup

1. **Create the project on Vercel.** Push this folder to a GitHub repo, then
   "Import Project" on vercel.com and point it at that repo.

2. **Add storage.** In the Vercel project → Storage tab:
   - Create a **KV** database and connect it to this project (this fills in
     `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically).
   - Create a **Blob** store and connect it (fills in `BLOB_READ_WRITE_TOKEN`).

3. **Set the remaining environment variables** (Project Settings →
   Environment Variables):
   - `ADMIN_PASSWORD` — the password only you use, to reach `/admin`.
   - `SESSION_SECRET` — a long random string. Generate one locally with:
     ```
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

4. **Deploy.** Vercel will pick up `next build` automatically.

## Creating accounts for friends

Go to `yourdomain.com/admin`, enter your admin password, and create a
username + temporary password for each friend. Send it to them directly —
there's no email/signup flow, since this is invite-only. Their page appears
immediately at `yourdomain.com/their-username`, even before they've edited
anything (it starts from sensible defaults).

They log in at `yourdomain.com/login` and land on `/edit`, which is the same
kind of dashboard as before — assets, general, layout, typography, entrance,
colors, socials & badges, other, and a security tab to change their own
password. Saving there is instant; there's no file to redeploy anymore.

## Local development

```
npm install
npm run dev
```

You'll still need real KV and Blob credentials in a local `.env.local` file
(copy `.env.example`) — both Vercel KV and Vercel Blob work fine from
localhost once you've created the stores and copied their tokens in.
