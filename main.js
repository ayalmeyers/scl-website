// Strategic Communication Lab — shared interactions
// Minimal, quiet motion in the spirit of a slow editorial scroll.

// ---------------------------------------------------------------------
// SITE CONFIG: the launch settings that need a value from SCL. Each one
// is a single edit here; every page loads this file, so nothing else
// changes. Empty means off. See LAUNCH-CHECKLIST.md, "Cutover steps".
// ---------------------------------------------------------------------
window.SCL_SITE_CONFIG = {
  // Google Analytics 4 measurement ID, e.g. "G-XXXXXXXXXX". While empty,
  // no analytics script loads and no cookies are set. Before filling it
  // in, have the privacy page updated to mention analytics cookies.
  gaMeasurementId: "",

  // reCAPTCHA v3 site key (public key only; never put the secret here).
  // Off while empty. FormSubmit does not verify v3 tokens, so this adds
  // protection only once the form posts to an endpoint that checks the
  // token with the secret key. Until then FormSubmit's own CAPTCHA,
  // the honeypot and the 3-second minimum are the spam protection.
  recaptchaV3SiteKey: ""
};

// Analytics include point. Equivalent to Google's standard gtag.js
// snippet, loaded only when gaMeasurementId above is set.
(function loadAnalytics() {
  var id = window.SCL_SITE_CONFIG.gaMeasurementId;
  if (!id) return;
  var sc = document.createElement("script");
  sc.async = true;
  sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(sc);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id);
})();

// ---------------------------------------------------------------------
// Team roster: renders from the single data source in team.js into
// whichever of these two containers is present on the page —
// index.html's homepage teaser grid ([data-team-teaser]) and/or
// who-we-are.html's full roster grid + bio dialogs ([data-roster-grid]).
// Keeps both pages' markup (and the roster-dialog wiring further down,
// which queries the DOM after this runs) in sync with one person list.
// ---------------------------------------------------------------------
function renderTeam() {
  var team = window.SCL_TEAM || [];
  if (!team.length) return;

  var teaserGrid = document.querySelector("[data-team-teaser]");
  if (teaserGrid) {
    teaserGrid.innerHTML = team
      .map(function (p) {
        return (
          '<a class="team-teaser-card" href="who-we-are.html#dlg-' + p.id + '">' +
            '<div class="team-teaser-photo"><img src="' + p.photo + '" alt="" width="' + p.photoWidth + '" height="' + p.photoHeight + '" loading="lazy" /></div>' +
            '<span class="team-teaser-name">' + p.name + "</span>" +
            '<span class="team-teaser-role">' + p.role + "</span>" +
          "</a>"
        );
      })
      .join("");
  }

  var rosterGridEl = document.querySelector("[data-roster-grid]");
  if (rosterGridEl) {
    rosterGridEl.innerHTML = team
      .map(function (p) {
        return (
          "<li>" +
            '<button type="button" class="roster-card" aria-haspopup="dialog" data-roster-card="dlg-' + p.id + '">' +
              '<span class="roster-card-photo"><img src="' + p.photo + '" alt="" width="' + p.photoWidth + '" height="' + p.photoHeight + '" loading="lazy" /></span>' +
              '<span class="roster-card-name">' + p.name + "</span>" +
              '<span class="roster-card-role">' + p.role + "</span>" +
            "</button>" +
          "</li>"
        );
      })
      .join("");

    var dialogsHost = document.querySelector("[data-roster-dialogs]") || rosterGridEl.parentNode;
    var dialogsHtml = team
      .filter(function (p) {
        return p.bio && p.bio.length;
      })
      .map(function (p) {
        return (
          '<dialog class="roster-dialog" id="dlg-' + p.id + '">' +
            '<button type="button" class="roster-dialog-close" data-roster-dialog-close aria-label="Close">✕</button>' +
            '<img src="' + p.photo + '" alt="" class="roster-dialog-photo" width="' + p.photoWidth + '" height="' + p.photoHeight + '" />' +
            '<div class="roster-dialog-body">' +
              '<h3 class="roster-dialog-name">' + p.name + "</h3>" +
              '<span class="roster-dialog-role">' + p.role + "</span>" +
              p.bio.map(function (para) { return "<p>" + para + "</p>"; }).join("") +
            "</div>" +
          "</dialog>"
        );
      })
      .join("");
    dialogsHost.insertAdjacentHTML("beforeend", dialogsHtml);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");

  function onScroll() {
    if (!header) return;
    if (window.scrollY > 12) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && links) {
    if (!links.id) links.id = "site-nav";
    toggle.setAttribute("aria-controls", links.id);
    toggle.setAttribute("aria-expanded", "false");
    var setMenu = function (open) {
      links.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    toggle.addEventListener("click", function () {
      setMenu(!links.classList.contains("is-open"));
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setMenu(false);
      });
    });
    // Tapping the page outside the open panel closes it.
    document.addEventListener("click", function (e) {
      if (!links.classList.contains("is-open")) return;
      if (links.contains(e.target) || toggle.contains(e.target)) return;
      setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  // Scroll-reveal
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  // Mark current nav link active — compare by last path segment only, so
  // this works whether the site serves from a domain root or a GitHub
  // Pages subpath (e.g. /scl-website/who-we-are.html).
  var page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[data-nav]").forEach(function (a) {
    var target = a.getAttribute("href");
    if (target === page || (page === "index.html" && target === "")) {
      a.classList.add("is-active");
    }
  });

  renderTeam();

  // ---------------------------------------------------------------------
  // Who We Are: the team roster grid. Each card's photo sits in
  // grayscale and colorizes on hover/focus; clicking (or pressing
  // Enter/Space on) a card opens that person's bio in a native <dialog>
  // — which gives us backdrop, Escape-to-close, and focus handling for
  // free instead of hand-rolling an overlay.
  // ---------------------------------------------------------------------
  var rosterGrid = document.getElementById("roster-grid");
  if (rosterGrid) {
    var rosterCards = Array.prototype.slice.call(rosterGrid.querySelectorAll("[data-roster-card]"));
    rosterCards.forEach(function (card) {
      var dialogId = card.getAttribute("data-roster-card");
      var dialog = document.getElementById(dialogId);
      if (!dialog) return;
      card.addEventListener("click", function () {
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
      });
      var closeBtn = dialog.querySelector("[data-roster-dialog-close]");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          dialog.close();
        });
      }
      // Clicking the backdrop (the click lands on <dialog> itself, not
      // a descendant) closes it, same as the explicit close button.
      dialog.addEventListener("click", function (e) {
        if (e.target === dialog) dialog.close();
      });
    });

    // Deep link: the homepage's "Our Team" cards link straight to a
    // person's bio via who-we-are.html#dlg-<id>, so open that dialog
    // immediately if the URL names one.
    if (window.location.hash) {
      var targetDialog = document.getElementById(window.location.hash.slice(1));
      if (targetDialog && targetDialog.classList.contains("roster-dialog")) {
        if (typeof targetDialog.showModal === "function") {
          targetDialog.showModal();
        } else {
          targetDialog.setAttribute("open", "");
        }
      }
    }
  }

  initAttractorBackground();
  initContactDrawer();
  initCursorDot();
  initFlowScroll();
  initStackScroll();
  initVideoCards();
  initTestimonials();
});

