/* Site gate (every page except team.html, which has its own sign-in).
   The review site asks for the SCL Lab team password before it shows a
   page. There is no second password: the gate checks what is typed
   against the encrypted vault in team.html (same PBKDF2 + AES-GCM format
   as team-access.js), so rotating the team password with
   scripts/encrypt-team.mjs changes this password too.

   One sign-in covers both: a correct password here stores the same
   derived key team-access.js stores (scl-team-key), so team.html opens
   without asking again, and a sign-in on team.html opens the site.
   "Sign out" on team.html locks both.

   This hides pages from casual visitors only. The page HTML itself is
   not encrypted and is readable in the public repo and with JavaScript
   turned off. See docs/TEAM-ACCESS.md, section 8. Remove the
   site-gate.js <script> tag from every page at the scl.us.com cutover. */
(function () {
  "use strict";

  var OK_KEY = "scl-site-ok";    // sessionStorage: this tab has passed the gate
  var TEAM_KEY = "scl-team-key"; // shared with team-access.js
  var root = document.documentElement;

  try { if (sessionStorage.getItem(OK_KEY)) return; } catch (e) {}

  root.classList.add("site-gated");
  window.SCL_SITE_GATED = true;

  var subtle = window.crypto && window.crypto.subtle;
  var vaultPromise = null;
  var gate, form, pwInput, remember, submitBtn, errorEl;

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

  // ---- vault (read from team.html, so it always matches the team page) --
  function loadVault() {
    if (!vaultPromise) {
      vaultPromise = fetch("team.html", { cache: "no-cache", credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("vault " + res.status);
          return res.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var node = doc.getElementById("team-vault");
          var v = node ? JSON.parse(node.textContent) : null;
          if (!v || !v.kdf || !v.kdf.salt || !v.cipher || !v.ct) throw new Error("vault missing");
          return v;
        });
      vaultPromise.catch(function () { vaultPromise = null; }); // allow a retry
    }
    return vaultPromise;
  }

  function decryptWith(vault, key) {
    return subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(vault.cipher.iv) }, key, b64ToBytes(vault.ct));
  }
  function deriveKey(vault, password) {
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

  // ---- stored key (same record format as team-access.js) ------------
  function readStoredKey(salt) {
    var rec = null;
    try { rec = localStorage.getItem(TEAM_KEY) || sessionStorage.getItem(TEAM_KEY); } catch (e) {}
    if (!rec) return null;
    try {
      rec = JSON.parse(rec);
      return rec && rec.id === salt ? rec.k : null;
    } catch (e) { return null; }
  }
  function storeKey(salt, rawB64, persist) {
    var rec = JSON.stringify({ id: salt, k: rawB64 });
    try { localStorage.removeItem(TEAM_KEY); } catch (e) {}
    try { sessionStorage.removeItem(TEAM_KEY); } catch (e) {}
    try {
      if (persist) localStorage.setItem(TEAM_KEY, rec);
      else sessionStorage.setItem(TEAM_KEY, rec);
    } catch (e) {}
  }

  // ---- open / closed -------------------------------------------------
  function unlock(salt) {
    try { sessionStorage.setItem(OK_KEY, salt); } catch (e) {}
    root.classList.remove("site-gated");
    window.SCL_SITE_GATED = false;
    if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
    document.dispatchEvent(new CustomEvent("scl:site-unlocked"));
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
  function showForm() {
    form.hidden = false;
    gate.querySelector(".site-gate-aside").hidden = false;
    pwInput.focus();
  }

  function build() {
    gate = document.createElement("section");
    gate.className = "site-gate";
    gate.setAttribute("aria-labelledby", "site-gate-title");
    gate.innerHTML =
      '<div class="site-gate-inner">' +
        '<div class="site-gate-brand">' +
          '<img src="logo-mark-64.png" alt="" width="64" height="55" />' +
          '<span>Strategic Communication Lab</span>' +
        '</div>' +
        '<h1 id="site-gate-title" class="site-gate-title">Sign in</h1>' +
        '<p class="site-gate-lede">The new SCL website is in review. Enter the team password to view it.</p>' +
        '<form class="team-card site-gate-card" novalidate hidden>' +
          '<input type="text" name="username" autocomplete="username" value="SCL team" class="visually-hidden" tabindex="-1" aria-hidden="true" readonly />' +
          '<label for="site-gate-password">Team password</label>' +
          '<input id="site-gate-password" name="password" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" required aria-describedby="site-gate-error" />' +
          '<label class="team-check" for="site-gate-remember">' +
            '<input id="site-gate-remember" type="checkbox" />' +
            '<span>Remember me on this device</span>' +
          '</label>' +
          '<button class="btn btn-highlight" type="submit">Sign in <span class="arrow">→</span></button>' +
          '<p id="site-gate-error" class="team-error" role="alert" hidden></p>' +
        '</form>' +
        '<p class="team-aside site-gate-aside" hidden>Same password as SCL Lab. Need it? Ask Ayal Meyers.</p>' +
      '</div>';
    document.body.insertBefore(gate, document.body.firstChild);

    form = gate.querySelector("form");
    pwInput = gate.querySelector("#site-gate-password");
    remember = gate.querySelector("#site-gate-remember");
    submitBtn = form.querySelector("button[type=submit]");
    errorEl = gate.querySelector("#site-gate-error");

    if (!subtle || !window.fetch) {
      form.hidden = false;
      showError("This browser can't open the site. Use a current version of Chrome, Safari, Edge or Firefox.");
      submitBtn.disabled = true;
      return;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = pwInput.value;
      if (!pw) { showError("Enter the team password."); pwInput.focus(); return; }
      showError("");
      setBusy(true);
      var vaultRef, keyRef;
      loadVault()
        .then(function (vault) { vaultRef = vault; return deriveKey(vault, pw); },
              function () { throw "network"; })
        .then(function (key) { keyRef = key; return decryptWith(vaultRef, key); })
        .then(function () { return subtle.exportKey("raw", keyRef); })
        .then(function (raw) {
          storeKey(vaultRef.kdf.salt, bytesToB64(new Uint8Array(raw)), remember.checked);
          pwInput.value = "";
          unlock(vaultRef.kdf.salt);
        })
        .catch(function (err) {
          setBusy(false);
          showError(err === "network"
            ? "The sign-in check couldn't load. Check your connection and try again."
            : "That password didn't work. Check it and try again.");
          pwInput.select();
          pwInput.focus();
        });
    });

    // Signed in before (here or on team.html): check the stored key
    // against the current vault and open without asking.
    var hasStored = false;
    try { hasStored = !!(localStorage.getItem(TEAM_KEY) || sessionStorage.getItem(TEAM_KEY)); } catch (e) {}
    if (!hasStored) { showForm(); loadVault().catch(function () {}); return; }

    loadVault()
      .then(function (vault) {
        var k = readStoredKey(vault.kdf.salt);
        if (!k) throw new Error("no key for this vault");
        return subtle.importKey("raw", b64ToBytes(k), { name: "AES-GCM" }, false, ["decrypt"])
          .then(function (key) { return decryptWith(vault, key); })
          .then(function () { unlock(vault.kdf.salt); });
      })
      .catch(function () { showForm(); });
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);
})();
