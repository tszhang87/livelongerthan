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

## Planned: shared visitor presence

The idea is to show a little person for each current visitor, walking or sitting, waving goodbye after five minutes. Cross-visitor presence needs a realtime backend such as Cloudflare Workers + Durable Objects; **this is not implemented in this static version**.

## QA checklist

- Birthday entry: calculate elapsed days, reject future dates
- Chinese/English switch
- Category filtering
- Future milestones and animal comparison
- Responsive phone layout
- Footer dedication to Shu Liu
