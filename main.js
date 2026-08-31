/**
 * Portfolio — page behaviour.
 *
 * Replaces the three pieces of state the design canvas held in DCLogic:
 *   active   → which nav link is highlighted (scroll spy)
 *   menuOpen → the mobile menu panel
 *   lightbox → the full-screen screenshot viewer
 */
(function () {
  'use strict';

  var SECTION_IDS = ['about', 'work', 'experience', 'capabilities', 'contact'];

  /* ── Scroll spy ───────────────────────────────────────────────────────── */

  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.site-nav__links a')
  );

  function setActive(id) {
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + id) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  // The design's band: a section is active once it occupies the slice of the
  // viewport between 35% and 45% down.
  //
  // This is computed from geometry on every scroll rather than driven by
  // IntersectionObserver transitions. An observer only reports crossings, so
  // arriving via an anchor (index.html#work from a detail page, or any nav
  // click) can land with no crossing to report and leave the previous link
  // highlighted.
  var sections = SECTION_IDS.map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);

  function currentSection() {
    var top = window.innerHeight * 0.35;
    var bottom = window.innerHeight * 0.45;
    var match = null;
    var fallback = sections[0];

    for (var i = 0; i < sections.length; i++) {
      var rect = sections[i].getBoundingClientRect();
      // Take the LAST section in the band, not the first: where two sections
      // straddle it, the one being scrolled into is the later one.
      if (rect.top < bottom && rect.bottom > top) match = sections[i];
      // Already scrolled past — remember it in case nothing straddles.
      if (rect.top <= top) fallback = sections[i];
    }
    return match || fallback;
  }

  var ticking = false;

  function syncActive() {
    ticking = false;
    var section = currentSection();
    if (section) setActive(section.id);
  }

  function requestSync() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(syncActive);
  }

  if (sections.length) {
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
    window.addEventListener('hashchange', requestSync);
    syncActive();
  }

  /* ── Mobile menu ──────────────────────────────────────────────────────── */

  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('site-menu');

  function setMenu(open) {
    if (!toggle || !menu) return;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(menu.hidden);
    });

    // Any in-page jump closes the panel so the target section is visible.
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });
  }

  /* ── Theme toggle ─────────────────────────────────────────────────────── */

  // The inline <head> script already set data-theme before first paint;
  // this button only flips it and remembers the choice.
  var themeToggle = document.getElementById('theme-toggle');

  function syncThemeToggle() {
    if (!themeToggle) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.setAttribute('aria-checked', String(dark));
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
      syncThemeToggle();
    });
    syncThemeToggle();
  }

  /* ── Lightbox ─────────────────────────────────────────────────────────── */

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxCap = document.getElementById('lightbox-caption');
  var lightboxClose = document.getElementById('lightbox-close');
  var lastFocused = null;

  function openLightbox(trigger) {
    var img = trigger.querySelector('img');
    if (!img || !lightbox) return;

    lastFocused = trigger;
    lightboxImg.setAttribute('src', img.getAttribute('src'));
    lightboxImg.setAttribute('alt', img.getAttribute('alt') || '');
    lightboxCap.textContent = trigger.getAttribute('data-cap') || '';
    lightbox.hidden = false;
    document.body.classList.add('is-locked');
    lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImg.setAttribute('src', '');
    lightboxImg.setAttribute('alt', '');
    lightboxCap.textContent = '';
    document.body.classList.remove('is-locked');
    if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-lightbox]');
    if (trigger) openLightbox(trigger);
  });

  // The whole overlay is the dismiss target — it carries a zoom-out cursor.
  if (lightbox) {
    lightbox.addEventListener('click', closeLightbox);
  }

  /* ── Keyboard ─────────────────────────────────────────────────────────── */

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeLightbox();
      setMenu(false);
      return;
    }

    // While the lightbox is open the close button is the only control, so
    // keep Tab from reaching the page behind it.
    if (event.key === 'Tab' && lightbox && !lightbox.hidden) {
      event.preventDefault();
      lightboxClose.focus();
    }
  });
})();
