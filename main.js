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

  // Contact form: static hosting has no backend — show a quiet confirmation.
  var form = document.querySelector("#contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.querySelector("#form-note");
      if (note) {
        note.textContent =
          "Thank you — your message has been noted. This is a static preview site, so for now please reach us directly at the phone number above while the contact form is connected.";
        note.classList.add("is-visible");
      }
      form.reset();
    });
  }

  initFlowingBackground();
});

// ---------------------------------------------------------------------
// Flowing interactive background
// A slow, continuous field of soft light drifting behind the whole page,
// nudged by scroll position and pointer movement — the ambient "moves
// with the page" effect. Kept intentionally quiet: a few large, heavily
// feathered blobs, low alpha, no hard edges.
// ---------------------------------------------------------------------
function initFlowingBackground() {
  var canvas = document.getElementById("bg-flow");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var width = 0, height = 0;
  var docHeight = 0;

  var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  var scrollY = window.scrollY || 0;

  // Each blob drifts along its own slow, looping orbit (Lissajous-style)
  // and is nudged slightly by scroll depth and pointer position.
  var blobs = [
    { bx: 0.18, by: 0.22, r: 0.55, sx: 0.017, sy: 0.013, px: 0,   py: 1.7, parallax: 0.06, alpha: 0.16 },
    { bx: 0.82, by: 0.16, r: 0.48, sx: 0.011, sy: 0.019, px: 1.1, py: 0,   parallax: 0.10, alpha: 0.14 },
    { bx: 0.5,  by: 0.65, r: 0.62, sx: 0.014, sy: 0.010, px: 2.3, py: 0.6, parallax: 0.14, alpha: 0.12 },
    { bx: 0.85, by: 0.85, r: 0.5,  sx: 0.020, sy: 0.016, px: 0.4, py: 2.1, parallax: 0.18, alpha: 0.13 }
  ];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    docHeight = Math.max(document.documentElement.scrollHeight, height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener(
    "scroll",
    function () {
      scrollY = window.scrollY || 0;
    },
    { passive: true }
  );

  window.addEventListener(
    "pointermove",
    function (e) {
      pointer.tx = e.clientX / width;
      pointer.ty = e.clientY / height;
    },
    { passive: true }
  );

  function draw(t) {
    ctx.clearRect(0, 0, width, height);

    // Ease pointer toward its target for a soft, trailing feel.
    pointer.x += (pointer.tx - pointer.x) * 0.03;
    pointer.y += (pointer.ty - pointer.y) * 0.03;

    var scrollFrac = docHeight > height ? scrollY / (docHeight - height) : 0;

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var wob = Math.min(width, height);
      var x =
        b.bx * width +
        Math.sin(t * b.sx + b.px) * wob * 0.14 +
        (pointer.x - 0.5) * wob * b.parallax;
      var y =
        b.by * height +
        Math.cos(t * b.sy + b.py) * wob * 0.14 +
        (pointer.y - 0.5) * wob * b.parallax +
        (scrollFrac - 0.5) * height * b.parallax * 1.4;
      var radius = wob * b.r;

      var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, "rgba(245,244,240," + b.alpha + ")");
      g.addColorStop(0.55, "rgba(245,244,240," + b.alpha * 0.35 + ")");
      g.addColorStop(1, "rgba(245,244,240,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (reduceMotion) {
    // Respect reduced-motion: render one still frame, no animation loop.
    draw(0);
    return;
  }

  var rafId = null;
  function loop(now) {
    draw(now * 0.001 * 8); // scale time so the drift stays gentle
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