// ---------------------------------------------------------------------
// Testimonials: same hover-swap mechanic as the old team roster, but
// the shared panel shows quote text instead of a photo. Hovering or
// focusing a row swaps its quote into the panel; the "selected" row
// (last clicked, or the first by default) is what the panel reverts to
// once the pointer leaves the list. Handles every .testimonial block
// on the page independently, same pattern as initFlowScroll.
// ---------------------------------------------------------------------
function initTestimonials() {
  var blocks = document.querySelectorAll(".testimonial");
  if (!blocks.length) return;

  blocks.forEach(function (block) {
    var panelQuote = block.querySelector("[data-testimonial-quote]");
    var rows = Array.prototype.slice.call(block.querySelectorAll("[data-testimonial-row]"));
    var list = block.querySelector(".testimonial-list");
    if (!panelQuote || !rows.length || !list) return;

    var selectedRow = rows[0];

    function showQuote(row) {
      var quote = row && row.getAttribute("data-quote");
      if (quote) panelQuote.textContent = quote;
    }

    function selectRow(row) {
      if (selectedRow) selectedRow.classList.remove("is-active");
      row.classList.add("is-active");
      selectedRow = row;
    }

    rows.forEach(function (row) {
      var btn = row.querySelector("[data-testimonial-trigger]");
      if (!btn) return;
      btn.addEventListener("mouseenter", function () { showQuote(row); });
      btn.addEventListener("focus", function () { showQuote(row); });
      btn.addEventListener("click", function () { selectRow(row); });
    });

    list.addEventListener("mouseleave", function () {
      showQuote(selectedRow);
    });
  });
}

// ---------------------------------------------------------------------
// Insights in Motion (Musings): click-to-load video embeds. Nothing
// loads until a visitor presses play — the poster tile holds a
// data-video-embed URL and swaps in an iframe pointed at it (with
// autoplay=1, allowed since it's triggered by a real user gesture) only
// once clicked, rather than loading every embed up front.
// ---------------------------------------------------------------------
function initVideoCards() {
  document.querySelectorAll("[data-video-play]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var poster = btn.closest(".video-card-poster");
      if (!poster) return;
      var src = poster.getAttribute("data-video-embed");
      if (!src) return;
      var iframe = document.createElement("iframe");
      iframe.src = src + (src.indexOf("?") > -1 ? "&" : "?") + "autoplay=1";
      var label = btn.getAttribute("aria-label") || "Video";
      iframe.title = label.replace(/^Play video:\s*/, "");
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      poster.classList.add("has-embed");
      poster.innerHTML = "";
      poster.appendChild(iframe);
    });
  });
}

