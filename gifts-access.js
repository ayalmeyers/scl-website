/* Gifts access (gifts.html)
   The catalog and the order settings (notification addresses, copy) are
   stored encrypted in gifts.html (<script id="gifts-vault">). They decrypt
   only with the gifts password: PBKDF2-HMAC-SHA256 (600,000+ iterations)
   derives an AES-256-GCM key, all through the browser's built-in WebCrypto.
   Nothing is sent anywhere to unlock. After unlocking, the decrypted
   payload becomes window.SCL_GIFTS_CONFIG and window.SCL_GIFTS_PRODUCTS and
   gifts-app.js (the storefront) loads.
   "Remember me" keeps the derived key (never the password) in this
   browser's localStorage; otherwise the key lives only for this tab.
   Re-encrypting the page (scripts/encrypt-team.mjs --page gifts) changes the
   salt, so any remembered key stops working and people are asked again.
   Same format and flow as team-access.js; keep the two in step. */
(function () {
  "use strict";

  var STORE_KEY = "scl-gifts-key";
  var vaultEl = document.getElementById("gifts-vault");
  var form = document.getElementById("gifts-form");
  if (!vaultEl || !form) return;

  var locked = document.getElementById("gifts-locked");
  var open = document.getElementById("gifts-open");
  var pwInput = document.getElementById("gifts-password");
  var remember = document.getElementById("gifts-remember");
  var submitBtn = form.querySelector("button[type=submit]");
  var errorEl = document.getElementById("gifts-error");
  var lede = document.getElementById("gifts-lede");
  var subtle = window.crypto && window.crypto.subtle;
  var appLoaded = false;

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

  // ---- opening the store -------------------------------------------
  function render(content, focusPanel) {
    window.SCL_GIFTS_CONFIG = content.config || {};
    window.SCL_GIFTS_PRODUCTS = content.products || [];
    document.getElementById("gifts-remembered").hidden = !isRemembered();
    locked.hidden = true;
    open.hidden = false;
    if (lede) lede.textContent = lede.getAttribute("data-open");
    if (!appLoaded) {
      appLoaded = true;
      var s = document.createElement("script");
      s.src = "gifts-app.js";
      s.onload = function () { if (focusPanel) document.getElementById("main").focus(); };
      document.body.appendChild(s);
    }
  }

  // ---- wire up -----------------------------------------------------
  if (!subtle || !vault || !vault.kdf || !vault.cipher || !vault.ct) {
    showError(!subtle
      ? "This browser can't open the gifts page. Use a current version of Chrome, Safari, Edge or Firefox."
      : "The gifts page isn't set up yet.");
    submitBtn.disabled = true;
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = pwInput.value;
    if (!pw) { showError("Enter the password."); pwInput.focus(); return; }
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

  // Signing out clears the key and reloads, so the catalog and any
  // selection in progress leave the page's memory.
  document.getElementById("gifts-signout").addEventListener("click", function () {
    clearKeys();
    // the storefront keeps the selection and delivery details in this browser
    ["sclgifts.cart.v1", "sclgifts.form.v1", "sclgifts.last.v1"].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    try { sessionStorage.removeItem("sclgifts.ref.v1"); } catch (e) {}
    window.location.replace(window.location.pathname);
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
