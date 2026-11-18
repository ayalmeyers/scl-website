# Team access: the operations hub on the SCL site

The ask: put the contract dashboard (the "SCL Contract Builder / Operations hub")
on the website behind a password and a login, keep the two in sync, and make
them look and work the same way.

This file records what is possible, what was built on branch `team-login`, and
what still needs a person to do.

## 1. Can the hub be embedded in the site?

No, not today. The hub is a Claude artifact, and claude.ai refuses to be framed
by any other website. Checked on 2026-11-15 with `curl -sI`:

| URL | `Content-Security-Policy: frame-ancestors` |
| --- | --- |
| `https://claude.ai/artifact/<hub-id>` | `'self'` plus two Chrome extension IDs |
| `https://claude.ai/artifact/<hub-id>/embed` | `'self'` |
| `https://claude.ai/public/artifacts/<id>/embed` | `'self' *.anthropic.com anthropic.com *.claude.com claude.com *.ant.dev` |
| `https://<id>.frame.claudeusercontent.com` (the inner frame) | only loads inside claude.ai; not reachable as a standalone page |

A browser obeys `frame-ancestors`, so an `<iframe>` on `ayalmeyers.github.io` or
`scl.us.com` would show a blank "refused to connect" box. There is no site-side
setting that gets around this.

Claude's help center describes a "Get embed code" option with an "Allowed
domains" list for *published* artifacts on Free, Pro and Max plans. It does not
say this works for artifacts that use connectors, storage or a shared database,
and Team/Enterprise artifacts cannot be published publicly at all. Even if an
embed were allowed, the hub needs each viewer's Claude sign-in to reach
SharePoint and Notion, and browsers increasingly block sign-in cookies inside
third-party frames. Treat embedding as unavailable until Anthropic documents it
for this kind of artifact.

**If that changes:** the team page already supports it. Put the embed URL in the
payload's `embedUrl` field and re-encrypt (section 5). The hub then shows full
height inside the site frame, under the quick links.

## 2. Could the hub run directly on GitHub Pages?

Not without rebuilding it. Everything the hub knows comes through the Claude
artifact runtime:

- `claude.use("mcp")`: the viewer's own SharePoint (rev sheet) and Notion (Ops
  register) connectors, signed in as that person.
- `claude.use("db")`: the shared document database (drafts, signatures, notes).
- `claude.use("artifact")`: publishing `team-data.json` and other files.
- `claude.use("user")`: who is looking.

GitHub Pages serves static files only. A copy there would open read-only from a
bundled snapshot and go stale immediately, and it would put firm financials in
a public repo. Doing it properly means a small server (for example a Cloudflare
Worker or Azure Function) with Microsoft Entra ID and Notion OAuth apps, token
storage, a database to replace `db`, and re-wiring every data call in the
~5,300-line page. Rough cost: two to four weeks of build plus ongoing hosting,
secrets and security upkeep. It would also create a second copy of the hub to
keep in sync, which is the opposite of what was asked.

## 3. Decision

Keep **one hub**: the Claude artifact. The site gets a password-protected team
page that is the front door to it, styled like the rest of the site. Because the
team page only links to the live artifact, any change to the hub shows up for
everyone the moment it is published. There is nothing to sync.

For "look and operate the same way", the hub gets a site theme (section 6), so
going from the site to the hub feels like one product.

## 4. What the password protects, and what it does not

There are two separate locks. Both matter.

**Lock 1: the team page (this repo).** The hub link, the quick links and the
notes are stored in `team.html` as AES-256-GCM ciphertext. The key comes from
the team password through PBKDF2-HMAC-SHA256 with 600,000 iterations and a
random 16-byte salt (the current OWASP guidance). Decryption happens in the
browser with built-in WebCrypto; no external scripts, nothing is sent anywhere.
Without the password, someone reading the page source or the public GitHub repo
sees only ciphertext, never the artifact link.

Limits of lock 1:

- It is one shared password. Anyone who has it can open the page. There are no
  per-person accounts or an audit log on the site side.
- Guessing is only slowed by PBKDF2 (about 0.2 s per try on a laptop). A long
  password is what makes it safe; the default is three words and a number.
- "Remember me on this device" stores the derived key (never the password) in
  the browser's localStorage. Someone with that unlocked laptop can open the
  page. "Sign out" deletes it. Without "Remember me", the key lasts only for
  that browser tab.