// ---------------------------------------------------------------------
// Flow-scroll: pinned horizontal card carousel (see .flow-scroll in
// style.css), modeled on axiom.peppermint.id's "Observed Systems"
// section — one shared scroll listener drives every such section on
// the page. Each section maps its own scroll progress (0-1, based on
// how far its pinned stage has been scrolled through) directly to the
// track's translateX, and on every tick re-scores each card by how
// close its horizontal center is to the viewport's center: the nearer
// card scales up and stays fully opaque, the further ones shrink and
// fade — there's no cover/takeover panel, the pin just releases into
// whatever section follows once scrolled through. Skipped under
// prefers-reduced-motion or at <=900px, where CSS drops the pin and
// stacks the cards as a normal static column.
// ---------------------------------------------------------------------
function initFlowScroll() {
  var sections = document.querySelectorAll(".flow-scroll");
  if (!sections.length) return;

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  var items = [];
  sections.forEach(function (section) {
    var track = section.querySelector(".flow-track");
    if (!track) return;
    var boxes = Array.prototype.slice.call(track.querySelectorAll(".flow-box"));
    items.push({ section: section, track: track, boxes: boxes });
  });
  if (!items.length) return;

  function resetBoxes(it) {
    it.boxes.forEach(function (box) {
      box.style.transform = "";
      box.style.opacity = "";
    });
  }

  function update() {
    if (window.innerWidth <= 900) {
      items.forEach(function (it) {
        it.track.style.transform = "";
        resetBoxes(it);
      });
      return;
    }
    var vh = window.innerHeight;
    var centerX = window.innerWidth / 2;
    items.forEach(function (it) {
      var total = it.section.offsetHeight - vh;
      if (total <= 0) return;
      var rect = it.section.getBoundingClientRect();
      var progress = Math.min(Math.max(-rect.top / total, 0), 1);

      var maxTranslate = Math.max(it.track.scrollWidth - window.innerWidth, 0);
      it.track.style.transform = "translateX(" + (-progress * maxTranslate) + "px)";

      // The Coaches/Counsel/Consultants cards fade a little less than
      // other flow-scroll cards (e.g. the video carousel) as they leave
      // center, so off-center cards stay more visible.
      var opacityFalloff = it.section.id === "who-we-are" ? 0.4 : 0.55;
      it.boxes.forEach(function (box) {
        var boxRect = box.getBoundingClientRect();
        var boxCenter = boxRect.left + boxRect.width / 2;
        var dist = Math.min(Math.abs(boxCenter - centerX) / (window.innerWidth * 0.55), 1);
        var scale = 1.16 - dist * 0.36;
        var opacity = 1 - dist * opacityFalloff;
        box.style.transform = "scale(" + scale.toFixed(3) + ")";
        box.style.opacity = opacity.toFixed(3);
      });
    });
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

// ---------------------------------------------------------------------
// Stack-scroll: a pinned section where each card slides in from the
// right and settles in the exact same spot as the one before it,
// fully covering it (z-index by DOM order) — modeled on a reference
// recording of axiom.peppermint.id's "Observed Systems" cards. Unlike
// initFlowScroll's position: sticky, the stage here is toggled between
// position: absolute (before/after the pin range) and position: fixed
// (during it) by hand, specifically so the final card holds its exact
// on-screen position for the whole pin range — it doesn't un-stick and
// scroll away partway through. The section right after only starts
// covering the viewport once the pin range ends, so the handoff reads
// as "the next page arrives and takes it over" rather than "the last
// card scrolls up and off."
// ---------------------------------------------------------------------
function initStackScroll() {
  var sections = Array.prototype.slice.call(document.querySelectorAll(".stack-scroll"));
  if (!sections.length) return;

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  var HOLD_UNITS = 0.6; // extra viewport-heights the last card holds still before release

  var items = [];

  // The .stack-cover element (marked in HTML) is the next real page section:
  // it stays in normal document flow, so it naturally scrolls up and covers
  // the still-pinned stage. We release the pin only once it has actually
  // arrived, rather than guessing a fixed distance — any markup between the
  // two (like an <hr>) just falls out of the calculation automatically.
  function findCover(section) {
    var el = section.nextElementSibling;
    while (el) {
      if (el.classList.contains("stack-cover")) return el;
      el = el.nextElementSibling;
    }
    return null;
  }

  function setup() {
    items = [];
    if (window.innerWidth <= 900) return;
    var vh = window.innerHeight;
    sections.forEach(function (section) {
      var stage = section.querySelector(".stack-scroll-stage");
      var track = section.querySelector(".stack-track");
      var boxes = Array.prototype.slice.call(section.querySelectorAll(".stack-box"));
      if (!stage || !track || !boxes.length) return;
      var panUnits = boxes.length - 1;
      var animUnits = panUnits + HOLD_UNITS;
      var pinRange = vh * animUnits;
      var cover = findCover(section);

      // The stage is position: sticky (style.css), so the browser pins it
      // on the compositor with no JS position flips. A sticky element
      // only stays pinned while its section's box is on screen. When the
      // next section (the cover) is at least a viewport tall, the stage
      // stays pinned until the cover reaches the top, so the cover slides
      // up over the last card: measure that distance with the section at
      // its normal height, stretch the section by the difference, and
      // pull everything after it back up by the same amount with a
      // negative bottom margin, so the layout after it is unchanged.
      // A shorter cover (e.g. musings.html's one-line CTA band) can't hide
      // the card, so there the pin simply ends after the hold and the card
      // scrolls away with the page instead of sitting over the footer.
      section.style.paddingTop = "0px";
      section.style.paddingBottom = "0px";
      section.style.marginBottom = "";
      section.style.height = (pinRange + vh) + "px";
      var extended = !!cover && cover.offsetHeight >= vh;
      if (extended) {
        var pinDistance = Math.max(
          cover.getBoundingClientRect().top - section.getBoundingClientRect().top,
          pinRange
        );
        section.style.height = (pinDistance + vh) + "px";
        section.style.marginBottom = (pinRange - pinDistance) + "px";
      }
      items.push({
        section: section,
        stage: stage,
        track: track,
        boxes: boxes,
        panUnits: panUnits,
        animUnits: animUnits,
        pinRange: pinRange,
        coverEl: cover,
        extended: extended
      });
    });
  }

  function resetInline() {
    sections.forEach(function (section) {
      section.style.height = "";
      section.style.paddingTop = "";
      section.style.paddingBottom = "";
      section.style.marginBottom = "";
      var stage = section.querySelector(".stack-scroll-stage");
      if (stage) stage.style.visibility = "";
      var track = section.querySelector(".stack-track");
      if (track) track.style.transform = "";
      section.querySelectorAll(".stack-box").forEach(function (box) {
        box.style.transform = "";
        box.style.opacity = "";
      });
    });
  }

  function update() {
    if (window.innerWidth <= 900) {
      resetInline();
      return;
    }
    var centerX = window.innerWidth / 2;
    items.forEach(function (it) {
      var vh = window.innerHeight;
      var rect = it.section.getBoundingClientRect();
      var coverRect = it.coverEl ? it.coverEl.getBoundingClientRect() : null;

      var released = coverRect ? coverRect.top <= 0 : rect.top <= -it.pinRange;

      // Once the cover has reached the top, the stage is behind it for
      // good: hide it so it can't show under shorter content further down.
      // (Previously the stage flipped between position absolute and
      // fixed here; Chrome scores that flip as a full-screen layout shift,
      // CLS 1.0, on every page with this section.)
      it.stage.style.visibility = it.extended && released ? "hidden" : "";

      // Same filmstrip pan as initFlowScroll: progress reaches 1 once the
      // cards themselves have finished panning (ignoring HOLD_UNITS, which
      // just keeps the pin — and the fully-panned track — in place a bit
      // longer before the vertical release above kicks in).
      var scrollUnits = vh > 0 ? Math.min(Math.max(-rect.top / vh, 0), it.animUnits) : it.animUnits;
      var progress = it.panUnits > 0 ? Math.min(scrollUnits / it.panUnits, 1) : 1;
      var maxTranslate = Math.max(it.track.scrollWidth - it.stage.offsetWidth, 0);
      it.track.style.transform = "translateX(" + (-progress * maxTranslate) + "px)";

      it.boxes.forEach(function (box) {
        var boxRect = box.getBoundingClientRect();
        var boxCenter = boxRect.left + boxRect.width / 2;
        var dist = Math.min(Math.abs(boxCenter - centerX) / (window.innerWidth * 0.55), 1);
        var scale = 1.16 - dist * 0.36;
        var opacity = 1 - dist * 0.55;
        box.style.transform = "scale(" + scale.toFixed(3) + ")";
        box.style.opacity = opacity.toFixed(3);
      });
    });
  }

  setup();
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", function () {
    setup();
    update();
  });
}

