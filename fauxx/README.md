# Fauxx

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

### Feature parity with the single-file version
Everything from the single-file version is ported, including avatar
cropping, custom font uploads, the cursor trail effect, and the particles
background effect.

## One-time setup

1. **Get this into your GitHub repo.** If you're replacing an existing
   `guns-bio` folder in your repo with this one, delete the old folder and
   add this `fauxx` folder in its place (or at the repo root — see the Vercel
   step below). Then in your Vercel project, update **Settings → General →
   Root Directory** to point at wherever this folder ends up, so Vercel
   builds the right thing.

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
kind of dashboard as before — assets, general, layout, typography, effects,
entrance, colors, socials & badges, gallery, other, and a security tab to
change their own password. Saving there is instant; there's no file to
redeploy anymore.

### Admin tools

`/admin` is more than account creation now. Expand any user row to:
- **Grant or revoke official badges** (Owner, Verified, VIP, etc.) — this is
  admin-only by design. Users can still add their own free-text custom
  badges from their editor, but the official catalog badges can only be
  granted here. This is enforced server-side, not just hidden in the UI, so
  a user can't grant themselves one by editing a request.
- **Suspend / unsuspend** a page. A suspended page shows a plain
  "unavailable" notice to visitors (and to the owner, though you can still
  preview it yourself as admin), and the owner can't save edits while
  suspended.
- **Reset a password** directly, if someone forgets theirs.
- See **view counts** (real visitor counts, tracked in KV — the owner's own
  visits and your admin previews don't count toward it) and **last edited**
  time for every account at a glance.
- **Delete** an account entirely.

### Profile content

Beyond the original set: **pronouns** (shown next to location), and a
**photo gallery** (up to 8 extra images in a small grid below the socials).

## Local development

```
npm install
npm run dev
```

You'll still need real KV and Blob credentials in a local `.env.local` file
(copy `.env.example`) — both Vercel KV and Vercel Blob work fine from
localhost once you've created the stores and copied their tokens in.
