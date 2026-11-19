# LiveLongerThan 🌱

**You've lived more than you think.** A bilingual website to celebrate time already lived and the small milestones ahead.

*Inspired by Shu Liu (刘舒), with love.*

## Visit & source

- Website source: https://github.com/tszhang87/livelongerthan
- Planned custom domain: https://livelongerthan.com (connect it in Cloudflare Pages)

## Run locally

Open `index.html` in a browser or serve the directory with `python3 -m http.server 8000` and visit `http://localhost:8000`.

This is a static site. No build tools or dependencies are required. Birthdays are processed entirely in the browser.

## Publish on Cloudflare Pages

1. Open **Cloudflare → Workers & Pages → Create → Pages → Connect to Git**.
2. Choose **tszhang87/livelongerthan** and production branch **main**.
3. Use framework **None**, root directory `/` (repository root), no build command, and build output directory `.`.
4. Deploy and verify the generated `*.pages.dev` preview.
5. In **Custom domains**, attach the purchased `livelongerthan.com` domain, and optionally configure `www.livelongerthan.com`.
6. Enable **Web Analytics** in Cloudflare and verify analytics after deployment.

**Important:** This is a separate project. Do not change custom-domain settings on `tszhang87/tszhang87.github.io`, which hosts a different personal website.

## Privacy

- Entered birthdays remain in the visitor's browser.
- No birthdays are uploaded or saved by this site.
- Analytics, once enabled, should count visits without capturing the birthday, exact age, or other sensitive inputs.
- The site offers reflections, not predictions of individual lifespans. Animal life expectancy is approximate.

## Shared visitor garden 🌿

Implemented: each browser tab creates a random anonymous traveler that walks, stands, or sits in the garden. Its visit lasts **five minutes from arrival**, after which it waves goodbye. Visitors on separate devices see the same group through a Cloudflare Pages Function and D1 database, refreshed approximately every 20 seconds.

**One-time Cloudflare setup required for the shared view:**

1. In Cloudflare dashboard, open **Storage & databases → D1 SQL database** (sometimes shown under Workers & Pages → D1). Create a database named `livelongerthan-presence` on the Free plan.
2. In your existing **Workers & Pages → livelongerthan** Pages project, select **Settings → Bindings → Add → D1 database**.
3. Set variable name to **`PRESENCE_DB`** (case-sensitive), and select the `livelongerthan-presence` database. Add it in **Production**; optionally also in Preview.
4. **Redeploy the latest production deployment** so the new binding takes effect.
5. Visit `https://livelongerthan.com/api/presence`. The JSON should contain `"ready":true`. The API automatically creates its table and index on the first request — no manual SQL is needed.
6. Open the main site in two separate private windows or browsers. Both should see two little travelers. Each figure leaves five minutes after entering, whether or not the tab remains open.

Without the D1 binding, the website still works and shows **only your own local traveler** with an explicit setup-pending message; it does **not** claim others are present.

### Privacy and implementation

- The browser keeps a random UUID in tab-local `sessionStorage` for five minutes (refreshing within that period does not create a duplicate); older visits get a new ID on reload.
- D1 only stores ephemeral random IDs and creation/expiration times. No name, birthdate, age, IP address, or location is written by this application.
- Expired visitors are excluded immediately and rows are periodically deleted when requests arrive.
- Shared figures are synchronized by polling (approximately 20 seconds), not instant WebSockets. The displayed count means **visits in the last five minutes**, not authenticated concurrent users.
- The API caps stored active visitors to 300 and displays up to 60 figures to keep the scene readable.
- Tests: `node --experimental-default-type=module --test tests/presence.test.mjs`.

## QA checklist

- Birthday entry: calculate elapsed days, reject future dates
- Chinese/English switch
- Category filtering
- Future milestones and animal comparison
- Responsive phone layout
- Footer dedication to Shu Liu