// ---------------------------------------------------------------------
// Custom dot cursor: a small circular marker that follows the pointer
// with a touch of lag, rendered with mix-blend-mode so it stays visible
// over both the light and dark sections without any manual color
// switching. Desktop / fine-pointer only — untouched on touch devices
// and skipped entirely under prefers-reduced-motion. Native text/beam
// cursors are preserved over form fields.
// ---------------------------------------------------------------------
function initCursorDot() {
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer =
    window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (reduceMotion || coarsePointer) return;

  var dot = document.createElement("div");
  dot.id = "cursor-dot";
  document.body.appendChild(dot);

  var target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var current = { x: target.x, y: target.y };
  var active = false;

  window.addEventListener(
    "pointermove",
    function (e) {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!active) {
        active = true;
        dot.classList.add("is-active");
      }
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var overField = el && el.closest && el.closest("input, textarea, select");
      dot.classList.toggle("is-hidden", !!overField);
      var overClickable = el && el.closest && el.closest("a, button");
      dot.classList.toggle("is-hovering", !!overClickable && !overField);
    },
    { passive: true }
  );
  window.addEventListener("mouseleave", function () {
    dot.classList.remove("is-active");
  });

  var rafId = null;
  function frame() {
    current.x += (target.x - current.x) * 0.35;
    current.y += (target.y - current.y) * 0.35;
    dot.style.transform = "translate3d(" + current.x.toFixed(1) + "px, " + current.y.toFixed(1) + "px, 0) translate(-50%, -50%)";
    rafId = window.requestAnimationFrame(frame);
  }
  rafId = window.requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = window.requestAnimationFrame(frame);
    }
  });
}

