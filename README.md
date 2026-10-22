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
robots.txt, sitemap.xml                      SEO
LAUNCH-CHECKLIST.md                          Open items before going live — read this first
```

No build step — plain HTML/CSS/JS, ready to serve as-is via GitHub Pages.

## Editing the roster

Team entries are currently hand-duplicated between `index.html` (the
homepage teaser grid) and `who-we-are.html` (the full grid + bio dialogs).
There is no shared data file yet — moving to one is tracked as a deferred
item in `LAUNCH-CHECKLIST.md`. Until then, edit both files when you change
someone's name, title, or bio.

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

No automated QA harness is set up yet (see `LAUNCH-CHECKLIST.md`). To
check changes by hand: serve the folder locally (e.g.
`python3 -m http.server`) and click through each page, or use a headless
browser to scroll every page and watch for console errors / layout shift.

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
- Fonts are loaded from Google Fonts (EB Garamond, Inter) with no other
  external dependencies. Self-hosting them is a deferred item (see
  `LAUNCH-CHECKLIST.md`).
