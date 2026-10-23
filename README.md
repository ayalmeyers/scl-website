# Strategic Communication Lab — Website

A static site for Strategic Communication Lab (SCL), rebuilt with content from
[scl.us.com](https://www.scl.us.com/) and a visual/pacing style modeled on
[axiom.peppermint.id](https://axiom.peppermint.id/): a slow single-column
editorial scroll, generous whitespace, and quiet scroll-reveal motion —
reskinned with a light paper background, deep navy accents, and Garamond-family
serif typography.

## Structure

All pages live flat at the repo root (no `assets/` or per-section subfolders
— every internal link is a plain relative filename like `who-we-are.html`,
so the site works unmodified both at a domain root and under a GitHub Pages
subpath like `/scl-website/`):

```
index.html                                  Home
who-we-are.html                              Who We Are + team
what-we-do.html                              Services overview
executive-coaching.html
leadership-counsel.html
strategic-communication-consulting.html
our-clients.html                             Industries + testimonials
musings.html                                 Musings index
managing-virtual-impressions.html
great-leadership.html
learn-to-listen.html
contact.html                                 Contact form + phone/LinkedIn
privacy.html                                 Privacy page
404.html                                     Not-found page
style.css                                    Shared stylesheet
main.js                                      Nav, scroll-reveal, form handling, etc.
logo-mark.png, logo-wordmark.png, logo-lockup.png   Brand assets (transparent PNG)
favicon.ico, favicon-*.png, apple-touch-icon.png,
android-chrome-*.png, site.webmanifest       Favicon/icon set (generated from logo-mark.png)
fonts/                                       Self-hosted EB Garamond + Inter
robots.txt, sitemap.xml                      SEO
LAUNCH-CHECKLIST.md                          Open items before going live — read this first
```

No build step — plain HTML/CSS/JS, ready to serve as-is via GitHub Pages.

## Editing the roster

Team entries live in one place: `team.js`. Each person is one object with
`id`, `name`, `role`, `photo`, `photoWidth`/`photoHeight`, and (optional)
`bio` — an array of paragraph strings. `main.js`'s `renderTeam()` renders
that single list into both index.html's homepage teaser grid and
who-we-are.html's full roster grid + bio dialogs on page load, so there's
nothing to duplicate by hand. To add, remove, or edit someone, change only
`team.js`.

Adding a new person's photo: drop the image in the repo root, then run
`scripts/normalize-headshot.sh <file>` on it (see "Headshots" below) and
copy the width/height it prints into that person's `photoWidth`/
`photoHeight`.

## Headshots

`scripts/normalize-headshot.sh <input> [output]` re-encodes a photo to a
consistent JPEG quality, strips embedded EXIF/ICC/XMP metadata, and caps
the longest edge at 1280px (2x the largest size any headshot is ever
displayed at on this site). Run it in place on any new or replaced team
photo before adding it to `team.js` — it keeps file sizes and encoding
consistent across a roster whose source photos otherwise arrive in every
dimension and compression setting imaginable. It prints the final
dimensions; put those in the person's `photoWidth`/`photoHeight`.

## Adding a musing

Add a new `<article class="musings-card">` to `musings.html`'s grid, and a
new standalone page for the full article (copy an existing one, e.g.
`learn-to-listen.html`, as a template) for the "Read" link to point to.

## Toggling sections / flags

There's no central `site-config.js` yet (also tracked in
`LAUNCH-CHECKLIST.md`). For now, sections are enabled by simply being
present in the page's HTML — e.g. to hide Insights in Motion on a page,
remove its `<section class="stack-scroll" id="insights-motion">` block
(and the heading section just above it).

## Running QA

`npm install` once (QA tooling only — the site itself still has no build
step), then `npm run qa`. This serves the repo locally, drives every page
in headless Chromium at three viewports (mobile/tablet/desktop), and
checks for: console errors, broken (4xx/5xx) local resources, horizontal
overflow, and accessibility issues via axe-core (WCAG 2.0/2.1 A + AA). It
scrolls each page through fully and waits out the `.reveal` scroll-in
transitions before auditing — catching a `.reveal` element mid-fade
produces false-positive contrast failures, so don't shorten those waits
in `qa/run.js` without re-checking that. Writes `qa/report/report.json`
and prints a pass/fail summary; exits non-zero if anything failed.

`npm run qa:lighthouse` adds Lighthouse performance/accessibility/
best-practices/SEO scores per page. It's a separate opt-in command
because Lighthouse launches its own Chrome, and that launch reaches out
to a few Google hosts during startup — if you're running this in a
sandboxed environment whose network policy blocks those hosts, that
launch will hang rather than fail fast. It runs fine in a normal CI
runner or on a laptop.

One known, accepted (not a bug) QA finding: `index.html`'s "Coaches /
Counsel / Consultants" flow-scroll cards intentionally fade non-centered
cards as part of the spotlight scroll effect, which momentarily drops
below WCAG AA contrast for the de-emphasized card's text — the same way
a carousel's inactive slide is expected to read as de-emphasized. This
is the one `npm run qa` failure you can expect on a clean checkout.

## Deploying with GitHub Pages

1. Push this folder's contents to the root of the `main` branch of your repo.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. The site will be live at `https://<username>.github.io/<repo>/`
   within a minute or two.

## Notes

- The contact form submits via FormSubmit (a third-party form-relay
  service) directly to SCL's inbox — see `LAUNCH-CHECKLIST.md` for the
  one-time confirmation step this requires, and for the CC recipients that
  still need confirming.
- Fonts (EB Garamond, Inter) are self-hosted from `fonts/` — see
  `fonts/fonts.css`, loaded by every page instead of a Google Fonts
  `<link>`. Latin subset only (the site's content is English); each file
  is a variable font covering its full weight range, matching how Google
  itself serves this particular subset. No external font requests at
  all now. To add a new weight/style, regenerate from
  `https://fonts.googleapis.com/css2?family=...` with a modern
  User-Agent (to get woff2 URLs), download the new file into `fonts/`,
  and add an `@font-face` block to `fonts/fonts.css`.