// ---------------------------------------------------------------------
// Contact drawer: a pop-out panel that slides in over a dimmed backdrop,
// instead of navigating to a separate contact page. Every "Contact Us"
// link site-wide is intercepted to open this panel in place; on
// contact.html itself (reached directly, e.g. a bookmark) the same panel
// renders pinned open over the page, and its close control returns to
// the homepage since there's no underlying page to reveal there.
// ---------------------------------------------------------------------
function initContactDrawer() {
  var isContactPage = document.body.hasAttribute("data-contact-page");
  var built = false;
  var scrim, drawer;

  function drawerMarkup() {
    return (
      '<div class="drawer-resize-handle" id="drawer-resize-handle" title="Drag to resize"></div>' +
      '<div class="contact-drawer-top">' +
      '  <span class="eyebrow">Get In Touch</span>' +
      '  <button type="button" class="drawer-close" id="drawer-close">Close <span class="key">↵</span></button>' +
      "</div>" +
      '<div id="client-panel">' +
      '  <h2 id="drawer-heading">Tell us about your goals</h2>' +
      '  <p class="sub">The more context you share, the faster we can match you with the right consultant.</p>' +
      '  <p class="form-scope-note">This form is for clients and prospective clients. Vendor solicitations are not reviewed.</p>' +
      '  <form id="contact-form" method="POST" novalidate>' +
      '    <div class="drawer-grid">' +
      "      <div>" +
      '        <label for="name">Name*</label>' +
      '        <input type="text" id="name" name="name" autocomplete="name" required />' +
      "      </div>" +
      "      <div>" +
      '        <label for="company">Company</label>' +
      '        <input type="text" id="company" name="company" autocomplete="organization" />' +
      "      </div>" +
      "      <div>" +
      '        <label for="email">Email*</label>' +
      '        <input type="email" id="email" name="email" autocomplete="email" required />' +
      "      </div>" +
      "      <div>" +
      '        <label for="phone">Phone</label>' +
      '        <input type="tel" id="phone" name="phone" autocomplete="tel" />' +
      "      </div>" +
      '      <div class="full">' +
      '        <label for="purpose">What brings you to SCL?*</label>' +
      '        <select id="purpose" name="purpose" required>' +
      '          <option value="">Choose one…</option>' +
      '          <option value="Engaging SCL for my team or myself">Engaging SCL for my team or myself</option>' +
      '          <option value="Speaking or event inquiry">Speaking or event inquiry</option>' +
      '          <option value="Joining SCL as a consultant">Joining SCL as a consultant</option>' +
      '          <option value="Media">Media</option>' +
      '          <option value="Vendor / sales inquiry">Vendor / sales inquiry</option>' +
      "        </select>" +
      '        <p class="vendor-note" id="vendor-note" hidden>We don’t take unsolicited vendor or sales pitches through this form. If we have a need, we’ll reach out.</p>' +
      "      </div>" +
      '      <div class="full">' +
      '        <label for="message">Message*</label>' +
      '        <textarea id="message" name="message" required></textarea>' +
      "      </div>" +
      "    </div>" +
      '    <div class="hp-field" aria-hidden="true">' +
      '      <label for="website">Leave this field blank</label>' +
      '      <input type="text" id="website" name="_honey" tabindex="-1" autocomplete="off" />' +
      "    </div>" +
      '    <label class="consent-row">' +
      '      <input type="checkbox" id="consent" name="consent" required />' +
      '      <span>I agree to be contacted about my inquiry. See our <a href="privacy.html" target="_blank" rel="noopener">privacy practices</a>.</span>' +
      "    </label>" +
      '    <div class="drawer-submit-row">' +
      '      <p id="form-note" role="status" aria-live="polite"></p>' +
      '      <button type="submit" class="drawer-send">Send <span class="key">↳</span></button>' +
      "    </div>" +
      "  </form>" +
      "</div>"
    );
  }

  // ---- Lead-routing config ----
  // Routes through FormSubmit (https://formsubmit.co) rather than the
  // originally-planned Power Automate flow: Power Automate needs a flow
  // built inside SCL's own Microsoft 365 tenant, while FormSubmit needs
  // no account at all, just the destination address. The one manual step
  // is on the SCL side: FormSubmit emails admin@scl.us.com a one-time
  // "confirm this form" link the first time a submission comes through,
  // and every submission after that confirmation click is delivered.
  //
  // Spam protection, in layers:
  //  1. Honeypot field (#website, posted as FormSubmit's own "_honey"
  //     field, so FormSubmit also discards anything that fills it).
  //  2. Minimum time on form: under 3 seconds is treated as a bot.
  //  3. FormSubmit's own CAPTCHA. The form posts to FormSubmit's standard
  //     endpoint (not its /ajax/ endpoint, which cannot show a CAPTCHA),
  //     so the visitor completes FormSubmit's check on formsubmit.co and
  //     is sent back to contact.html?sent=1, which shows the thank-you
  //     message. No keys are needed on our side.
  //  4. Optional reCAPTCHA v3 hook (SCL_SITE_CONFIG.recaptchaV3SiteKey,
  //     off while empty). See LAUNCH-CHECKLIST.md before turning it on.
  //
  // TODO(confirm): jbrown@scl.us.com is a stated CC target that has not
  // been verified. See LAUNCH-CHECKLIST.md.
  var SCL_FORM_ENDPOINT = "https://formsubmit.co/admin@scl.us.com";
  var SCL_FORM_CC = "jbrown@scl.us.com,jtarsitano@scl.us.com";
  var SUBJECT_BY_PURPOSE = {
    "Speaking or event inquiry": "[SCL Website – Speaking] New Contact Form Submission",
    "Joining SCL as a consultant": "[SCL Website – Careers] New Contact Form Submission",
    "Vendor / sales inquiry": "[SCL Website – Vendor] New Contact Form Submission"
  };
  var DEFAULT_SUBJECT = "[SCL Website Lead] New Contact Form Submission";
  var MIN_FILL_MS = 3000;

  function setHidden(form, name, value) {
    var input = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  // Optional reCAPTCHA v3, isolated here. Does nothing while the key in
  // SCL_SITE_CONFIG (top of this file) is empty.
  function recaptchaKey() {
    return (window.SCL_SITE_CONFIG && window.SCL_SITE_CONFIG.recaptchaV3SiteKey) || "";
  }
  function loadRecaptchaV3() {
    var key = recaptchaKey();
    if (!key || document.getElementById("recaptcha-v3")) return;
    var sc = document.createElement("script");
    sc.id = "recaptcha-v3";
    sc.async = true;
    sc.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(key);
    document.head.appendChild(sc);
  }
  function withRecaptchaToken(done) {
    var key = recaptchaKey();
    if (!key || !window.grecaptcha || !window.grecaptcha.execute) return done("");
    window.grecaptcha.ready(function () {
      window.grecaptcha.execute(key, { action: "contact" }).then(done, function () { done(""); });
    });
  }

  function wireForm() {
    var form = document.querySelector("#contact-form");
    if (!form) return;
    var honeypotEl = document.querySelector("#website");
    var consentEl = document.querySelector("#consent");
    var purposeEl = document.querySelector("#purpose");
    var vendorNoteEl = document.querySelector("#vendor-note");
    var renderedAt = Date.now();
    var note = document.querySelector("#form-note");

    form.setAttribute("action", SCL_FORM_ENDPOINT);
    loadRecaptchaV3();

    // Back from FormSubmit after a completed submission.
    if (/(\?|&)sent=1(&|$)/.test(window.location.search || "") && note) {
      note.className = "is-success";
      note.textContent = "Thank you. A member of our team will be in touch shortly.";
    }

    if (purposeEl && vendorNoteEl) {
      purposeEl.addEventListener("change", function () {
        vendorNoteEl.hidden = purposeEl.value !== "Vendor / sales inquiry";
      });
    }

    function showError(msg, field) {
      if (note) {
        note.className = "is-error";
        note.textContent = msg;
      }
      if (field && field.focus) field.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot tripped, or submitted implausibly fast for a human
      // filling in a multi-field form: behave as a bot would expect
      // (quiet success) without sending anything.
      if ((honeypotEl && honeypotEl.value) || Date.now() - renderedAt < MIN_FILL_MS) {
        if (note) {
          note.className = "is-success";
          note.textContent = "Thank you. Your message has been noted.";
        }
        form.reset();
        return;
      }

      // Simple per-session cap. Static hosting has no server to enforce
      // a real limit, so this is a best-effort deterrent only.
      var sentCount = 0;
      try {
        sentCount = parseInt(window.sessionStorage.getItem("scl-contact-sent") || "0", 10) || 0;
      } catch (err) {}
      if (sentCount >= 5) {
        showError("Please call 1-877-266-6522. This form has reached its limit for this session.");
        return;
      }

      var nameEl = document.querySelector("#name");
      var emailEl = document.querySelector("#email");
      var messageEl = document.querySelector("#message");
      var firstMissing = [nameEl, emailEl, messageEl].filter(function (el) {
        return el && !el.value.trim();
      })[0];
      if (firstMissing) {
        showError("Please fill in your name, email, and message before sending.", firstMissing);
        return;
      }
      if (emailEl.checkValidity && !emailEl.checkValidity()) {
        showError("Please enter a valid email address.", emailEl);
        return;
      }
      if (purposeEl && !purposeEl.value) {
        showError("Please let us know what brings you to SCL.", purposeEl);
        return;
      }
      if (consentEl && !consentEl.checked) {
        showError("Please confirm you agree to be contacted before sending.", consentEl);
        return;
      }

      var purpose = purposeEl ? purposeEl.value : "";
      setHidden(form, "_subject", SUBJECT_BY_PURPOSE[purpose] || DEFAULT_SUBJECT);
      setHidden(form, "_cc", SCL_FORM_CC);
      setHidden(form, "_replyto", emailEl.value.trim());
      setHidden(form, "_template", "table");
      setHidden(form, "_next", new URL("contact.html?sent=1", window.location.href).href);
      setHidden(form, "submittedAt", new Date().toISOString());

      if (note) {
        note.className = "is-pending";
        note.textContent = "Sending…";
      }
      try {
        window.sessionStorage.setItem("scl-contact-sent", String(sentCount + 1));
      } catch (err) {}

      withRecaptchaToken(function (token) {
        if (token) setHidden(form, "g-recaptcha-v3-token", token);
        // Native submit (does not re-run this handler): FormSubmit shows
        // its CAPTCHA, then returns the visitor to contact.html?sent=1.
        HTMLFormElement.prototype.submit.call(form);
      });
    });
  }

  function build() {
    if (built) return;
    if (isContactPage) {
      scrim = document.querySelector("#contact-drawer-scrim");
      drawer = document.querySelector("#contact-drawer");
    } else {
      scrim = document.createElement("div");
      scrim.className = "contact-drawer-scrim";
      scrim.id = "contact-drawer-scrim";
      drawer = document.createElement("div");
      drawer.className = "contact-drawer";
      drawer.id = "contact-drawer";
      document.body.appendChild(scrim);
      document.body.appendChild(drawer);
    }
    drawer.innerHTML = drawerMarkup();
    wireForm();
    if (isContactPage) {
      // There's no page underneath to reveal on the dedicated contact
      // route (the scrim behind it just dims to a solid backdrop), so
      // the half-width/resizable behavior below — built for the drawer
      // floating over another page — has nothing to show off here.
      // Full width avoids leaving a dim, empty gap beside the form.
      drawer.style.width = "100%";
    } else {
      applyDrawerWidth();
      wireResize();
    }

    var closeBtn = document.querySelector("#drawer-close");
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    scrim.addEventListener("click", function () {
      if (!isContactPage) closeDrawer();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });

    built = true;
  }

  // The drawer defaults to half the viewport's width, but a visitor can
  // drag its left edge to make it wider or narrower — that choice is
  // remembered (per browser) for next time.
  var DRAWER_WIDTH_KEY = "scl-contact-drawer-width";

  function applyDrawerWidth() {
    // Below 560px the drawer is full-viewport-width by design (see the
    // mobile media query) — leave it to that CSS rather than fighting it
    // with an inline style, which would otherwise win the cascade.
    if (window.innerWidth <= 560) {
      drawer.style.width = "";
      return;
    }
    var saved = null;
    try {
      saved = window.localStorage.getItem(DRAWER_WIDTH_KEY);
    } catch (e) {}
    var width = saved ? parseInt(saved, 10) : Math.round(window.innerWidth * 0.5);
    if (!width || isNaN(width)) width = Math.round(window.innerWidth * 0.5);
    width = Math.max(360, Math.min(Math.round(window.innerWidth * 0.96), width));
    drawer.style.width = width + "px";
  }

  function wireResize() {
    var handle = document.querySelector("#drawer-resize-handle");
    if (!handle) return;
    var dragging = false;

    function onMove(e) {
      if (!dragging) return;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var newWidth = window.innerWidth - clientX;
      newWidth = Math.max(360, Math.min(Math.round(window.innerWidth * 0.96), newWidth));
      drawer.classList.add("is-resizing");
      drawer.style.width = newWidth + "px";
    }
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("is-dragging");
      drawer.classList.remove("is-resizing");
      try {
        window.localStorage.setItem(DRAWER_WIDTH_KEY, parseInt(drawer.style.width, 10));
      } catch (e) {}
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
    }
    handle.addEventListener("pointerdown", function (e) {
      dragging = true;
      handle.classList.add("is-dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", endDrag);
      e.preventDefault();
    });
  }

  var lastTrigger = null;

  function isDirty() {
    var ids = ["name", "company", "email", "phone", "message"];
    return ids.some(function (id) {
      var el = document.getElementById(id);
      return el && el.value && el.value.trim();
    });
  }

  function trapFocus(e) {
    if (e.key !== "Tab" || !drawer) return;
    var focusable = drawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openDrawer(purpose, triggerEl) {
    build();
    lastTrigger = triggerEl || document.activeElement;
    scrim.classList.add("is-open");
    drawer.classList.add("is-open");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "drawer-heading");
    document.body.classList.add("contact-drawer-locked");
    if (purpose === "careers") {
      var heading = document.querySelector("#drawer-heading");
      var sub = document.querySelector("#client-panel .sub");
      var purposeEl = document.querySelector("#purpose");
      if (heading) heading.textContent = "Join our roster";
      if (sub) sub.textContent = "Tell us about your background and the kind of engagements you're looking for.";
      if (purposeEl) purposeEl.value = "Joining SCL as a consultant";
    }
    drawer.addEventListener("keydown", trapFocus);
    window.requestAnimationFrame(function () {
      var nameEl = document.querySelector("#name");
      if (nameEl) nameEl.focus({ preventScroll: true });
    });
  }

  function closeDrawer() {
    if (isContactPage) {
      if (isDirty() && !window.confirm("Discard your message and return home?")) return;
      if (window.history.length > 1 && document.referrer && document.referrer.indexOf(window.location.origin) === 0) {
        window.history.back();
      } else {
        window.location.href = "index.html";
      }
      return;
    }
    if (scrim) scrim.classList.remove("is-open");
    if (drawer) {
      drawer.classList.remove("is-open");
      drawer.removeEventListener("keydown", trapFocus);
    }
    document.body.classList.remove("contact-drawer-locked");
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }

  // Every "Contact Us" link, anywhere on the page, opens the drawer
  // instead of navigating — except when the user is explicitly asking
  // for a new tab/window (modifier click or middle click).
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    if (e.defaultPrevented || e.button === 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var isContactLink = /(^|\/)contact\.html$/.test(a.pathname || "");
    if (!isContactLink) return;
    e.preventDefault();
    var purpose = /(\?|&)purpose=careers(&|$)/.test(a.search || "") ? "careers" : null;
    openDrawer(purpose, a);
  });

  if (isContactPage) {
    var purpose = /(\?|&)purpose=careers(&|$)/.test(window.location.search || "") ? "careers" : null;
    openDrawer(purpose);
  }
}


