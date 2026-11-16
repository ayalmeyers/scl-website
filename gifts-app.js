/* SCL Gifts storefront for gifts.html.
   Derived from js/app.js in ayalmeyers/scl-gifts: same cart, item dialog,
   checkout form and order email. Only the class names "hero" and "steps"
   and the page heading level changed, so they do not collide with
   style.css. It loads after gifts-access.js decrypts the catalog and the
   order settings into window.SCL_GIFTS_CONFIG and window.SCL_GIFTS_PRODUCTS.
   When the store changes in scl-gifts, copy the change here. */
/* SCL Gifts — storefront app (no build step, no dependencies). */
(function () {
  "use strict";

  var CFG = window.SCL_GIFTS_CONFIG || {};
  var PRODUCTS = (window.SCL_GIFTS_PRODUCTS || []).filter(function (p) { return p && p.id; });
  var BY_ID = {};
  PRODUCTS.forEach(function (p) { BY_ID[p.id] = p; });

  var CART_KEY = "sclgifts.cart.v1";
  var FORM_KEY = "sclgifts.form.v1";
  var REF_KEY = "sclgifts.ref.v1";
  var LAST_KEY = "sclgifts.last.v1";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- storage (wrapped: private mode / blocked storage) ---------- */
  function load(key, fallback, store) {
    try { var v = (store || localStorage).getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value, store) {
    try { (store || localStorage).setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function drop(key, store) {
    try { (store || localStorage).removeItem(key); } catch (e) {}
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function prettyDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function orderId() {
    var d = new Date();
    var stamp = String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate());
    var rand = "";
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var buf = new Uint32Array(5);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < 5; i++) rand += chars[buf[i] % chars.length];
    return "SCL-" + stamp + "-" + rand;
  }
  function optionText(opts) {
    return Object.keys(opts || {}).map(function (k) { return k + ": " + opts[k]; }).join(" · ");
  }

  /* ---------- placeholder art for items without photos ---------- */
  var ICONS = {
    Apparel: "M38 22l12-6 8 6h8l8-6 12 6-6 14-8-3v35H44V33l-8 3z",
    Everyday: "M44 18h32l-4 60H48zM46 30h28",
    Desk: "M40 18h40v60H40zM48 18v60M56 32h16M56 40h16",
    Travel: "M30 38h60v36H30zM48 38v-8h24v8M30 52h60",
    Home: "M50 34c0-8 10-10 10-18 0 8 10 10 10 18M42 40h36v38H42z",
    default: "M32 40h56v38H32zM28 30h64v10H28zM60 30v48M60 30c-6-12-20-12-18-2M60 30c6-12 20-12 18-2"
  };
  function placeholder(p) {
    var tones = [["#22428f", "#4395d1"], ["#1b3470", "#3d7fc0"], ["#2a4f9e", "#6aaee0"], ["#173061", "#4b8fca"]];
    var t = tones[hash(p.id) % tones.length];
    var path = ICONS[p.category] || ICONS.default;
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + t[0] + '"/><stop offset="1" stop-color="' + t[1] + '"/></linearGradient></defs>' +
      '<rect width="120" height="150" fill="url(#g)"/>' +
      '<circle cx="104" cy="20" r="46" fill="#fff" opacity=".06"/>' +
      '<g transform="translate(0,22)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" opacity=".92">' +
      '<path d="' + path + '"/></g></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function hasPhoto(p) { return !!(p.images && p.images.length); }
  function cover(p) { return (p.images && p.images[0]) || placeholder(p); }
  function imgTag(src, p, cls, eager) {
    return '<img class="' + (cls || "") + '" src="' + esc(src) + '" alt="' + esc(p.name) + '"' +
      (eager ? "" : ' loading="lazy"') + ' onerror="this.onerror=null;this.src=\'' + placeholder(p) + '\'">';
  }

  /* ---------- cart ---------- */
  var cart = load(CART_KEY, []).filter(function (l) { return BY_ID[l.id]; });

  function lineKey(id, opts, note) { return id + "|" + JSON.stringify(opts || {}) + "|" + (note || ""); }
  function totalQty() { return cart.reduce(function (n, l) { return n + l.qty; }, 0); }
  function remainingAllowance() { return CFG.maxItems ? Math.max(0, CFG.maxItems - totalQty()) : Infinity; }
  function persistCart() { save(CART_KEY, cart); renderCartBadge(); }

  function addToCart(id, opts, note, qty) {
    var room = remainingAllowance();
    if (room <= 0) { toast("You have reached the limit of " + CFG.maxItems + " item" + (CFG.maxItems === 1 ? "" : "s") + "."); return false; }
    qty = Math.min(qty, room);
    var key = lineKey(id, opts, note);
    var existing = cart.find(function (l) { return l.key === key; });
    var cap = CFG.maxQtyPerItem || 99;
    if (existing) existing.qty = Math.min(cap, existing.qty + qty);
    else cart.push({ key: key, id: id, opts: opts || {}, note: note || "", qty: Math.min(cap, qty) });
    persistCart();
    return true;
  }
  function setQty(key, qty) {
    var l = cart.find(function (x) { return x.key === key; });
    if (!l) return;
    var cap = CFG.maxQtyPerItem || 99;
    var room = remainingAllowance() + l.qty;
    l.qty = Math.max(1, Math.min(cap, room, qty));
    persistCart();
  }
  function removeLine(key) { cart = cart.filter(function (l) { return l.key !== key; }); persistCart(); }

  function renderCartBadge() {
    var n = totalQty();
    var bar = $("#nextbar");
    if (bar) {
      var onShop = !/^#\/(checkout|thanks)/.test(location.hash || "");
      bar.hidden = !(n > 0 && onShop);
      document.body.classList.toggle("has-nextbar", !bar.hidden);
      $("#nextbar-count").textContent = n + " item" + (n === 1 ? "" : "s");
    }
    var badge = $("#cart-count");
    badge.textContent = n;
    badge.classList.toggle("is-empty", n === 0);
    $("#cart-btn").setAttribute("aria-label", "Your selection, " + n + " item" + (n === 1 ? "" : "s"));
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  /* ---------- views ---------- */
  var activeFilter = "All";

  function shopView() {
    var cats = ["All"].concat(PRODUCTS.map(function (p) { return p.category; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; }));
    if (cats.indexOf(activeFilter) < 0) activeFilter = "All";
    var limitNote = CFG.maxItems
      ? '<p class="hero-note">Choose up to <strong>' + CFG.maxItems + "</strong> item" + (CFG.maxItems === 1 ? "" : "s") + ".</p>"
      : "";
    return (
      '<section class="g-hero">' +
        '<p class="eyebrow">' + esc(CFG.eyebrow || "") + "</p>" +
        '<h2 class="sr-only">' + esc(CFG.campaignName || "SCL Gifts") + "</h2>" +
        '<p class="hero-intro">' + esc(CFG.intro || "") + "</p>" + limitNote +
        '<ol class="g-steps" aria-label="How it works">' +
          "<li><span>1</span>Choose your gifts</li>" +
          "<li><span>2</span>Enter delivery details</li>" +
          "<li><span>3</span>Submit your selection</li>" +
        "</ol>" +
      "</section>" +
      '<section class="catalog" aria-labelledby="catalog-title">' +
        '<div class="catalog-head">' +
          '<h2 id="catalog-title">The collection</h2>' +
          (cats.length > 2
            ? '<div class="chips" role="group" aria-label="Filter by category">' +
                cats.map(function (c) {
                  return '<button type="button" class="chip' + (c === activeFilter ? " is-on" : "") + '" data-filter="' + esc(c) + '" aria-pressed="' + (c === activeFilter) + '">' + esc(c) + "</button>";
                }).join("") +
              "</div>"
            : "") +
        "</div>" +
        '<div class="grid" id="grid">' + gridHTML() + "</div>" +
      "</section>"
    );
  }

  function gridHTML() {
    var list = PRODUCTS.filter(function (p) { return activeFilter === "All" || p.category === activeFilter; });
    if (!list.length) return '<p class="empty">No gifts here yet.</p>';
    return list.map(function (p, i) {
      return (
        '<article class="card" style="--i:' + i + '">' +
          '<a class="card-link" href="#/item/' + encodeURIComponent(p.id) + '">' +
            '<div class="card-media' + (hasPhoto(p) ? " is-photo" : "") + '">' + imgTag(cover(p), p, "", i < 4) +
              (p.soldOut ? '<span class="flag">Unavailable</span>' : "") +
            "</div>" +
            '<div class="card-body">' +
              '<p class="card-cat">' + esc(p.category || "") + "</p>" +
              "<h3>" + esc(p.name) + "</h3>" +
              '<p class="card-blurb">' + esc(p.blurb || "") + "</p>" +
              '<span class="card-cta">' + (p.soldOut ? "View" : "Choose") + ' <span aria-hidden="true">→</span></span>' +
            "</div>" +
          "</a>" +
        "</article>"
      );
    }).join("");
  }

  /* ---------- item dialog ---------- */
  var lastFocus = null;

  /* ---------- logo thread (embroidered garments) ----------
     The SCL logo is embroidered with a dense, solid blue fill. On dark
     garments the guest may choose white thread instead. */
  function isDarkColor(name) {
    try { return new RegExp(CFG.darkColorPattern || "$^", "i").test(name || ""); }
    catch (e) { return false; }
  }
  function threadHTML(p) {
    if (!p.threadChoice) return "";
    var vals = CFG.threadOptions || ["SCL blue", "White"];
    var gid = "opt-thread";
    return (
      '<fieldset class="opt opt-thread" data-opt="Logo thread" data-thread hidden>' +
        '<legend>Logo thread <span class="opt-picked" id="' + gid + '-picked"></span></legend>' +
        '<p class="opt-note">' + esc(CFG.threadNote || "") + "</p>" +
        '<div class="swatches">' +
          vals.map(function (v, vi) {
            var vid = gid + "-" + vi;
            return '<input type="radio" id="' + vid + '" name="' + gid + '" value="' + esc(v) + '"' + (vi === 0 ? " checked" : "") + '>' +
                   '<label for="' + vid + '">' + esc(v) + "</label>";
          }).join("") +
        "</div>" +
      "</fieldset>"
    );
  }

  function openItem(id) {
    var p = BY_ID[id];
    if (!p) { location.hash = "#/"; return; }
    var imgs = (p.images && p.images.length) ? p.images : [placeholder(p)];
    var cap = Math.min(CFG.maxQtyPerItem || 99, remainingAllowance());
    var html =
      '<button class="icon-btn modal-close" type="button" data-close aria-label="Close">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6Z"/></svg>' +
      "</button>" +
      '<div class="modal-grid">' +
        '<div class="gallery">' +
          '<div class="gallery-main' + (hasPhoto(p) ? " is-photo" : "") + '">' + imgTag(imgs[0], p, "", true) + "</div>" +
          (imgs.length > 1
            ? '<div class="thumbs">' + imgs.map(function (src, i) {
                return '<button type="button" class="thumb' + (i === 0 ? " is-on" : "") + '" data-src="' + esc(src) + '" aria-label="Photo ' + (i + 1) + '">' + imgTag(src, p) + "</button>";
              }).join("") + "</div>"
            : "") +
        "</div>" +
        '<form class="item-form" id="item-form" novalidate>' +
          '<p class="card-cat">' + esc(p.category || "") + "</p>" +
          '<h2 id="modal-title">' + esc(p.name) + "</h2>" +
          '<p class="item-desc">' + esc(p.description || p.blurb || "") + "</p>" +
          (p.details && p.details.length ? '<ul class="details">' + p.details.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>" : "") +
          (p.options || []).map(function (o, oi) {
            var gid = "opt-" + oi;
            return (
              '<fieldset class="opt" data-opt="' + esc(o.name) + '">' +
                "<legend>" + esc(o.name) + ' <span class="opt-picked" id="' + gid + '-picked"></span></legend>' +
                '<div class="swatches">' +
                  o.values.map(function (v, vi) {
                    var vid = gid + "-" + vi;
                    return '<input type="radio" id="' + vid + '" name="' + gid + '" value="' + esc(v) + '"' + (o.values.length === 1 ? " checked" : "") + '>' +
                           '<label for="' + vid + '">' + esc(v) + "</label>";
                  }).join("") +
                "</div>" +
                '<p class="field-err" hidden>Please choose a ' + esc(o.name.toLowerCase()) + ".</p>" +
              "</fieldset>"
            );
          }).join("") +
          threadHTML(p) +
          (p.personalize
            ? '<div class="field">' +
                '<label for="personal">' + esc(p.personalize.label) + (p.personalize.required ? "" : ' <span class="optional">optional</span>') + "</label>" +
                '<input id="personal" name="personal" type="text" autocomplete="off" maxlength="' + (p.personalize.maxLength || 60) + '" placeholder="' + esc(p.personalize.placeholder || "") + '"' + (p.personalize.required ? " required" : "") + ">" +
                '<p class="field-err" hidden>Please fill this in.</p>' +
              "</div>"
            : "") +
          '<div class="buy-row">' +
            (cap > 1
              ? '<div class="qty" aria-label="Quantity">' +
                  '<button type="button" data-step="-1" aria-label="Decrease quantity">−</button>' +
                  '<input type="number" id="qty" value="1" min="1" max="' + cap + '" inputmode="numeric" aria-label="Quantity">' +
                  '<button type="button" data-step="1" aria-label="Increase quantity">+</button>' +
                "</div>"
              : '<input type="hidden" id="qty" value="1">') +
            (p.soldOut
              ? '<button class="btn" type="button" disabled>Unavailable</button>'
              : cap <= 0
                ? '<button class="btn" type="button" disabled>Selection limit reached</button>'
                : '<button class="btn btn-primary" type="submit">Add to selection</button>') +
          "</div>" +
          (p.soldOut || cap <= 0 ? "" : '<p class="add-hint">Adding an item does not send it. You will review your selection and submit your delivery details next.</p>') +
        "</form>" +
      "</div>";

    var modal = $("#modal");
    $("#modal-card").innerHTML = html;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(function () { modal.classList.add("is-open"); });
    var firstInput = $("#modal-card input:not([type=hidden]), #modal-card .btn-primary");
    ($(".modal-close") || firstInput).focus();

    $$(".thumb", modal).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".thumb", modal).forEach(function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on");
        $(".gallery-main img", modal).src = b.getAttribute("data-src");
      });
    });
    $$(".opt", modal).forEach(function (fs) {
      fs.addEventListener("change", function (e) {
        fs.querySelector(".opt-picked").textContent = "· " + e.target.value;
        fs.classList.remove("has-err");
        var fe = fs.querySelector(".field-err");
        if (fe) fe.hidden = true;
      });
    });
    var colorFs = $('.opt[data-opt="Color"]', modal);
    var threadFs = $("[data-thread]", modal);
    function syncColor() {
      var picked = colorFs && colorFs.querySelector("input:checked");
      var val = picked ? picked.value : "";
      if (p.colorImages && p.colorImages[val]) {
        var main = $(".gallery-main img", modal);
        if (main) {
          main.onerror = function () { this.onerror = null; this.src = placeholder(p); };
          main.src = p.colorImages[val];
        }
        $$(".thumb", modal).forEach(function (t) { t.classList.toggle("is-on", t.getAttribute("data-src") === p.colorImages[val]); });
      }
      if (threadFs) {
        var dark = isDarkColor(val);
        threadFs.hidden = !dark;
        if (!dark) {
          var first = threadFs.querySelector("input");
          if (first) first.checked = true;
          threadFs.querySelector(".opt-picked").textContent = "";
        }
      }
    }
    if (colorFs) colorFs.addEventListener("change", syncColor);
    syncColor();
    $$("[data-step]", modal).forEach(function (b) {
      b.addEventListener("click", function () {
        var q = $("#qty", modal);
        q.value = Math.max(1, Math.min(+q.max, (+q.value || 1) + (+b.getAttribute("data-step"))));
      });
    });

    $("#item-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var opts = {};
      var ok = true;
      $$(".opt", modal).forEach(function (fs) {
        if (fs.hidden) return;
        var picked = fs.querySelector("input:checked");
        if (!picked) {
          ok = false;
          fs.classList.add("has-err");
          fs.querySelector(".field-err").hidden = false;
        } else {
          opts[fs.getAttribute("data-opt")] = picked.value;
        }
      });
      if (p.threadChoice) {
        var tFs = $("[data-thread]", modal);
        var tPick = tFs && !tFs.hidden && tFs.querySelector("input:checked");
        opts["Logo thread"] = tPick ? tPick.value : ((CFG.threadOptions || ["SCL blue"])[0]);
      }
      var personal = $("#personal", modal);
      var note = personal ? personal.value.trim() : "";
      if (personal && personal.required && !note) {
        ok = false;
        personal.parentNode.classList.add("has-err");
        personal.parentNode.querySelector(".field-err").hidden = false;
      }
      if (!ok) {
        var firstErr = $(".has-err input", modal);
        if (firstErr) firstErr.focus();
        return;
      }
      var qty = Math.max(1, parseInt($("#qty", modal).value, 10) || 1);
      if (addToCart(p.id, opts, note, qty)) {
        closeItem(true);
        bumpBadge();
        setTimeout(function () { openCart(p.name); }, 220);
      }
    });
  }

  function closeItem(fromAdd) {
    var modal = $("#modal");
    if (modal.hidden) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    setTimeout(function () { modal.hidden = true; $("#modal-card").innerHTML = ""; }, 200);
    if (/^#\/item\//.test(location.hash)) history.replaceState(null, "", "#/");
    if (fromAdd) $("#cart-btn").focus();
    else if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  function bumpBadge() {
    var b = $("#cart-btn");
    b.classList.remove("bump");
    void b.offsetWidth;
    b.classList.add("bump");
  }

  /* ---------- cart drawer ---------- */
  function lineHTML(l, editable) {
    var p = BY_ID[l.id];
    var meta = [optionText(l.opts), l.note ? (p.personalize ? p.personalize.label : "Note") + ": " + l.note : ""].filter(Boolean).join(" · ");
    var cap = CFG.maxQtyPerItem || 99;
    return (
      '<li class="line" data-key="' + esc(l.key) + '">' +
        '<div class="line-media' + (hasPhoto(p) ? " is-photo" : "") + '">' + imgTag(cover(p), p) + "</div>" +
        '<div class="line-info">' +
          '<p class="line-name">' + esc(p.name) + "</p>" +
          (meta ? '<p class="line-meta">' + esc(meta) + "</p>" : "") +
          (editable
            ? '<div class="line-actions">' +
                (cap > 1
                  ? '<div class="qty qty-sm">' +
                      '<button type="button" data-q="-1" aria-label="Decrease quantity of ' + esc(p.name) + '">−</button>' +
                      '<span aria-live="polite">' + l.qty + "</span>" +
                      '<button type="button" data-q="1" aria-label="Increase quantity of ' + esc(p.name) + '">+</button>' +
                    "</div>"
                  : "") +
                '<button type="button" class="link-btn" data-remove>Remove</button>' +
              "</div>"
            : '<p class="line-meta">Quantity: ' + l.qty + "</p>") +
        "</div>" +
      "</li>"
    );
  }

  function renderCart(justAdded) {
    var body = $("#cart-body");
    var foot = $("#cart-foot");
    if (!cart.length) {
      body.innerHTML =
        '<div class="cart-empty">' +
          "<p>Your selection is empty.</p>" +
          '<button class="btn" type="button" data-close-cart>Browse the collection</button>' +
        "</div>";
      foot.innerHTML = "";
      return;
    }
    body.innerHTML =
      (justAdded
        ? '<div class="added-note" role="status"><strong>' + esc(justAdded) + ' was added.</strong> Your selection has not been sent yet. When you are ready, continue to delivery details and submit.</div>'
        : '<div class="pending-note">Your selection has not been submitted yet.</div>') +
      '<ul class="lines">' + cart.map(function (l) { return lineHTML(l, true); }).join("") + "</ul>";
    var n = totalQty();
    foot.innerHTML =
      progressHTML(1) +
      '<p class="foot-count">' + n + " item" + (n === 1 ? "" : "s") + (CFG.maxItems ? " of " + CFG.maxItems : "") + " selected</p>" +
      '<a class="btn btn-primary btn-block btn-lg" href="#/checkout" data-to-checkout>Continue to delivery details <span aria-hidden="true">→</span></a>' +
      '<button class="link-btn foot-more" type="button" data-close-cart>Keep browsing</button>';
  }

  function progressHTML(current) {
    var steps = ["Choose gifts", "Delivery details", "Submit"];
    return '<ol class="progress" aria-label="Progress">' + steps.map(function (t, i) {
      var state = i < current ? "done" : i === current ? "current" : "todo";
      return '<li class="is-' + state + '"' + (state === "current" ? ' aria-current="step"' : "") + '><span>' + (state === "done" ? "✓" : i + 1) + "</span>" + t + "</li>";
    }).join("") + "</ol>";
  }

  function openCart(justAdded) {
    $("#toast").classList.remove("is-on");
    renderCart(typeof justAdded === "string" ? justAdded : null);
    lastFocus = document.activeElement;
    var d = $("#cart");
    $("#scrim").hidden = false;
    d.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    requestAnimationFrame(function () { d.classList.add("is-open"); $("#scrim").classList.add("is-on"); });
    $("#cart-close").focus();
  }
  function closeCart(silent) {
    var d = $("#cart");
    if (!d.classList.contains("is-open")) return;
    d.classList.remove("is-open");
    $("#scrim").classList.remove("is-on");
    d.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    setTimeout(function () { $("#scrim").hidden = true; }, 250);
    if (!silent && lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  $("#cart-body").addEventListener("click", function (e) {
    var line = e.target.closest(".line");
    if (e.target.closest("[data-close-cart]")) { closeCart(); location.hash = "#/"; return; }
    if (!line) return;
    var key = line.getAttribute("data-key");
    var l = cart.find(function (x) { return x.key === key; });
    if (e.target.closest("[data-remove]")) { removeLine(key); renderCart(); refreshCheckoutSummary(); return; }
    var q = e.target.closest("[data-q]");
    if (q && l) {
      setQty(key, l.qty + (+q.getAttribute("data-q")));
      renderCart();
      refreshCheckoutSummary();
      var again = $('.line[data-key="' + CSS.escape(key) + '"] [data-q="' + q.getAttribute("data-q") + '"]');
      if (again) again.focus();
    }
  });
  $("#cart-foot").addEventListener("click", function (e) {
    if (e.target.closest("[data-to-checkout]")) closeCart(true);
    if (e.target.closest("[data-close-cart]")) closeCart();
  });

  /* ---------- checkout ---------- */
  var US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
  var COUNTRIES = ["United States","Canada","United Kingdom","Australia","France","Germany","India","Ireland","Israel","Italy","Japan","Mexico","Netherlands","Singapore","Spain","Switzerland","United Arab Emirates","Other"];

  function field(o) {
    var req = o.required !== false;
    var input;
    if (o.type === "select") {
      input = '<select id="' + o.id + '" name="' + o.id + '"' + (req ? " required" : "") + (o.ac ? ' autocomplete="' + o.ac + '"' : "") + ">" +
        (o.placeholder ? '<option value="">' + esc(o.placeholder) + "</option>" : "") +
        o.options.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + "</option>"; }).join("") +
        "</select>";
    } else if (o.type === "textarea") {
      input = '<textarea id="' + o.id + '" name="' + o.id + '" rows="' + (o.rows || 3) + '" maxlength="' + (o.max || 600) + '"' + (req ? " required" : "") + ' placeholder="' + esc(o.placeholder || "") + '"></textarea>';
    } else {
      input = '<input id="' + o.id + '" name="' + o.id + '" type="' + (o.type || "text") + '"' +
        (o.ac ? ' autocomplete="' + o.ac + '"' : "") +
        (o.pattern ? ' pattern="' + o.pattern + '"' : "") +
        (o.inputmode ? ' inputmode="' + o.inputmode + '"' : "") +
        (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : "") +
        ' maxlength="' + (o.max || 120) + '"' + (req ? " required" : "") + ">";
    }
    return (
      '<div class="field' + (o.wide ? " wide" : "") + (o.cls ? " " + o.cls : "") + '">' +
        '<label for="' + o.id + '">' + esc(o.label) + (req ? "" : ' <span class="optional">optional</span>') + "</label>" +
        input +
        (o.hint ? '<p class="hint">' + esc(o.hint) + "</p>" : "") +
        '<p class="field-err" hidden>' + esc(o.err || "Please fill this in.") + "</p>" +
      "</div>"
    );
  }

  function checkoutView() {
    var minDate = new Date();
    minDate.setDate(minDate.getDate() + (CFG.minLeadDays || 0));
    return (
      '<section class="checkout">' +
        '<a class="back" href="#/"><span aria-hidden="true">←</span> Back to the collection</a>' +
        progressHTML(1) +
        "<h1>Delivery details</h1>" +
        '<p class="lede">Tell us who you are and where to send your gifts, then submit your selection at the bottom of this page. Nothing is sent until you submit.</p>' +
        '<div class="checkout-grid">' +
          '<form id="checkout-form" class="checkout-form" novalidate>' +
            '<fieldset class="panel"><legend><span class="num">1</span>About you</legend><div class="fields">' +
              field({ id: "firstName", label: "First name", ac: "given-name" }) +
              field({ id: "lastName", label: "Last name", ac: "family-name" }) +
              field({ id: "email", label: "Email", type: "email", ac: "email", err: "Please enter a valid email address.", inputmode: "email" }) +
              field({ id: "phone", label: "Phone", type: "tel", ac: "tel", hint: "For the carrier, if they need to reach you.", inputmode: "tel", err: "Please enter a valid phone number." }) +
              field({ id: "company", label: "Company", ac: "organization", required: false }) +
              field({ id: "jobTitle", label: "Title", ac: "organization-title", required: false }) +
            "</div></fieldset>" +

            '<fieldset class="panel"><legend><span class="num">2</span>Shipping address</legend><div class="fields">' +
              '<label class="check wide"><input type="checkbox" id="shipToSelf" checked> Ship to me</label>' +
              field({ id: "shipName", label: "Recipient name", ac: "shipping name", wide: true, cls: "ship-name", required: false }) +
              field({ id: "country", label: "Country", type: "select", options: COUNTRIES, ac: "shipping country-name", wide: true }) +
              field({ id: "address1", label: "Street address", ac: "shipping address-line1", wide: true, max: 160 }) +
              field({ id: "address2", label: "Apartment, suite, floor", ac: "shipping address-line2", wide: true, required: false, max: 160 }) +
              field({ id: "city", label: "City", ac: "shipping address-level2" }) +
              '<div class="field state-field">' +
                '<label for="state">State</label>' +
                '<select id="state" name="state" autocomplete="shipping address-level1" required><option value="">Select</option>' +
                  US_STATES.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("") +
                "</select>" +
                '<input id="region" name="region" type="text" autocomplete="shipping address-level1" maxlength="80" hidden>' +
                '<p class="field-err" hidden>Please fill this in.</p>' +
              "</div>" +
              field({ id: "postal", label: "ZIP code", ac: "shipping postal-code", max: 12, err: "Please enter a valid ZIP code.", inputmode: "numeric", pattern: "\\d{5}(-\\d{4})?" }) +
              field({ id: "addressType", label: "Address type", type: "select", options: ["Home", "Office", "Other"], placeholder: "Select" }) +
            "</div></fieldset>" +

            '<fieldset class="panel"><legend><span class="num">3</span>Delivery</legend><div class="fields">' +
              field({ id: "deliveryDate", label: "Best delivery date", type: "date", hint: "We will aim for this date. Earliest available: " + prettyDate(isoDate(minDate)) + ".", err: "Please choose a date on or after " + prettyDate(isoDate(minDate)) + "." }) +
              '<label class="check flex-check"><input type="checkbox" id="dateFlexible"> Any date works</label>' +
              field({ id: "instructions", label: "Delivery instructions", type: "textarea", wide: true, required: false, rows: 2, placeholder: "Gate code, front desk, leave with doorman…", max: 400 }) +
            "</div></fieldset>" +

            '<fieldset class="panel"><legend><span class="num">4</span>Anything else</legend><div class="fields">' +
              field({ id: "notes", label: "Notes for the SCL team", type: "textarea", wide: true, required: false, rows: 3, placeholder: "Sizing questions, preferences, anything we should know.", max: 800 }) +
            "</div></fieldset>" +

            '<div class="submit-row">' +
              '<button class="btn btn-primary btn-lg" type="submit" id="submit-btn">Submit my selection</button>' +
              '<p class="submit-note">This is the final step. Your selection is sent to SCL when you submit.</p>' +
              '<p class="fine">By submitting, you share these details with Strategic Communication Lab solely to deliver your gift.</p>' +
              '<div class="form-alert" id="form-alert" role="alert" hidden></div>' +
            "</div>" +
          "</form>" +
          '<aside class="summary" aria-labelledby="summary-title">' +
            '<div class="summary-inner">' +
              '<h2 id="summary-title">Your selection</h2>' +
              '<ul class="lines" id="summary-lines"></ul>' +
              '<button type="button" class="link-btn" id="edit-selection">Edit selection</button>' +
            "</div>" +
          "</aside>" +
        "</div>" +
      "</section>"
    );
  }

  function refreshCheckoutSummary() {
    var ul = $("#summary-lines");
    if (!ul) return;
    if (!cart.length) { location.hash = "#/"; return; }
    ul.innerHTML = cart.map(function (l) { return lineHTML(l, false); }).join("");
  }

  function setupCheckout() {
    var form = $("#checkout-form");
    var minDate = new Date();
    minDate.setDate(minDate.getDate() + (CFG.minLeadDays || 0));
    var dateInput = $("#deliveryDate");
    dateInput.min = isoDate(minDate);
    var max = new Date(); max.setFullYear(max.getFullYear() + 1);
    dateInput.max = isoDate(max);

    // restore saved form values + invite prefill
    var saved = load(FORM_KEY, {});
    var ref = load(REF_KEY, {}, sessionStorage);
    Object.keys(ref).forEach(function (k) { if (!saved[k] && ref[k] && k !== "ref") saved[k] = ref[k]; });
    $$("input, select, textarea", form).forEach(function (el) {
      if (!el.id || !(el.id in saved)) return;
      if (el.type === "checkbox") el.checked = !!saved[el.id];
      else el.value = saved[el.id];
    });
    if (!$("#country").value) $("#country").value = "United States";

    function syncShip() {
      var self = $("#shipToSelf").checked;
      $(".ship-name").hidden = self;
      $("#shipName").required = !self;
    }
    function syncCountry() {
      var us = $("#country").value === "United States";
      $("#state").hidden = !us; $("#state").required = us; $("#state").disabled = !us;
      $("#region").hidden = us; $("#region").required = false; $("#region").disabled = us;
      $(".state-field label").textContent = us ? "State" : "State / province / region";
      $(".state-field label").setAttribute("for", us ? "state" : "region");
      var postal = $("#postal");
      postal.pattern = us ? "\\d{5}(-\\d{4})?" : ".{2,12}";
      postal.setAttribute("inputmode", us ? "numeric" : "text");
      postal.closest(".field").querySelector("label").textContent = us ? "ZIP code" : "Postal code";
      postal.required = us || $("#country").value !== "Other";
    }
    function syncFlexible() {
      var flex = $("#dateFlexible").checked;
      dateInput.required = !flex;
      dateInput.closest(".field").classList.toggle("is-muted", flex);
    }
    $("#shipToSelf").addEventListener("change", syncShip);
    $("#country").addEventListener("change", syncCountry);
    $("#dateFlexible").addEventListener("change", syncFlexible);
    syncShip(); syncCountry(); syncFlexible();

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f && f.classList.contains("has-err") && e.target.checkValidity()) {
        f.classList.remove("has-err");
        f.querySelector(".field-err").hidden = true;
      }
      persistForm();
    });
    form.addEventListener("change", persistForm);
    $("#edit-selection").addEventListener("click", openCart);

    function persistForm() {
      var data = {};
      $$("input, select, textarea", form).forEach(function (el) {
        if (!el.id) return;
        data[el.id] = el.type === "checkbox" ? el.checked : el.value;
      });
      save(FORM_KEY, data);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      if (!cart.length) { location.hash = "#/"; return; }
      submit(form);
    });

    refreshCheckoutSummary();
  }

  function validate(form) {
    var first = null;
    // trim text first so whitespace-only answers fail "required"
    $$("input[type=text], input[type=email], input[type=tel], textarea", form).forEach(function (el) {
      if (el.value !== el.value.trim()) el.value = el.value.trim();
    });
    $$("input, select, textarea", form).forEach(function (el) {
      if (el.disabled || el.hidden || el.type === "checkbox") return;
      var f = el.closest(".field");
      if (!f) return;
      var ok = el.checkValidity();
      if (el.type === "email" && ok && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value)) ok = false;
      if (el.type === "tel" && ok && el.value && (el.value.replace(/\D/g, "").length < 7 || /[^0-9+().\-\s]/.test(el.value))) ok = false;
      f.classList.toggle("has-err", !ok);
      var err = f.querySelector(".field-err");
      if (err) err.hidden = ok;
      el.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok && !first) first = el;
    });
    if (first) {
      first.focus();
      first.closest(".field").scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  /* ---------- order payload ---------- */
  var COLUMNS = [
    "Order ID", "Submitted At", "Campaign", "Line", "Total Lines", "SKU", "Item", "Category",
    "Size", "Color", "Other Options", "Personalization", "Quantity",
    "First Name", "Last Name", "Email", "Phone", "Company", "Job Title",
    "Ship To Name", "Address Line 1", "Address Line 2", "City", "State / Region", "Postal Code", "Country",
    "Address Type", "Full Address", "Best Delivery Date", "Date Flexible", "Delivery Instructions",
    "Notes", "Order Summary", "Invite Ref", "Status"
  ];

  function buildOrder(form) {
    var v = function (id) { var el = $("#" + id, form); return el && !el.disabled ? String(el.value || "").trim() : ""; };
    var us = v("country") === "United States";
    var ref = load(REF_KEY, {}, sessionStorage);
    var firstName = v("firstName"), lastName = v("lastName");
    var shipToSelf = $("#shipToSelf").checked;
    var shipName = shipToSelf ? (firstName + " " + lastName).trim() : v("shipName");
    var region = us ? v("state") : v("region");
    var flexible = $("#dateFlexible").checked;
    var date = flexible && !v("deliveryDate") ? "" : v("deliveryDate");
    var fullAddress = [
      shipName, v("address1"), v("address2"),
      [v("city"), [region, v("postal")].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      v("country")
    ].filter(Boolean).join(", ");

    var order = {
      orderId: orderId(),
      submittedAt: new Date().toISOString(),
      campaign: CFG.campaignName || "",
      inviteRef: ref.ref || "",
      sourceUrl: location.origin + location.pathname,
      customer: { firstName: firstName, lastName: lastName, email: v("email"), phone: v("phone"), company: v("company"), jobTitle: v("jobTitle") },
      shipping: {
        shipToSelf: shipToSelf, name: shipName, address1: v("address1"), address2: v("address2"),
        city: v("city"), region: region, postalCode: v("postal"), country: v("country"),
        addressType: v("addressType"), fullAddress: fullAddress
      },
      delivery: { bestDate: date, flexible: flexible, instructions: v("instructions") },
      notes: v("notes"),
      items: cart.map(function (l, i) {
        var p = BY_ID[l.id];
        return { line: i + 1, sku: p.id, name: p.name, category: p.category || "", options: l.opts, personalization: l.note || "", quantity: l.qty };
      })
    };

    var summary = order.items.map(function (it) {
      var o = optionText(it.options);
      return it.quantity + " × " + it.name + (o ? " (" + o + ")" : "") + (it.personalization ? " [" + it.personalization + "]" : "");
    }).join("; ");

    order.rows = order.items.map(function (it) {
      var opts = it.options || {};
      var other = Object.keys(opts).filter(function (k) { return k !== "Size" && k !== "Color"; })
        .map(function (k) { return k + ": " + opts[k]; }).join("; ");
      var r = {
        "Order ID": order.orderId,
        "Submitted At": order.submittedAt,
        "Campaign": order.campaign,
        "Line": it.line,
        "Total Lines": order.items.length,
        "SKU": it.sku,
        "Item": it.name,
        "Category": it.category,
        "Size": opts.Size || "",
        "Color": opts.Color || "",
        "Other Options": other,
        "Personalization": it.personalization,
        "Quantity": it.quantity,
        "First Name": order.customer.firstName,
        "Last Name": order.customer.lastName,
        "Email": order.customer.email,
        "Phone": order.customer.phone,
        "Company": order.customer.company,
        "Job Title": order.customer.jobTitle,
        "Ship To Name": order.shipping.name,
        "Address Line 1": order.shipping.address1,
        "Address Line 2": order.shipping.address2,
        "City": order.shipping.city,
        "State / Region": order.shipping.region,
        "Postal Code": order.shipping.postalCode,
        "Country": order.shipping.country,
        "Address Type": order.shipping.addressType,
        "Full Address": order.shipping.fullAddress,
        "Best Delivery Date": order.delivery.bestDate,
        "Date Flexible": order.delivery.flexible ? "Yes" : "No",
        "Delivery Instructions": order.delivery.instructions,
        "Notes": order.notes,
        "Order Summary": summary,
        "Invite Ref": order.inviteRef,
        "Status": "New"
      };
      return r;
    });
    order.summary = summary;
    return order;
  }

  /* ---------- sending ---------- */
  function timeoutFetch(url, opts, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    if (ctrl) opts.signal = ctrl.signal;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 20000);
    return fetch(url, opts).finally(function () { clearTimeout(t); });
  }

  function sendToExcel(order) {
    if (!CFG.orderEndpoint) return Promise.resolve(false);
    var body = JSON.stringify(order);
    return timeoutFetch(CFG.orderEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: body
    }).then(function (res) { return res.ok; })
      .catch(function () {
        // CORS preflight refused: resend as a simple request. The response
        // is opaque, so a network-level success is the best signal we get.
        return timeoutFetch(CFG.orderEndpoint, {
          method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: body
        }).then(function () { return true; }).catch(function () { return false; });
      });
  }

  function sendEmail(order) {
    if (!CFG.notifyEmail) return Promise.resolve(false);
    var c = order.customer, s = order.shipping, d = order.delivery;
    var payload = {
      _subject: "Gift selection " + order.orderId + " · " + (c.firstName + " " + c.lastName).trim() + (c.company ? " (" + c.company + ")" : ""),
      _template: "table",
      _captcha: "false",
      _replyto: c.email,
      _cc: CFG.ccEmails || undefined,
      "Order ID": order.orderId,
      "Submitted": new Date(order.submittedAt).toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET",
      "Campaign": order.campaign,
      "Name": (c.firstName + " " + c.lastName).trim(),
      "Email": c.email,
      "Phone": c.phone,
      "Company": c.company,
      "Title": c.jobTitle,
      "Items": order.items.map(function (it) {
        var o = optionText(it.options);
        return it.quantity + " × " + it.name + (o ? " — " + o : "") + (it.personalization ? " — Personalization: " + it.personalization : "");
      }).join("\n"),
      "Ship to": s.fullAddress,
      "Address type": s.addressType,
      "Best delivery date": d.bestDate ? prettyDate(d.bestDate) : "",
      "Date flexible": d.flexible ? "Yes" : "No",
      "Delivery instructions": d.instructions,
      "Notes": order.notes,
      "Invite ref": order.inviteRef,
      // Machine-readable copy of the Excel rows. The Power Automate flow
      // decodes the text between the markers; do not edit.
      "Data (for Excel, do not edit)": "SCLGIFT::" + b64(JSON.stringify(order.rows)) + "::END"
    };
    return timeoutFetch("https://formsubmit.co/ajax/" + encodeURIComponent(CFG.notifyEmail), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.json().then(function (j) { return res.ok && String(j.success) === "true"; }); })
      .catch(function () { return false; });
  }

  function b64(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function mailtoFallback(order) {
    var c = order.customer;
    var body =
      "Order ID: " + order.orderId + "\n" +
      "Name: " + c.firstName + " " + c.lastName + "\nEmail: " + c.email + "\nPhone: " + c.phone + "\nCompany: " + c.company + "\n\n" +
      "Items:\n" + order.summary.split("; ").join("\n") + "\n\n" +
      "Ship to: " + order.shipping.fullAddress + " (" + order.shipping.addressType + ")\n" +
      "Best delivery date: " + (order.delivery.bestDate || "Flexible") + "\n" +
      "Delivery instructions: " + order.delivery.instructions + "\nNotes: " + order.notes;
    return "mailto:" + (CFG.contactEmail || CFG.notifyEmail || "") +
      "?subject=" + encodeURIComponent("Gift selection " + order.orderId) +
      "&body=" + encodeURIComponent(body);
  }

  var submitting = false;
  function submit(form) {
    if (submitting) return;
    submitting = true;
    var btn = $("#submit-btn");
    var alertBox = $("#form-alert");
    alertBox.hidden = true;
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.textContent = "Submitting…";
    var order = buildOrder(form);

    Promise.all([sendToExcel(order), sendEmail(order)]).then(function (r) {
      if (r[0] || r[1]) {
        save(LAST_KEY, { orderId: order.orderId, name: order.customer.firstName, email: order.customer.email, items: order.items, shipping: order.shipping, delivery: order.delivery }, sessionStorage);
        cart = []; persistCart();
        drop(FORM_KEY);
        location.hash = "#/thanks";
      } else {
        alertBox.innerHTML =
          "<strong>We couldn't send your selection.</strong> Please check your connection and try again, or " +
          '<a href="' + esc(mailtoFallback(order)) + '">email it to us</a> and we will take it from there.';
        alertBox.hidden = false;
        alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }).finally(function () {
      submitting = false;
      if (document.body.contains(btn)) {
        btn.disabled = false;
        btn.classList.remove("is-loading");
        btn.textContent = "Submit my selection";
      }
    });
  }

  function thanksView() {
    var last = load(LAST_KEY, null, sessionStorage);
    if (!last) return null;
    return (
      '<section class="thanks">' + progressHTML(3) +
        '<div class="check-mark" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>' +
        "<h1>Thank you" + (last.name ? ", " + esc(last.name) : "") + ".</h1>" +
        '<p class="lede">Your selection is in. We will be in touch at <strong>' + esc(last.email) + "</strong> if we need anything.</p>" +
        '<div class="receipt">' +
          '<p class="receipt-id">Reference <strong>' + esc(last.orderId) + "</strong></p>" +
          '<ul class="receipt-items">' + last.items.map(function (it) {
            var o = optionText(it.options);
            return "<li><span>" + it.quantity + " ×</span> " + esc(it.name) + (o ? '<em>' + esc(o) + "</em>" : "") + (it.personalization ? "<em>Personalization: " + esc(it.personalization) + "</em>" : "") + "</li>";
          }).join("") + "</ul>" +
          '<dl class="receipt-meta">' +
            "<dt>Shipping to</dt><dd>" + esc(last.shipping.fullAddress) + "</dd>" +
            "<dt>Best delivery date</dt><dd>" + (last.delivery.bestDate ? esc(prettyDate(last.delivery.bestDate)) + (last.delivery.flexible ? " (flexible)" : "") : "Any date") + "</dd>" +
          "</dl>" +
        "</div>" +
        '<p class="fine">Need to change something? <a href="mailto:' + esc(CFG.contactEmail || "") + "?subject=" + encodeURIComponent("Gift selection " + last.orderId) + '">Email us</a> with your reference.</p>' +
      "</section>"
    );
  }

  /* ---------- router ---------- */
  var view = $("#view");
  function route() {
    var h = location.hash || "#/";
    var m;
    closeCart(true);
    if ((m = h.match(/^#\/item\/(.+)$/))) {
      if (!$(".catalog")) renderShop();
      openItem(decodeURIComponent(m[1]));
      return;
    }
    closeItem();
    if (h === "#/checkout") {
      if (!cart.length) { location.replace("#/"); return; }
      view.innerHTML = checkoutView();
      setupCheckout();
      document.title = "Delivery details · SCL Gifts";
      focusMain();
      return;
    }
    if (h === "#/thanks") {
      var html = thanksView();
      if (!html) { location.replace("#/"); return; }
      view.innerHTML = html;
      document.title = "Thank you · SCL Gifts";
      focusMain();
      return;
    }
    if (!$(".catalog")) renderShop();
    document.title = "SCL Gifts · Strategic Communication Lab";
  }
  function renderShop() {
    view.innerHTML = shopView();
    focusMain(true);
  }
  function focusMain(top) {
    window.scrollTo(0, 0);
    if (!top) $("#main").focus({ preventScroll: true });
  }

  view.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-filter]");
    if (chip) {
      activeFilter = chip.getAttribute("data-filter");
      $$(".chip").forEach(function (c) {
        var on = c.getAttribute("data-filter") === activeFilter;
        c.classList.toggle("is-on", on);
        c.setAttribute("aria-pressed", on);
      });
      $("#grid").innerHTML = gridHTML();
    }
  });

  /* ---------- global wiring ---------- */
  $("#cart-btn").addEventListener("click", openCart);
  $("#cart-close").addEventListener("click", function () { closeCart(); });
  $("#scrim").addEventListener("click", function () { closeCart(); });
  $("#modal").addEventListener("click", function (e) {
    if (e.target.id === "modal" || e.target.closest("[data-close]")) closeItem();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$("#modal").hidden) closeItem();
      else closeCart();
    }
    if (e.key === "Tab") trapFocus(e);
  });
  function trapFocus(e) {
    var box = !$("#modal").hidden ? $("#modal-card") : $("#cart").classList.contains("is-open") ? $("#cart") : null;
    if (!box) return;
    var f = $$('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea', box)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // Invite links: ?name=Jane%20Doe&email=jane@x.com&company=Acme&ref=acme-q4
  (function captureInvite() {
    var q = new URLSearchParams(location.search);
    if (![].concat(["name", "first", "last", "email", "company", "ref"]).some(function (k) { return q.has(k); })) return;
    var ref = load(REF_KEY, {}, sessionStorage);
    if (q.get("name")) {
      var parts = q.get("name").trim().split(/\s+/);
      ref.firstName = parts.shift(); ref.lastName = parts.join(" ");
    }
    if (q.get("first")) ref.firstName = q.get("first");
    if (q.get("last")) ref.lastName = q.get("last");
    if (q.get("email")) ref.email = q.get("email");
    if (q.get("company")) ref.company = q.get("company");
    if (q.get("ref")) ref.ref = q.get("ref");
    save(REF_KEY, ref, sessionStorage);
    history.replaceState(null, "", location.pathname + (location.hash || "#/"));
  })();

  $("#campaign-tag").textContent = CFG.campaignName || "";
  var help = $("#help-link");
  if (CFG.contactEmail) help.href = "mailto:" + CFG.contactEmail + "?subject=" + encodeURIComponent("SCL Gifts question");
  else help.parentNode.hidden = true;

  window.addEventListener("hashchange", function () { route(); renderCartBadge(); });
  window.addEventListener("storage", function (e) {
    if (e.key === CART_KEY) { cart = load(CART_KEY, []).filter(function (l) { return BY_ID[l.id]; }); renderCartBadge(); }
  });
  renderCartBadge();
  route();
})();
