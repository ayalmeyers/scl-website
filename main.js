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
  // Who We Are: click a team card to expand it inline, right where it
  // was clicked — the photo scales in and the bio opens beneath it.
  // Only one card is expanded at a time.
  // ---------------------------------------------------------------------
  var teamCardWraps = document.querySelectorAll(".team-card-wrap");
  if (teamCardWraps.length) {
    var activeWrap = null;

    function closeWrap(wrap) {
      wrap.classList.remove("is-active");
      var btn = wrap.querySelector("[data-team-card]");
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    function openWrap(wrap) {
      if (activeWrap && activeWrap !== wrap) closeWrap(activeWrap);
      wrap.classList.add("is-active");
      var btn = wrap.querySelector("[data-team-card]");
      if (btn) btn.setAttribute("aria-expanded", "true");
      activeWrap = wrap;
      window.requestAnimationFrame(function () {
        var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        wrap.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      });
    }

    teamCardWraps.forEach(function (wrap) {
      var btn = wrap.querySelector("[data-team-card]");
      if (!btn) return;
      btn.addEventListener("click", function () {
        if (wrap.classList.contains("is-active")) {
          closeWrap(wrap);
          activeWrap = null;
        } else {
          openWrap(wrap);
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && activeWrap) {
        closeWrap(activeWrap);
        activeWrap = null;
      }
    });
  }

  initAttractorBackground();
  initClock();
  initContactDrawer();
});

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
      '<div class="contact-drawer-top">' +
      '  <span class="eyebrow">Get In Touch</span>' +
      '  <button type="button" class="drawer-close" id="drawer-close">Close <span class="key">↵</span></button>' +
      "</div>" +
      '<fieldset class="reason-toggle">' +
      "  <legend>I&#39;m reaching out about</legend>" +
      '  <label class="reason-option"><input type="radio" name="reason" value="client" id="reason-client" checked /><span>Working with SCL</span></label>' +
      '  <label class="reason-option"><input type="radio" name="reason" value="vendor" id="reason-vendor" /><span>Selling something to SCL</span></label>' +
      "</fieldset>" +
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
      "</div>" +
      '<div id="vendor-panel" hidden>' +
      "  <h2>Have something to sell?</h2>" +
      '  <p class="sub">We&#39;re always excited by new ideas, but we won&#39;t respond to pitches through this form. Please send your proposal to the address below instead.</p>' +
      '  <p class="vendor-email"><a href="mailto:newideas@vendor-pitches.example">newideas@vendor-pitches.example</a></p>' +
      "</div>"
    );
  }

  // ---- Lead-routing config (see previous inline comment for context). ----
  var SCL_LEAD_SUBJECT = "[SCL Website Lead] New Contact Form Submission";
  var POWER_AUTOMATE_ENDPOINT = "";

  function wireForm() {
    var reasonClient = document.querySelector("#reason-client");
    var reasonVendor = document.querySelector("#reason-vendor");
    var clientPanel = document.querySelector("#client-panel");
    var vendorPanel = document.querySelector("#vendor-panel");
    function applyReason() {
      var isVendor = reasonVendor && reasonVendor.checked;
      if (clientPanel) clientPanel.hidden = !!isVendor;
      if (vendorPanel) vendorPanel.hidden = !isVendor;
    }
    if (reasonClient && reasonVendor) {
      reasonClient.addEventListener("change", applyReason);
      reasonVendor.addEventListener("change", applyReason);
      applyReason();
    }

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

      var payload = {
        subject: SCL_LEAD_SUBJECT,
        name: nameEl.value.trim(),
        company: document.querySelector("#company").value.trim(),
        email: emailEl.value.trim(),
        phone: document.querySelector("#phone").value.trim(),
        interest: document.querySelector("#interest").value,
        message: messageEl.value.trim(),
        submittedAt: new Date().toISOString()
      };

      if (POWER_AUTOMATE_ENDPOINT) {
        fetch(POWER_AUTOMATE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(function () {
          if (note) {
            note.className = "is-error";
            note.textContent =
              "We couldn't confirm delivery just now — please call 1-877-266-6522 so we don't miss you.";
          }
        });
      }

      if (note && note.className !== "is-error") {
        note.className = "is-success";
        note.textContent = POWER_AUTOMATE_ENDPOINT
          ? "Success! Your message is on its way — a consultant will follow up within one business day."
          : "Success! Your message has been noted. This is a static preview site, so for now please reach us directly at the phone number above while the contact form is connected.";
      }
      form.reset();
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

  var pointer = { tx: 0.5, ty: 0.5, x: 0.5, y: 0.5 };
  window.addEventListener(
    "pointermove",
    function (e) {
      pointer.tx = e.clientX / width;
      pointer.ty = e.clientY / height;
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
    ctx.stroke();
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);

    pointer.x += (pointer.tx - pointer.x) * 0.02;
    pointer.y += (pointer.ty - pointer.y) * 0.02;

    var autoAngle = t * 0.00003;
    var scrollAngle = scrollY * 0.0006;
    var angle = autoAngle + scrollAngle + (pointer.x - 0.5) * 0.3;
    var tilt = 0.35 + (pointer.y - 0.5) * 0.2;

    var scale = Math.min(width, height) * 0.017;
    var cx = width * 0.58;
    var cy = height * 0.5;

    // Light background: normal alpha blending (not additive "lighter")
    // so overlapping strokes deepen into a richer dark blue, the way
    // overlapping pen strokes darken on paper.
    drawTrail(trail1, angle, tilt, scale, cx, cy, "rgba(29,53,87,0.4)");
    drawTrail(trail2, angle, tilt, scale, cx, cy, "rgba(44,77,120,0.22)");
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
      trail1.push({ x: p1.x, y: p1.y, z: p1.z });
      trail2.push({ x: p2.x, y: p2.y, z: p2.z });
      if (trail1.length > MAX_POINTS) trail1.shift();
      if (trail2.length > MAX_POINTS) trail2.shift();
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