// ---------------------------------------------------------------------
// Live attractor background
// A fixed, full-page canvas continuously integrates the Lorenz system
// (the classic chaos-theory "butterfly" equations) and renders the
// trailing trajectory as thin gold strokes, viewed through a camera
// that slowly auto-rotates and additionally turns with scroll position
// — the animated backdrop "flows and moves with the page". Pure math,
// original rendering code; no external assets or libraries.
// ---------------------------------------------------------------------
function initAttractorBackground() {
  var canvas = document.getElementById("attractor-bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer =
    window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var width = 0, height = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  // Lorenz system parameters (the standard chaotic regime).
  var sigma = 10, rho = 28, beta = 8 / 3;
  var dt = 0.006;
  var stepsPerFrame = reduceMotion ? 0 : 3;

  // Two nearby starting points, so the classic "sensitive dependence on
  // initial conditions" shows up as the two trails slowly diverging.
  var p1 = { x: 0.6, y: 0.6, z: 0.6 };
  var p2 = { x: 0.6001, y: 0.6, z: 0.6 };
  // A third thread, one more step removed: coaching, counsel and
  // consulting as three paths from nearly the same start (see the
  // "Our Mark" section on the homepage).
  var p3 = { x: 0.6, y: 0.6001, z: 0.6 };

  var MAX_POINTS = 24000;
  var trail1 = [];
  var trail2 = [];
  var trail3 = [];

  function step(p) {
    var dx = sigma * (p.y - p.x);
    var dy = p.x * (rho - p.z) - p.y;
    var dz = p.x * p.y - beta * p.z;
    return { x: p.x + dx * dt, y: p.y + dy * dt, z: p.z + dz * dt };
  }

  function seedTrail() {
    // Run a warm-up pass first so the initial spiral-in transient (before
    // the trajectory settles onto the attractor) is discarded rather than
    // showing up as a stray thread through the finished butterfly.
    for (var w = 0; w < 3000; w++) {
      p1 = step(p1);
      p2 = step(p2);
      p3 = step(p3);
    }
    // Pre-compute a long run instantly so the page doesn't open on an
    // empty canvas — matches the fully-formed butterfly seen on load.
    for (var i = 0; i < MAX_POINTS; i++) {
      p1 = step(p1);
      p2 = step(p2);
      trail1.push({ x: p1.x, y: p1.y, z: p1.z, dx: 0, dy: 0, vx: 0, vy: 0 });
      trail2.push({ x: p2.x, y: p2.y, z: p2.z, dx: 0, dy: 0, vx: 0, vy: 0 });
      p3 = step(p3);
      trail3.push({ x: p3.x, y: p3.y, z: p3.z, dx: 0, dy: 0, vx: 0, vy: 0 });
    }
  }
  seedTrail();

  var lastCam = { angle: 0, tilt: 0.35, scale: 1, cx: 0, cy: 0 };

  var scrollY = window.scrollY || 0;
  window.addEventListener(
    "scroll",
    function () {
      scrollY = window.scrollY || 0;
    },
    { passive: true }
  );

  // ---------------------------------------------------------------------
  // Cursor field: the trail near the pointer bulges away from it (convex
  // — a push, not a pull) and springs back when the pointer moves away,
  // plus a small glowing node at the cursor. The Lorenz integration
  // above (step/seedTrail/loop) is untouched — this only offsets each
  // point's already-projected 2D screen position, so the underlying
  // trajectory math stays exactly as it was.
  // ---------------------------------------------------------------------
  var isHovering = false;
  var fieldRadius = 200; // px — R_field: reach of the gravity field
  var pullStrength = 0.5; // S_force: 0..1, peak pull fraction at the cursor center
  var maxPullPx = 70; // pixel displacement at S_force's full strength (d = 0)
  var kStiffness = 0.12;
  var cDamping = 0.82;
  var mouseX = 0, mouseY = 0;

  if (!coarsePointer) {
    window.addEventListener(
      "pointermove",
      function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isHovering = true;
      },
      { passive: true }
    );
    document.addEventListener("mouseleave", function () {
      isHovering = false;
    });
  }

  function project(pt, angle, tilt, scale, cx, cy) {
    var cosA = Math.cos(angle), sinA = Math.sin(angle);
    var rx = pt.x * cosA - pt.y * sinA;
    var ry = pt.x * sinA + pt.y * cosA;
    var cosT = Math.cos(tilt), sinT = Math.sin(tilt);
    var rz = pt.z * cosT - ry * sinT;
    return {
      x: cx + rx * scale,
      y: cy - (rz - 25) * scale
    };
  }

  function drawTrail(trail, angle, tilt, scale, cx, cy, hue) {
    ctx.beginPath();
    var prev = null;
    for (var i = 0; i < trail.length; i++) {
      var pt = trail[i];
      var proj = project(pt, angle, tilt, scale, cx, cy);

      // Radial displacement vector, with quadratic falloff from full
      // pullStrength at the center to zero at fieldRadius —
      // w(d) = pullStrength * (1 - d/R)^2. Pushing away from the cursor
      // (rather than pulling toward it) reads as a convex bulge in the
      // trail instead of a concave dent.
      var targetDx = 0, targetDy = 0;
      if (isHovering) {
        var awayX = proj.x - mouseX, awayY = proj.y - mouseY;
        var d = Math.sqrt(awayX * awayX + awayY * awayY);
        if (d < fieldRadius && d > 0.0001) {
          var w = pullStrength * (1 - d / fieldRadius) * (1 - d / fieldRadius);
          targetDx = (awayX / d) * w * maxPullPx;
          targetDy = (awayY / d) * w * maxPullPx;
        }
      }

      // Damped harmonic spring toward the target displacement — the
      // same equation pulls a point in when it's near the cursor and
      // (once the target drops back to zero) eases it back to its true
      // Lorenz position, with a little overshoot before it settles.
      if (targetDx !== 0 || targetDy !== 0 || Math.abs(pt.dx) > 0.02 || Math.abs(pt.dy) > 0.02 || Math.abs(pt.vx) > 0.02 || Math.abs(pt.vy) > 0.02) {
        var ax = kStiffness * (targetDx - pt.dx) - cDamping * pt.vx;
        var ay = kStiffness * (targetDy - pt.dy) - cDamping * pt.vy;
        pt.vx += ax;
        pt.vy += ay;
        pt.dx += pt.vx;
        pt.dy += pt.vy;
      } else {
        pt.dx = 0; pt.dy = 0; pt.vx = 0; pt.vy = 0;
      }

      var drawX = proj.x + pt.dx, drawY = proj.y + pt.dy;
      if (prev) {
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(drawX, drawY);
      }
      prev = { x: drawX, y: drawY };
    }
    ctx.strokeStyle = hue;
    ctx.lineWidth = 0.7;
    // Additive ("lighter") blending on the dark background: denser,
    // overlapping loops glow brighter rather than muddying into a flat
    // color, the way axiom.peppermint.id's gold trails read on black.
    ctx.globalCompositeOperation = "lighter";
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  function drawCursorField() {
    if (!isHovering || coarsePointer) return;
    ctx.save();
    // Glowing gravity node at the cursor.
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FFA500";
    ctx.shadowColor = "#FF8C00";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);

    // Measured against the reference recording: its camera angle is
    // driven by scroll position only — holding still and just moving
    // the mouse around for 10s produced zero change in the attractor's
    // shape/orientation (confirmed via pixel bounding-box comparison
    // across the whole clip). So no time-based auto-rotation and no
    // pointer-driven angle/tilt here, unlike the earlier version. (The
    // cursor gravity field above is a separate, local displacement of
    // each point's drawn position — it doesn't touch the camera.)
    var angle = scrollY * 0.0006;
    var tilt = 0.35;

    // The reference doesn't just rotate the butterfly in place — as you
    // scroll it swings between the full wide shape and a tight zoom on a
    // single lobe, and pans across the page rather than parking in one
    // spot. Tie scale and position to scroll progress (not just time) so
    // the attractor visibly travels and zooms as the page moves.
    var zoomPulse = 0.5 + 0.5 * Math.sin(scrollY * 0.0014);
    var scale = Math.min(width, height) * (0.014 + zoomPulse * 0.022);
    var panFrac = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(scrollY * 0.0009 + 1.1));
    var cx = width * panFrac;
    var cy = height * (0.42 + 0.16 * Math.sin(scrollY * 0.0011));

    lastCam.angle = angle;
    lastCam.tilt = tilt;
    lastCam.scale = scale;
    lastCam.cx = cx;
    lastCam.cy = cy;

    // Warm gold on the near-black page, additive-blended (see drawTrail)
    // so the two nearby trails' overlap brightens like the reference.
    drawTrail(trail1, angle, tilt, scale, cx, cy, "rgba(47,111,237,0.32)");
    drawTrail(trail2, angle, tilt, scale, cx, cy, "rgba(95,160,176,0.22)");
    drawTrail(trail3, angle, tilt, scale, cx, cy, "rgba(151,191,79,0.2)");

    drawCursorField();
  }

  if (reduceMotion) {
    draw(0);
    return;
  }

  var rafId = null;
  function loop(now) {
    for (var i = 0; i < stepsPerFrame; i++) {
      p1 = step(p1);
      p2 = step(p2);
      trail1.push({ x: p1.x, y: p1.y, z: p1.z, dx: 0, dy: 0, vx: 0, vy: 0 });
      trail2.push({ x: p2.x, y: p2.y, z: p2.z, dx: 0, dy: 0, vx: 0, vy: 0 });
      if (trail1.length > MAX_POINTS) trail1.shift();
      if (trail2.length > MAX_POINTS) trail2.shift();
      p3 = step(p3);
      trail3.push({ x: p3.x, y: p3.y, z: p3.z, dx: 0, dy: 0, vx: 0, vy: 0 });
      if (trail3.length > MAX_POINTS) trail3.shift();
    }
    draw(now);
    rafId = window.requestAnimationFrame(loop);
  }
  rafId = window.requestAnimationFrame(loop);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = window.requestAnimationFrame(loop);
    }
  });
}

