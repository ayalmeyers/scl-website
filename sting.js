/* Logo sting (variant D). Plays once per session on the homepage, can be
   skipped with a click or any key, and is not created at all under
   prefers-reduced-motion. The page underneath is fully rendered and the
   overlay is gone by 1.5s, so it never holds back content. */
(function () {
  try {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) {}
  try {
    if (sessionStorage.getItem('scl-sting')) return;
    sessionStorage.setItem('scl-sting', '1');
  } catch (e) {
    return; // storage blocked: skip rather than replay on every page view
  }

  var el = document.createElement('div');
  el.className = 'sting';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<img class="sting__mark" src="logo-mark.png" alt="" width="540" height="467">' +
                 '<img class="sting__word" src="logo-wordmark.png" alt="" width="651" height="275">';
  document.documentElement.appendChild(el);

  var done = false, t1;
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(t1);
    document.removeEventListener('keydown', skip, true);
    el.classList.add('is-out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
  }
  function skip() { finish(); }
  el.addEventListener('click', skip);
  document.addEventListener('keydown', skip, true);
  t1 = setTimeout(finish, 1100);   // dissolve starts; fully clear at about 1.5s
})();
