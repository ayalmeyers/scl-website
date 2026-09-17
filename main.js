// Strategic Communication Lab — shared interactions
// Minimal, quiet motion in the spirit of a slow editorial scroll.

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
    toggle.addEventListener("click", function () {
      links.classList.toggle("is-open");
      document.body.classList.toggle("nav-open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("is-open");
        document.body.classList.remove("nav-open");
      });
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

  // Mark current nav link active
  var path = window.location.pathname.replace(/\/index\.html$/, "/");
  document.querySelectorAll(".nav-links a[data-nav]").forEach(function (a) {
    var target = a.getAttribute("href");
    if (target === path || (target !== "/" && path.indexOf(target) === 0)) {
      a.classList.add("is-active");
    }
  });

  // ---------------------------------------------------------------------
  // Who We Are: the team roster. A single shared photo panel swaps to
  // whichever row is hovered/focused (previewing, non-destructive); the
  // "selected" row — last clicked, or the first row by default — keeps
  // a dot marker and bold name, and is what the panel reverts to once
  // the pointer leaves the list. Clicking a row also expands its bio
  // directly beneath it, one at a time.
  // ---------------------------------------------------------------------
  var rosterList = document.getElementById("roster-list");
  var rosterPhotoImg = document.getElementById("roster-photo-img");
  if (rosterList && rosterPhotoImg) {
    var rosterRows = Array.prototype.slice.call(rosterList.querySelectorAll("[data-roster-row]"));
    var selectedRosterRow = rosterRows[0] || null;

    function showRosterPhoto(row) {
      var src = row && row.getAttribute("data-photo");
      if (src) rosterPhotoImg.src = src;
    }

    function selectRosterRow(row) {
      if (selectedRosterRow) selectedRosterRow.classList.remove("is-selected");
      row.classList.add("is-selected");
      selectedRosterRow = row;
    }

    function closeRosterRow(row) {
      row.classList.remove("is-open");
      var btn = row.querySelector("[data-roster-trigger]");
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    var openRosterRow = null;
    function toggleRosterRow(row) {
      if (openRosterRow && openRosterRow !== row) closeRosterRow(openRosterRow);
      var btn = row.querySelector("[data-roster-trigger]");
      if (row.classList.contains("is-open")) {
        closeRosterRow(row);
        openRosterRow = null;
      } else {
        row.classList.add("is-open");
        if (btn) btn.setAttribute("aria-expanded", "true");
        openRosterRow = row;
      }
    }

    rosterRows.forEach(function (row) {
      var btn = row.querySelector("[data-roster-trigger]");
      if (!btn) return;
      btn.addEventListener("mouseenter", function () { showRosterPhoto(row); });
      btn.addEventListener("focus", function () { showRosterPhoto(row); });
      btn.addEventListener("click", function () {
        selectRosterRow(row);
        toggleRosterRow(row);
      });
    });
    rosterList.addEventListener("mouseleave", function () {
      showRosterPhoto(selectedRosterRow);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && openRosterRow) {
        closeRosterRow(openRosterRow);
        openRosterRow = null;
      }
    });
  }

  initAttractorBackground();
  initClock();
  initContactDrawer();
  initCursorDot();
  initFlowScroll();
  initVideoCards();
});

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
      iframe.title = poster.closest(".video-card").querySelector("h3").textContent;
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

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
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
  document.body.classList.add("custom-cursor-active");

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

  function frame() {
    current.x += (target.x - current.x) * 0.35;
    current.y += (target.y - current.y) * 0.35;
    dot.style.left = current.x + "px";
    dot.style.top = current.y + "px";
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
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
      "  <h2>Tell us about your goals</h2>" +
      '  <p class="sub">The more context you share, the faster we can match you with the right consultant.</p>' +
      '  <form id="contact-form" novalidate>' +
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
      '        <label for="interest">Subject</label>' +
      '        <select id="interest" name="interest">' +
      '          <option value="">Select an area (optional)</option>' +
      '          <option value="Executive Coaching">Executive Coaching</option>' +
      '          <option value="Leadership Counsel">Leadership Counsel</option>' +
      '          <option value="Strategic Communication Consulting">Strategic Communication Consulting</option>' +
      '          <option value="Media &amp; Pitch Training">Media &amp; Pitch Training</option>' +
      '          <option value="Speaking / Facilitation">Speaking / Facilitation</option>' +
      '          <option value="Careers at SCL">Careers at SCL</option>' +
      '          <option value="Other">Other</option>' +
      "        </select>" +
      "      </div>" +
      '      <div class="full">' +
      '        <label for="message">Message*</label>' +
      '        <textarea id="message" name="message" required></textarea>' +
      "      </div>" +
      "    </div>" +
      '    <div class="hp-field" aria-hidden="true">' +
      '      <label for="website">Leave this field blank</label>' +
      '      <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />' +
      "    </div>" +
      '    <label class="consent-row">' +
      '      <input type="checkbox" id="consent" name="consent" required />' +
      "      <span>I agree to be contacted about my enquiry.</span>" +
      "    </label>" +
      '    <div class="drawer-submit-row">' +
      '      <p id="form-note"></p>' +
      '      <button type="submit" class="drawer-send">Send <span class="key">↳</span></button>' +
      "    </div>" +
      "  </form>" +
      "</div>"
    );
  }

  // ---- Lead-routing config ----
  // Routes through FormSubmit (https://formsubmit.co) rather than the
  // originally-planned Power Automate flow: Power Automate needs a flow
  // built inside SCL's own Microsoft 365 tenant, which this session has
  // no access to, while FormSubmit needs no account at all — just point
  // it at the destination address. The one manual step is on the SCL
  // side: FormSubmit emails admin@scl.us.com a one-time "confirm this
  // form" link the first time a submission comes through, and every
  // submission after that confirmation click is delivered automatically.
  var SCL_LEAD_SUBJECT = "[SCL Website Lead] New Contact Form Submission";
  var SCL_FORM_ENDPOINT = "https://formsubmit.co/ajax/admin@scl.us.com";

  function wireForm() {
    var form = document.querySelector("#contact-form");
    if (!form) return;
    var honeypotEl = document.querySelector("#website");
    var consentEl = document.querySelector("#consent");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.querySelector("#form-note");

      // Honeypot tripped — behave as a bot would expect (quiet success)
      // without actually processing anything further.
      if (honeypotEl && honeypotEl.value) {
        if (note) {
          note.className = "is-success";
          note.textContent = "Thank you — your message has been noted.";
        }
        form.reset();
        return;
      }

      var nameEl = document.querySelector("#name");
      var emailEl = document.querySelector("#email");
      var messageEl = document.querySelector("#message");
      var missing = [nameEl, emailEl, messageEl].some(function (el) {
        return el && !el.value.trim();
      });
      if (missing) {
        if (note) {
          note.className = "is-error";
          note.textContent = "Please fill in your name, email, and message before sending.";
        }
        return;
      }

      if (consentEl && !consentEl.checked) {
        if (note) {
          note.className = "is-error";
          note.textContent = "Please confirm you agree to be contacted before sending.";
        }
        return;
      }

      var submitterEmail = emailEl.value.trim();
      var payload = {
        _subject: SCL_LEAD_SUBJECT,
        _replyto: submitterEmail,
        _captcha: "false",
        _template: "table",
        name: nameEl.value.trim(),
        company: document.querySelector("#company").value.trim(),
        email: submitterEmail,
        phone: document.querySelector("#phone").value.trim(),
        interest: document.querySelector("#interest").value,
        message: messageEl.value.trim(),
        submittedAt: new Date().toISOString()
      };

      if (note) {
        note.className = "is-pending";
        note.textContent = "Sending…";
      }

      fetch(SCL_FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Delivery failed");
          if (note) {
            note.className = "is-success";
            note.textContent =
              "Success! Your message is on its way — a consultant will follow up within one business day.";
          }
          form.reset();
        })
        .catch(function () {
          if (note) {
            note.className = "is-error";
            note.textContent =
              "We couldn't confirm delivery just now — please call 1-877-266-6522 so we don't miss you.";
          }
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

  function openDrawer() {
    build();
    scrim.classList.add("is-open");
    drawer.classList.add("is-open");
    document.body.classList.add("contact-drawer-locked");
    window.requestAnimationFrame(function () {
      var nameEl = document.querySelector("#name");
      if (nameEl) nameEl.focus({ preventScroll: true });
    });
  }

  function closeDrawer() {
    if (isContactPage) {
      window.location.href = "index.html";
      return;
    }
    if (scrim) scrim.classList.remove("is-open");
    if (drawer) drawer.classList.remove("is-open");
    document.body.classList.remove("contact-drawer-locked");
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
    openDrawer();
  });

  if (isContactPage) {
    openDrawer();
  }
}

