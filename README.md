# Strategic Communication Lab — Website

A static site for Strategic Communication Lab (SCL), rebuilt with content from
[scl.us.com](https://www.scl.us.com/) and a visual/pacing style modeled on
[axiom.peppermint.id](https://axiom.peppermint.id/): a slow single-column
editorial scroll, generous whitespace, and quiet scroll-reveal motion —
reskinned with a light paper background, deep navy accents, and Garamond-family
serif typography.

## Structure

```
index.html                                  Home
who-we-are.html                              Who We Are + team
what-we-do.html                              Services overview
what-we-do/executive-coaching.html
what-we-do/leadership-counsel.html
what-we-do/strategic-communication-consulting.html
our-clients.html                             Industries + testimonials
musings.html                                 Blog index
musings/managing-virtual-impressions.html
musings/great-leadership.html
musings/learn-to-listen.html
contact.html                                 Contact form + phone/LinkedIn
assets/css/style.css                         Shared stylesheet
assets/js/main.js                            Nav, scroll-reveal, form handling
```

No build step — plain HTML/CSS/JS, ready to serve as-is via GitHub Pages.

## Deploying with GitHub Pages

1. Push this folder's contents to the root of the `main` branch of your repo.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. The site will be live at `https://<username>.github.io/<repo>/`
   within a minute or two.

## Notes

- The contact form has no backend (this is a static site) — submitting it
  shows a confirmation message and directs visitors to call directly.
- Fonts are loaded from Google Fonts (EB Garamond, Jost) with no other
  external dependencies.
