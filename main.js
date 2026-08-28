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
  // Who We Are: click a team card to open a shared bio panel with photo,
  // role, and full biography (sourced from each card's inline <template>).
  // ---------------------------------------------------------------------
  var teamCards = document.querySelectorAll("[data-team-card]");
  var teamBio = document.querySelector("#team-bio");
  if (teamCards.length && teamBio) {
    var teamBioPhoto = document.querySelector("#team-bio-photo");
    var teamBioRole = document.querySelector("#team-bio-role");
    var teamBioName = document.querySelector("#team-bio-name");
    var teamBioText = document.querySelector("#team-bio-text");
    var teamBioClose = document.querySelector("#team-bio-close");
    var activeCard = null;

    function initials(name) {
      return name
        .split(/\s+/)
        .map(function (w) { return w.replace(/[^A-Za-z]/g, "").charAt(0); })
        .join("")
        .toUpperCase();
    }

    function closeBio() {
      teamBio.classList.remove("is-open");
      if (activeCard) {
        activeCard.classList.remove("is-active");
        activeCard.setAttribute("aria-expanded", "false");
      }
      activeCard = null;
    }

    function openBio(card) {
      var name = card.querySelector("h3") ? card.querySelector("h3").textContent : "";
      var role = card.getAttribute("data-role") || "";
      var photo = card.getAttribute("data-photo") || "";
      var tpl = card.querySelector("template");

      teamBioName.textContent = name;
      teamBioRole.textContent = role;
      teamBioText.innerHTML = tpl ? tpl.innerHTML : "";

      if (photo) {
        teamBioPhoto.innerHTML = "";
        var img = document.createElement("img");
        img.src = photo;
        img.alt = name;
        img.loading = "lazy";
        teamBioPhoto.appendChild(img);
      } else {
        teamBioPhoto.textContent = initials(name);
        teamBioPhoto.style.display = "flex";
        teamBioPhoto.style.alignItems = "center";
        teamBioPhoto.style.justifyContent = "center";
        teamBioPhoto.style.fontFamily = "var(--display)";
        teamBioPhoto.style.fontWeight = "500";
        teamBioPhoto.style.fontSize = "2.6rem";
        teamBioPhoto.style.color = "var(--green)";
      }

      if (activeCard && activeCard !== card) {
        activeCard.classList.remove("is-active");
        activeCard.setAttribute("aria-expanded", "false");
      }
      card.classList.add("is-active");
      card.setAttribute("aria-expanded", "true");
      activeCard = card;
      teamBio.classList.add("is-open");

      window.requestAnimationFrame(function () {
        var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        teamBio.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      });
    }

    teamCards.forEach(function (card) {
      card.setAttribute("aria-expanded", "false");
      card.addEventListener("click", function () {
        if (activeCard === card) {
          closeBio();
        } else {
          openBio(card);
        }
      });
    });

    if (teamBioClose) teamBioClose.addEventListener("click", closeBio);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && activeCard) closeBio();
    });
  }

  // ---------------------------------------------------------------------
  // Lead-routing config.
  //
  // SCL_LEAD_SUBJECT is the standard subject line every real lead email
  // should carry. Power Automate (or any mail-rule tool) can then filter
  // on this exact string to route the message — e.g. into a "Sales"
  // bucket in Microsoft Planner. See the setup guide for the two-flow
  // recipe (HTTP trigger -> send email, then email arrival -> create
  // Planner task).
  //
  // POWER_AUTOMATE_ENDPOINT is intentionally blank. This site is static
  // (GitHub Pages) and has no server of its own, so until this is set to
  // a real Power Automate "When an HTTP request is received" URL, the
  // form cannot actually deliver anywhere — it only shows the on-page
  // confirmation message below. Paste the flow's HTTP POST URL here once
  // it exists to make submissions real.
  // ---------------------------------------------------------------------
  var SCL_LEAD_SUBJECT = "[SCL Website Lead] New Contact Form Submission";
  var POWER_AUTOMATE_ENDPOINT = "";

  // "I'm reaching out about" toggle: routes vendors/salespeople away from
  // the real lead form entirely, toward a deliberately unmonitored address.
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

  // Vendor/pitch gate: a second, independent bot filter (its own
  // honeypot-free math check) so the deflected "sell to us" path is
  // guarded the same way the real contact form is, even though nothing
  // it collects is ever sent anywhere.
  var vendorChallengeEl = document.querySelector("#vendor-challenge");
  var vendorAnswerEl = document.querySelector("#vendor-captcha-answer");
  var vendorErrorEl = document.querySelector("#vendor-captcha-error");
  var vendorRevealBtn = document.querySelector("#vendor-reveal-btn");
  var vendorEmailEl = document.querySelector("#vendor-email");
  var vendorGateEl = document.querySelector("#vendor-gate");
  var vendorExpectedSum = 0;
  function newVendorChallenge(keepError) {
    var a = 2 + Math.floor(Math.random() * 8);
    var b = 2 + Math.floor(Math.random() * 8);
    vendorExpectedSum = a + b;
    if (vendorChallengeEl) vendorChallengeEl.textContent = a + " + " + b;
    if (vendorAnswerEl) vendorAnswerEl.value = "";
    if (!keepError && vendorErrorEl) vendorErrorEl.classList.remove("is-shown");
  }
  if (vendorChallengeEl) newVendorChallenge();
  if (vendorRevealBtn) {
    vendorRevealBtn.addEventListener("click", function () {
      var answer = vendorAnswerEl ? parseInt(vendorAnswerEl.value, 10) : NaN;
      if (answer !== vendorExpectedSum) {
        if (vendorErrorEl) vendorErrorEl.classList.add("is-shown");
        newVendorChallenge(true);
        if (vendorAnswerEl) vendorAnswerEl.focus();
        return;
      }
      if (vendorEmailEl) vendorEmailEl.hidden = false;
      if (vendorGateEl) vendorGateEl.hidden = true;
    });
  }

  // Contact form: static hosting has no backend of its own — submissions
  // POST to POWER_AUTOMATE_ENDPOINT once it's configured (see above), and
  // always show a quiet on-page confirmation either way. A lightweight,
  // dependency-free spam guard runs first: a honeypot field real visitors
  // never see or fill, plus a simple arithmetic check that stops basic
  // scripted submissions without requiring any third-party CAPTCHA
  // service or key.
  var form = document.querySelector("#contact-form");
  if (form) {
    var challengeEl = document.querySelector("#captcha-challenge");
    var answerEl = document.querySelector("#captcha-answer");
    var captchaErrorEl = document.querySelector("#captcha-error");
    var refreshBtn = document.querySelector("#captcha-refresh");
    var honeypotEl = document.querySelector("#website");
    var expectedSum = 0;

    function newChallenge(keepError) {
      var a = 2 + Math.floor(Math.random() * 8);
      var b = 2 + Math.floor(Math.random() * 8);
      expectedSum = a + b;
      if (challengeEl) challengeEl.textContent = a + " + " + b;
      if (answerEl) answerEl.value = "";
      if (!keepError && captchaErrorEl) captchaErrorEl.classList.remove("is-shown");
    }
    if (challengeEl) newChallenge();
    if (refreshBtn) refreshBtn.addEventListener("click", function () { newChallenge(false); });

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

      // Basic required-field check (the form uses novalidate so this
      // custom messaging stays visually consistent with the rest of the
      // page instead of the browser's default validation bubbles).
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

      // Arithmetic check.
      var answer = answerEl ? parseInt(answerEl.value, 10) : NaN;
      if (answer !== expectedSum) {
        if (captchaErrorEl) captchaErrorEl.classList.add("is-shown");
        if (note) {
          note.className = "is-error";
          note.textContent = "Please double-check the verification question above.";
        }
        newChallenge(true);
        if (answerEl) answerEl.focus();
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
          // Network/flow error: the on-page message below still shows a
          // confirmation, so also surface the phone number as a fallback.
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
          ? "Thank you — your message is on its way. A consultant will follow up within one business day."
          : "Thank you — your message has been noted. This is a static preview site, so for now please reach us directly at the phone number above while the contact form is connected.";
      }
      form.reset();
      newChallenge();
    });
  }

  initAttractorBackground();
  initClock();
  initWeightedScroll();
});

