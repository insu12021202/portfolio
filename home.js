/**
 * Home-page motion. Loaded by index.html only, after main.js.
 *
 * Three layers, all skipped for prefers-reduced-motion:
 *   kinetic hero  → the title rises character by character on load, and the
 *                   glyph weight ripples around a fine pointer (Pretendard
 *                   Variable carries the wght axis for the Korean glyphs)
 *   count-up      → numbers inside the stat/metric figures count from zero
 *                   the first time they scroll into view
 *   magnetic CTA  → the hero buttons lean a few pixels toward the cursor
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(pointer: fine)');

  /* ── Kinetic hero title ───────────────────────────────────────────────── */

  var title = document.querySelector('.hero__title');

  if (title && !reduceMotion.matches) {
    var chars = [];

    // Rebuild the h1 as word spans of char spans so each glyph can move on
    // its own. Text nodes split on whitespace; the <br> and the spaces stay
    // as-is so line wrapping is unchanged. Wrapper elements like the .hl
    // highlight are kept and their text split in place.
    var splitInto = function (parent) {
      Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
          splitInto(node);
          return;
        }
        if (node.nodeType !== Node.TEXT_NODE) return;
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var word = document.createElement('span');
          word.className = 'kinetic-word';
          part.split('').forEach(function (ch) {
            var span = document.createElement('span');
            span.className = 'kinetic-char';
            span.style.setProperty('--ci', String(chars.length));
            span.textContent = ch;
            word.appendChild(span);
            chars.push(span);
          });
          frag.appendChild(word);
        });
        parent.replaceChild(frag, node);
      });
    };
    splitInto(title);

    title.classList.add('is-split');
    // Double rAF: let the hidden state paint once before releasing it.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        title.classList.add('is-ready');
      });
    });

    // Weight ripple. Char centers are cached per frame batch and refreshed
    // on resize; each glyph within the radius eases toward a lighter weight.
    if (finePointer.matches) {
      var RADIUS = 150;
      var BASE_WGHT = 800;
      var MIN_WGHT = 310;
      var centers = null;
      var pointer = null;
      var rippleTicking = false;

      var measure = function () {
        centers = chars.map(function (span) {
          var r = span.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
      };

      var applyRipple = function () {
        rippleTicking = false;
        if (!centers) measure();
        for (var i = 0; i < chars.length; i++) {
          var dx = centers[i].x - pointer.x;
          var dy = centers[i].y - pointer.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < RADIUS) {
            var t = 1 - d / RADIUS;
            var wght = Math.round(BASE_WGHT - t * t * (BASE_WGHT - MIN_WGHT));
            chars[i].style.fontVariationSettings = "'wght' " + wght;
          } else if (chars[i].style.fontVariationSettings) {
            chars[i].style.fontVariationSettings = '';
          }
        }
      };

      title.addEventListener('pointermove', function (event) {
        pointer = { x: event.clientX, y: event.clientY };
        if (rippleTicking) return;
        rippleTicking = true;
        requestAnimationFrame(applyRipple);
      });

      title.addEventListener('pointerleave', function () {
        chars.forEach(function (span) {
          span.style.fontVariationSettings = '';
        });
      });

      window.addEventListener('resize', function () {
        centers = null;
      });
      // Rects settle after the entrance transition finishes.
      window.addEventListener('load', function () {
        setTimeout(function () { centers = null; }, 1200);
      });
    }
  }

  /* ── Count-up figures ─────────────────────────────────────────────────── */

  var COUNT_SELECTOR = '.stat__value, .metric__value';
  var NUM_RE = /\d[\d,]*(?:\.\d+)?/g;

  function formatNumber(value, decimals, grouped) {
    var text = value.toFixed(decimals);
    if (grouped) {
      var parts = text.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      text = parts.join('.');
    }
    return text;
  }

  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    var counters = [];

    Array.prototype.slice.call(document.querySelectorAll(COUNT_SELECTOR)).forEach(function (el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach(function (node) {
        if (!NUM_RE.test(node.textContent)) return;
        NUM_RE.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var rest = node.textContent;
        var match;
        var cursor = 0;
        while ((match = NUM_RE.exec(rest)) !== null) {
          if (match.index > cursor) {
            frag.appendChild(document.createTextNode(rest.slice(cursor, match.index)));
          }
          var token = match[0];
          var span = document.createElement('span');
          span.className = 'count-num';
          span.textContent = token;
          frag.appendChild(span);
          counters.push({
            span: span,
            target: parseFloat(token.replace(/,/g, '')),
            decimals: (token.split('.')[1] || '').length,
            grouped: token.indexOf(',') !== -1,
            done: false
          });
          cursor = match.index + token.length;
        }
        if (cursor < rest.length) {
          frag.appendChild(document.createTextNode(rest.slice(cursor)));
        }
        node.parentNode.replaceChild(frag, node);
      });
    });

    var runCounter = function (counter) {
      var DURATION = 900;
      var start = null;
      var step = function (now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / DURATION, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        counter.span.textContent = formatNumber(
          counter.target * eased, counter.decimals, counter.grouped
        );
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        counters.forEach(function (counter) {
          if (counter.done || !entry.target.contains(counter.span)) return;
          counter.done = true;
          runCounter(counter);
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    Array.prototype.slice.call(document.querySelectorAll(COUNT_SELECTOR)).forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ── Contact highlight sweep ──────────────────────────────────────────── */

  var contactTitle = document.querySelector('.contact__title');

  if (contactTitle && !reduceMotion.matches && 'IntersectionObserver' in window) {
    contactTitle.classList.add('hl-armed');
    var inkObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        contactTitle.classList.add('is-inked');
        inkObserver.disconnect();
      });
    }, { threshold: 0.6 });
    inkObserver.observe(contactTitle);
  }

  /* ── Magnetic hero buttons ────────────────────────────────────────────── */

  if (!reduceMotion.matches && finePointer.matches) {
    var PULL = 0.22;
    var MAX_SHIFT = 7;

    Array.prototype.slice.call(document.querySelectorAll('.hero__actions .btn')).forEach(function (btn) {
      btn.classList.add('is-magnetic');

      btn.addEventListener('pointermove', function (event) {
        var rect = btn.getBoundingClientRect();
        var dx = (event.clientX - (rect.left + rect.width / 2)) * PULL;
        var dy = (event.clientY - (rect.top + rect.height / 2)) * PULL;
        dx = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dx));
        dy = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dy));
        btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      });

      btn.addEventListener('pointerleave', function () {
        btn.style.transform = '';
      });
    });
  }
})();