- Once a person has seen the hub link, changing the password does not take the
  link back. That is why lock 2 matters.

**Lock 2: the hub itself (claude.ai).** This is the real data protection. The
hub reads SharePoint and Notion with each viewer's own Claude sign-in and
connectors, so nobody sees more than their own accounts allow. The artifact's
sharing setting decides who can open it at all.

**Action for Ayal:** the artifact's sharing is currently *public* (anyone
signed in to Claude who has the link). Switch it to **your organization only**
in the artifact's Share menu on claude.ai. After that, the link is useless to
anyone outside SCL's Claude organization, even if it leaks.

## 5. Maintaining the team page

Files:

- `team.html`: the page. The `<script type="application/json" id="team-vault">`
  block holds the encrypted payload.
- `team-access.js`: decrypts and renders the payload; handles Remember me and
  Sign out. All payload text is inserted with `textContent`, and only `https://`
  links are used.
- `scripts/encrypt-team.mjs`: writes a new encrypted payload into `team.html`.
- `scripts/team-payload.example.json`: the payload format, with placeholders.
- `style.css`: "team access page" section at the end.

The plain-text payload is **not** in the repo. Keep it on your machine.

Change the password (keeps the links):

```sh
node scripts/encrypt-team.mjs --rotate
# asks for the current password, then the new one twice
```

Change the links or notes:

```sh
node scripts/encrypt-team.mjs --decrypt > ~/scl-team-payload.json   # current content
# edit ~/scl-team-payload.json
node scripts/encrypt-team.mjs --in ~/scl-team-payload.json          # asks for a password
```

Then commit `team.html` and push as usual. Everyone who chose "Remember me" is
asked for the password again on their next visit, because the salt changes on
every encryption. Node 20 or later is needed; there are no packages to install.
For scripted runs, `TEAM_PASSWORD` and `TEAM_PASSWORD_OLD` can be set instead of
answering prompts. Never commit a password or the plain-text payload.

Payload fields:

- `hubUrl`: the artifact URL (https).
- `embedUrl`: `null` today; an https embed URL if claude.ai ever allows framing.
- `links`: `{ "label", "hash", "note" }` for a view inside the hub, or
  `{ "label", "url", "note" }` for any other https link.
- `note`: the line under "Open the hub".

Hub views the quick links use (from the hub's boot code, `location.hash` as
`view/sub`): `#home` (Today), `#contracts` (Register), `#invoicing/queue`
(Billing queue), `#book/checks` (Checks), `#ops/requests` (Open questions),
`#draft` (Draft a contract). Others: `#book/board`, `#book/table`,
`#invoicing/ar`, `#invoicing/clients`, `#ops/close`, `#health`, `#pricing`.
Caveat: the hub reads the hash inside its own frame. Whether claude.ai passes the
`#...` from the artifact URL through to that frame could not be tested here
(it needs a signed-in browser). If it does not, the quick links still open the
hub, on Today.

The page is `noindex, nofollow`, is not in `sitemap.xml`, sends no referrer, and
is linked only from a small "Team" link in every page footer (next to Privacy).
`npm run qa` covers `team.html` in its locked state.

## 6. Proposal: the hub in the site's visual language

A drop-in CSS theme for the hub, scoped to `html[data-brand="site"]`. It changes
only custom properties and visual rules. No app logic changes, and the contract
letter output (`--paper*`, `--letter`) is left alone.

- Type: EB Garamond (weight 500) for page titles, card titles and big figures,
  with lining tabular numerals like the site's stat rows; Inter for all UI text
  and for figures in tables (tabular numerals).
