/* Team access (team.html)
   The links on this page are stored encrypted in team.html
   (<script id="team-vault">). They decrypt only with the team password:
   PBKDF2-HMAC-SHA256 (600,000+ iterations) derives an AES-256-GCM key,
   all through the browser's built-in WebCrypto. Nothing is sent anywhere.
   "Remember me" keeps the derived key (never the password) in this
   browser's localStorage; otherwise the key lives only for this tab.
   Re-encrypting the page (scripts/encrypt-team.mjs) changes the salt, so
   any remembered key stops working and people are asked again.
   Format must match scripts/encrypt-team.mjs. */
(function () {
  "use strict";

  var STORE_KEY = "scl-team-key";
  var vaultEl = document.getElementById("team-vault");
  var form = document.getElementById("team-form");
  if (!vaultEl || !form) return;

  var locked = document.getElementById("team-locked");
  var open = document.getElementById("team-open");
  var pwInput = document.getElementById("team-password");
  var remember = document.getElementById("team-remember");
  var submitBtn = form.querySelector("button[type=submit]");
  var errorEl = document.getElementById("team-error");
  var lede = document.getElementById("team-lede");
  var subtle = window.crypto && window.crypto.subtle;

  var vault;
  try { vault = JSON.parse(vaultEl.textContent); } catch (e) { vault = null; }

  function b64ToBytes(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToB64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.setAttribute("aria-busy", String(busy));
    submitBtn.firstChild.nodeValue = busy ? "Checking… " : "Sign in ";
  }

  // ---- key storage -------------------------------------------------
  function storeKey(rawB64, persist) {
    var rec = JSON.stringify({ id: vault.kdf.salt, k: rawB64 });
    try {
      if (persist) localStorage.setItem(STORE_KEY, rec);
      else sessionStorage.setItem(STORE_KEY, rec);
    } catch (e) { /* storage off: they just sign in again next time */ }
  }
  function readStoredKey() {
    var rec = null;
    try { rec = localStorage.getItem(STORE_KEY) || sessionStorage.getItem(STORE_KEY); } catch (e) {}
    if (!rec) return null;
    try {
      rec = JSON.parse(rec);
      return rec && rec.id === vault.kdf.salt ? rec.k : null;
    } catch (e) { return null; }
  }
  function isRemembered() {
    try { return !!localStorage.getItem(STORE_KEY); } catch (e) { return false; }
  }
  function clearKeys() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
  }

  // ---- crypto ------------------------------------------------------
  function deriveKey(password) {
    return subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return subtle.deriveKey(
          { name: "PBKDF2", hash: "SHA-256", salt: b64ToBytes(vault.kdf.salt), iterations: vault.kdf.iterations },
          base,
          { name: "AES-GCM", length: 256 },
          true,
          ["decrypt"]
        );
      });
  }
  function importRawKey(rawB64) {
    return subtle.importKey("raw", b64ToBytes(rawB64), { name: "AES-GCM" }, true, ["decrypt"]);
  }
  function decryptWith(key) {
    return subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(vault.cipher.iv) }, key, b64ToBytes(vault.ct))
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }

  // ---- rendering (textContent only; the payload never becomes HTML) --
  function safeUrl(u) {
    return typeof u === "string" && /^https:\/\//.test(u) ? u : null;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function render(content, focusPanel) {
    var hub = safeUrl(content.hubUrl);
    var hubLink = document.getElementById("team-hub-link");
    if (hub) hubLink.href = hub;
    document.getElementById("team-hub-note").textContent = content.note || "";

    var list = document.getElementById("team-links");
    list.textContent = "";
    (content.links || []).forEach(function (l) {
      var href = safeUrl(l.url) || (hub && l.hash && /^[a-z]+(\/[a-z]+)?$/.test(l.hash) ? hub + "#" + l.hash : null);
      if (!href) return;
      var li = el("li");
      var a = el("a", "team-link");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      var label = el("span", "team-link-label", l.label);
      label.appendChild(el("span", "arrow", "→"));
      a.appendChild(label);
      if (l.note) a.appendChild(el("span", "team-link-note", l.note));
      a.appendChild(el("span", "visually-hidden", " (opens in a new tab)"));
      li.appendChild(a);
      list.appendChild(li);
    });

    // Embedding: claude.ai does not allow other sites to frame artifacts
    // today (see docs/TEAM-ACCESS.md). If that changes, put the embed URL
    // in the payload's "embedUrl" and the hub shows here, full height.
    var embedWrap = document.getElementById("team-embed");
    var embed = safeUrl(content.embedUrl);
    embedWrap.textContent = "";
    embedWrap.hidden = !embed;
    if (embed) {
      var frame = el("iframe", "team-embed-frame");
      frame.src = embed;
      frame.title = "SCL operations hub";
      frame.setAttribute("allow", "clipboard-write");
      frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      embedWrap.appendChild(frame);
    }

    document.getElementById("team-remembered").hidden = !isRemembered();
    locked.hidden = true;
    open.hidden = false;
    document.body.classList.add("team-is-open");
    if (lede) lede.textContent = lede.getAttribute("data-open");
    if (focusPanel) document.getElementById("team-hub-title").focus();
  }

  function lock(message) {
    clearKeys();
    // Signing out here also closes the site gate (site-gate.js) for this tab.
    try { sessionStorage.removeItem("scl-site-ok"); } catch (e) {}
    open.hidden = true;
    locked.hidden = false;
    document.body.classList.remove("team-is-open");
    if (lede) lede.textContent = lede.getAttribute("data-locked");
    document.getElementById("team-links").textContent = "";
    document.getElementById("team-embed").textContent = "";
    document.getElementById("team-hub-link").removeAttribute("href");
    pwInput.value = "";
    showError(message || "");
    pwInput.focus();
  }

  // ---- wire up -----------------------------------------------------
  if (!subtle || !vault || !vault.kdf || !vault.cipher || !vault.ct) {
    showError(!subtle
      ? "This browser can't open the team page. Use a current version of Chrome, Safari, Edge or Firefox."
      : "The team page isn't set up yet.");
    submitBtn.disabled = true;
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = pwInput.value;
    if (!pw) { showError("Enter the team password."); pwInput.focus(); return; }
    showError("");
    setBusy(true);
    var keyRef;
    deriveKey(pw)
      .then(function (key) { keyRef = key; return decryptWith(key); })
      .then(function (content) {
        return subtle.exportKey("raw", keyRef).then(function (raw) {
          clearKeys();
          storeKey(bytesToB64(new Uint8Array(raw)), remember.checked);
          pwInput.value = "";
          setBusy(false);
          render(content, true);
        });
      })
      .catch(function () {
        setBusy(false);
        showError("That password didn't work. Check it and try again.");
        pwInput.select();
        pwInput.focus();
      });
  });

  document.getElementById("team-signout").addEventListener("click", function () {
    lock("You're signed out on this device.");
  });

  // Returning visitor with a stored key: open straight away.
  var stored = readStoredKey();
  if (stored) {
    importRawKey(stored).then(decryptWith).then(function (c) { render(c, false); })
      .catch(function () { clearKeys(); });
  } else {
    clearKeys(); // drops a key left over from an older password
  }
})();