// ---------------------------------------------------------------------
// Live clock readout in the header, e.g. "CEST 14:32".
// ---------------------------------------------------------------------
function initClock() {
  var el = document.getElementById("hdr-clock");
  if (!el) return;
  function tick() {
    var d = new Date();
    var tz = (d.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop() || "").toUpperCase();
    var h = String(d.getHours()).padStart(2, "0");
    var m = String(d.getMinutes()).padStart(2, "0");
    el.textContent = tz + " " + h + ":" + m;
  }
  tick();
  setInterval(tick, 15000);
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

  var MAX_POINTS = 24000;
  var trail1 = [];
  var trail2 = [];

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
    }
    // Pre-compute a long run instantly so the page doesn't open on an
    // empty canvas — matches the fully-formed butterfly seen on load.
    for (var i = 0; i < MAX_POINTS; i++) {
      p1 = step(p1);
      p2 = step(p2);
      trail1.push({ x: p1.x, y: p1.y, z: p1.z });
      trail2.push({ x: p2.x, y: p2.y, z: p2.z });
    }
  }
  seedTrail();

  // "Riffs": small extra Lorenz trajectories seeded near the cursor on
  // hover, so moving the mouse stirs up little chaotic curls of its own
  // — a nod to the system's sensitive dependence on initial conditions.
  // Each one runs forward under the exact same equations as the main
  // trails, then fades out and is discarded.
  var riffs = [];
  var lastRiffAt = 0;
  var lastRiffPos = null;
  var RIFF_LIFE_MS = 2600;
  var lastCam = { angle: 0, tilt: 0.35, scale: 1, cx: 0, cy: 0 };

  function invertProject(mx, my) {
    // Approximate inverse of project() for a point with ry = 0 — good
    // enough to seed a riff visually near the cursor; the riff's own
    // chaotic evolution does the rest.
    var cam = lastCam;
    var rx = (mx - cam.cx) / cam.scale;
    var rz = 25 - (my - cam.cy) / cam.scale;
    var cosA = Math.cos(cam.angle), sinA = Math.sin(cam.angle);
    var x = rx * cosA;
    var y = -rx * sinA;
    var cosT = Math.cos(cam.tilt) || 1;
    var z = rz / cosT;
    return { x: x, y: y, z: z };
  }

  function maybeSpawnRiff(mx, my) {
    if (reduceMotion || coarsePointer) return;
    var now = performance.now();
    if (now - lastRiffAt < 150) return;
    if (lastRiffPos) {
      var dx = mx - lastRiffPos.x, dy = my - lastRiffPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 16) return;
    }
    lastRiffAt = now;
    lastRiffPos = { x: mx, y: my };
    if (riffs.length >= 5) riffs.shift();
    var base = invertProject(mx, my);
    var jitter = 0.4;
    riffs.push({
      p: {
        x: base.x + (Math.random() - 0.5) * jitter,
        y: base.y + (Math.random() - 0.5) * jitter,
        z: base.z + (Math.random() - 0.5) * jitter
      },
      trail: [],
      born: now
    });
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      maybeSpawnRiff(e.clientX, e.clientY);
    },
    { passive: true }
  );

  var scrollY = window.scrollY || 0;
  window.addEventListener(
    "scroll",
    function () {
      scrollY = window.scrollY || 0;
    },
    { passive: true }
  );

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
      var proj = project(trail[i], angle, tilt, scale, cx, cy);
      if (prev) {
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(proj.x, proj.y);
      }
      prev = proj;
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

  function draw(t) {
    ctx.clearRect(0, 0, width, height);

    // Measured against the reference recording: its camera angle is
    // driven by scroll position only — holding still and just moving
    // the mouse around for 10s produced zero change in the attractor's
    // shape/orientation (confirmed via pixel bounding-box comparison
    // across the whole clip). So no time-based auto-rotation and no
    // pointer-driven angle/tilt here, unlike the earlier version.
    var angle = scrollY * 0.0006;
    var tilt = 0.35;

    // 0.017 -> ~0.021: the reference's attractor fills close to its
    // full available height (~97%) and a meaningfully wider slice of
    // the viewport (~46%) than this produced (~80% / ~36%, measured the
    // same way — bounding box of matching gold pixels as a fraction of
    // the content area) before this change.
    var scale = Math.min(width, height) * 0.021;
    // Slowly drift side to side (time + scroll driven) rather than
    // sitting statically at one horizontal spot — large as the
    // attractor is, this keeps it from parking itself under the same
    // patch of text for the whole time a section is in view.
    var driftFrac = 0.58 + 0.08 * Math.sin(t * 0.00006 + scrollY * 0.0004);
    var cx = width * driftFrac;
    var cy = height * 0.5;

    lastCam.angle = angle;
    lastCam.tilt = tilt;
    lastCam.scale = scale;
    lastCam.cx = cx;
    lastCam.cy = cy;

    // Warm gold on the near-black page, additive-blended (see drawTrail)
    // so the two nearby trails' overlap brightens like the reference.
    drawTrail(trail1, angle, tilt, scale, cx, cy, "rgba(217,172,82,0.32)");
    drawTrail(trail2, angle, tilt, scale, cx, cy, "rgba(184,140,58,0.18)");

    for (var i = 0; i < riffs.length; i++) {
      var r = riffs[i];
      var age = (t - r.born) / RIFF_LIFE_MS;
      var alpha = Math.max(0, 0.55 * (1 - age));
      if (alpha <= 0.004) continue;
      drawTrail(r.trail, angle, tilt, scale, cx, cy, "rgba(159,224,184," + alpha.toFixed(3) + ")");
    }
  }

  if (reduceMotion) {
    draw(0);
    return;
  }

  var RIFF_MAX_POINTS = 260;
  var rafId = null;
  function loop(now) {
    for (var i = 0; i < stepsPerFrame; i++) {
      p1 = step(p1);
      p2 = step(p2);
      trail1.push({ x: p1.x, y: p1.y, z: p1.z });
      trail2.push({ x: p2.x, y: p2.y, z: p2.z });
      if (trail1.length > MAX_POINTS) trail1.shift();
      if (trail2.length > MAX_POINTS) trail2.shift();

      for (var j = riffs.length - 1; j >= 0; j--) {
        var r = riffs[j];
        if (now - r.born > RIFF_LIFE_MS) {
          riffs.splice(j, 1);
          continue;
        }
        r.p = step(r.p);
        r.trail.push({ x: r.p.x, y: r.p.y, z: r.p.z });
        if (r.trail.length > RIFF_MAX_POINTS) r.trail.shift();
      }
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