- Color: the site's navy `#0f2440` ink and filled primary, blue `#1d5fb0` as the
  accent, `#eef2f9` canvas (the site's `--bg-alt`), white cards with navy-tinted
  hairlines. Chart series 1 becomes the site blue; the rest keep their tested
  palette. A navy dark mode replaces the near-black one.
- Shape: 2px corners on cards, buttons, inputs, tabs and chips (the site is
  square); avatars and status dots stay round.
- Buttons: navy filled primary that turns blue on hover, like `.btn-highlight`;
  outlined secondaries; uppercase blue eyebrows.
- Focus: the site's 2px blue outline with 3px offset.
- Navigation: the selected rail item gets a blue left rule, like the site's
  active nav state.

The theme is on by default (`<html data-brand="site">` plus a tiny boot script).
`?brand=hub` switches a device back to the original look; `?brand=site` switches
it back again. With `?brand=hub` the page renders pixel-identical to the
original (checked by image diff). Fonts load from Google Fonts, which the hub
already uses.

Prototype and screenshots (not published; the coordinator publishes the
artifact): `/home/claude/cb-site/index.html`, theme alone in
`/home/claude/cb-site/site-theme.css`, screenshots in `/home/claude/cb-site/shots/`
(`before-*`, `after-*`, `afterhub-*` at 1440 and 390 for Today, Engagements board
and Billing queue).

## 7. Gifts page (gifts.html)

The client gifting store sits behind the same kind of password page as the
team page. Its catalog (40 gifts), the order settings (the notification
addresses) and the copy are stored as AES-256-GCM ciphertext in
`gifts.html`, in `<script id="gifts-vault">`. After a correct password,
`gifts-access.js` decrypts the payload and loads `gifts-app.js`, the store
from the `ayalmeyers/scl-gifts` repo, styled by `gifts.css` in the site's
type and colors. Orders go by email through FormSubmit, which the Power
Automate flow reads into Excel. There is no HTTP trigger.

Files: `gifts.html`, `gifts-access.js`, `gifts-app.js`, `gifts.css`,
`gifts-images/` (photos for the five items with local photos),
`scripts/gifts-payload.mjs`, and the `--page gifts` option in
`scripts/encrypt-team.mjs`. The sign-in key is stored under `scl-gifts-key`,
separate from the team page, so the two passwords can differ. Signing out also
clears the saved selection and delivery details from that browser.

**The password is not in the repo.** `gifts.html` holds only ciphertext. To
change the password or the catalog, rebuild the payload and encrypt again. The
plain-text payload stays outside the repo:

```sh
node scripts/gifts-payload.mjs ../scl-gifts > ~/scl-gifts-payload.json
GIFTS_PASSWORD='<password>' node scripts/encrypt-team.mjs --page gifts --in ~/scl-gifts-payload.json
# or leave GIFTS_PASSWORD unset and type it at the prompt
```

Commit `gifts.html` and push. Change the password only: `node scripts/encrypt-team.mjs --page gifts --rotate`.
Change the catalog: edit `js/products.js` in scl-gifts, rebuild the payload as
above and encrypt again. The encrypt step refuses a payload with prices, an
`orderEndpoint`, or duplicate product ids. `npm run qa` covers `gifts.html` in
its locked state; the unlocked store needs a sign-in, so check it by hand after
re-encrypting.

All gift photos, including one per color for the 35 checkoutstores items, are
copies stored in `gifts-images/`. Copy any new photo there from scl-gifts
`images/products/`.

## 8. The whole review site behind the team password (site-gate.js)

Every page except `team.html` loads `site-gate.js` in its `<head>`. Until the
visitor signs in, the page renders underneath but stays hidden, and a sign-in
screen in the site's style asks for the team password.

There is no separate site password. The gate fetches `team.html`, reads its
`team-vault`, and checks the typed password by deriving the key and decrypting
that vault, exactly as `team-access.js` does. So:

- The password is the SCL Lab password, and `node scripts/encrypt-team.mjs --rotate`
  changes both at once. Nothing else to update.
- A correct password stores the same derived key the team page stores
  (`scl-team-key`, in localStorage with "Remember me", otherwise for the tab).
  Signing in on the site opens team.html without asking again, and signing in
  on team.html opens the site.
- After a sign-in the tab is marked open (`scl-site-ok` in sessionStorage), so
  later pages open without another check. A remembered device re-checks its
  stored key against the vault once per new tab; after a rotation it is asked
  for the new password.
- "Sign out" on team.html clears the key and closes the site for that tab.
- gifts.html is behind the site gate and then its own gifts sign-in.

**What this does not do.** The gate hides pages from people who open the review
link. It does not encrypt them. The repo is public, so every page's HTML is on
GitHub, and a browser with JavaScript turned off shows the page. Treat the
review site as unlisted, not secret. Real protection would mean a private repo
with access-controlled Pages, or a host with an access layer in front (for
example Cloudflare Access).

QA: `npm run qa` checks every page signed in (it marks the tab open before
loading) and checks the gate itself as `index.html (site gate)`. Lighthouse
can't sign in, so its scores describe the gate until the gate is removed.

**At the scl.us.com cutover**, remove the gate: see LAUNCH-CHECKLIST.md.