// ---------------------------------------------------------------------
// Weighted scroll: gives wheel-driven scrolling a sense of mass — the
// page eases toward each new position instead of jumping the full wheel
// delta in one frame, so quick flicks feel like they carry momentum and
// settle rather than snap. Desktop wheel input only (touchscreens already
// have native momentum scrolling, and adding a second layer of easing on
// top fights it); fully skipped under prefers-reduced-motion. Because it
// drives the *real* window.scrollTo rather than transforming the DOM,
// window.scrollY stays accurate for the reveal observer, header, and
// Lorenz-attractor camera below.
// ---------------------------------------------------------------------
function initWeightedScroll() {
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  if (reducedMotion || coarsePointer) return;

  var current = window.scrollY;
  var target = current;
  var raf = null;
  var EASE = 0.11;
  var syncTimer = null;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function frame() {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.4) current = target;
    window.scrollTo(0, current);
    raf = current !== target ? window.requestAnimationFrame(frame) : null;
  }

  window.addEventListener(
    "wheel",
    function (e) {
      if (e.ctrlKey) return; // leave pinch-zoom untouched
      e.preventDefault();
      var delta = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      target = Math.min(maxScroll(), Math.max(0, target + delta));
      if (!raf) raf = window.requestAnimationFrame(frame);
    },
    { passive: false }
  );

  window.addEventListener("resize", function () {
    target = Math.min(maxScroll(), target);
  });

  // If the page moves by some other means (anchor jump, keyboard, browser
  // back/forward), resync our virtual position once scrolling settles so
  // the next wheel tick continues from the real spot instead of yanking
  // the page back to a stale target.
  window.addEventListener(
    "scroll",
    function () {
      if (raf) return;
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(function () {
        current = window.scrollY;
        target = current;
      }, 60);
    },
    { passive: true }
  );
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
