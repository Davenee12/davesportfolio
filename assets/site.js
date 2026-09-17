/* Davenee James — site interactions
   Progressive enhancement: everything renders without JS; JS adds motion. */
(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ── Year ─────────────────────────────────────────────── */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ── Mobile menu ──────────────────────────────────────── */
  const burger = $('.gnav__burger');
  if (burger) {
    const menu = $('.gnav__menu');
    $$('a', menu).forEach((a, i) => a.style.setProperty('--i', i));
    const toggle = (open) => {
      const isOpen = open === undefined ? !document.body.classList.contains('menu-open') : open;
      document.body.classList.toggle('menu-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
    };
    burger.addEventListener('click', () => toggle());
    $$('a', menu).forEach((a) => a.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  }

  /* ── Split headlines into words (rise-from-mask) ─────── */
  $$('.split').forEach((el) => {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    const nodes = Array.from(el.childNodes);
    el.textContent = '';
    let i = 0;
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
          const mask = document.createElement('span');
          mask.className = 'w-mask';
          const w = document.createElement('span');
          w.className = 'w';
          w.style.setProperty('--i', i++);
          w.textContent = part;
          mask.appendChild(w);
          el.appendChild(mask);
        });
      } else if (node.nodeName === 'BR') {
        el.appendChild(document.createElement('br'));
      } else {
        // Keep inline elements (em, span) intact as a single word block
        const mask = document.createElement('span');
        mask.className = 'w-mask';
        const w = document.createElement('span');
        w.className = 'w';
        w.style.setProperty('--i', i++);
        w.appendChild(node);
        mask.appendChild(w);
        el.appendChild(mask);
      }
    });
  });

  /* ── Stagger indices ──────────────────────────────────── */
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
  });
  $$('.code[data-type] pre').forEach((pre) => {
    if ($('.ln', pre)) return;
    pre.innerHTML = pre.innerHTML.split('\n').map((l) => '<span class="ln">' + (l || ' ') + '</span>').join('');
  });
  $$('.code[data-type]').forEach((code) => {
    $$('.ln', code).forEach((ln, i) => ln.style.setProperty('--i', i));
  });

  /* ── Counters ─────────────────────────────────────────── */
  function animateCount(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.count);
    const decimals = (String(el.dataset.count).split('.')[1] || '').length;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const format = (n) => prefix + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduceMotion) { el.textContent = format(target); return; }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(tick); else el.textContent = format(target);
    };
    requestAnimationFrame(tick);
  }

  /* ── Reveal observer ──────────────────────────────────── */
  const revealTargets = $$('[data-reveal], [data-stagger], .split, .code[data-type], .dash, .skill-cat');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      $$('[data-count]', el).forEach(animateCount);
      if (el.matches('[data-count]')) animateCount(el);
      $$('.skill__fill[data-width]', el).forEach((bar, i) => {
        setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, i * 90);
      });
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  revealTargets.forEach((el) => io.observe(el));
  $$('[data-count]').forEach((el) => { if (!el.closest('[data-reveal], [data-stagger]')) io.observe(el); });

  // Hero: play immediately on load rather than waiting for scroll
  window.addEventListener('load', () => {
    $$('.hero [data-reveal], .hero .split, .hero .dash').forEach((el) => { el.classList.add('in'); io.unobserve(el); });
    setTimeout(() => $$('.hero [data-count]').forEach(animateCount), 700);
  });

  /* ── Hero parallax & fade ─────────────────────────────── */
  const heroText = $('.hero__text');
  const heroRender = $('.hero__render');
  const wideScreen = window.matchMedia('(min-width: 834px)').matches;
  if (heroText && !reduceMotion && wideScreen) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const fade = Math.max(0, 1 - y / 520);
        heroText.style.opacity = fade.toFixed(3);
        heroText.style.transform = 'translateY(' + (y * 0.18).toFixed(1) + 'px)';
        if (heroRender) heroRender.style.transform = 'translateY(' + (y * -0.06).toFixed(1) + 'px)';
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Pipeline story: active step drives sticky stage ──── */
  const steps = $$('.step');
  if (steps.length) {
    const panels = $$('.stage__panel');
    const setActive = (idx) => {
      steps.forEach((s, i) => s.classList.toggle('on', i === idx));
      panels.forEach((p, i) => p.classList.toggle('on', i === idx));
    };
    setActive(0);
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(steps.indexOf(entry.target));
      });
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    steps.forEach((s) => stepIO.observe(s));
  }

  /* ── Tab panels (SQL toggle) ──────────────────────────── */
  $$('[data-tabs]').forEach((tabs) => {
    const buttons = $$('[data-tab]', tabs);
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        const scope = tabs.dataset.tabs ? $(tabs.dataset.tabs) : document;
        $$('.panel', scope).forEach((p) => {
          const active = p.id === 'panel-' + btn.dataset.tab;
          p.classList.toggle('active', active);
          if (active) {
            $$('.code[data-type]', p).forEach((c) => { c.classList.remove('in'); requestAnimationFrame(() => c.classList.add('in')); });
            $$('[data-count]', p).forEach((c) => { delete c.dataset.done; animateCount(c); });
          }
        });
      });
    });
  });

  /* ── Dashboards grid, filters, modal ──────────────────── */
  const grid = $('#dashGrid');
  if (grid && Array.isArray(window.DASHBOARDS)) {
    const data = window.DASHBOARDS;
    const search = $('#dashSearch');
    const chips = $$('#dashChips .chip');
    const modal = $('#modal');
    let filter = 'all';

    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const matches = (d, q) => !q || (d.title + ' ' + d.desc + ' ' + d.tags.join(' ')).toLowerCase().includes(q);

    function render() {
      const q = (search ? search.value : '').trim().toLowerCase();
      const items = data.filter((d) => filter === 'all' || d.tags.includes(filter)).filter((d) => matches(d, q));
      if (!items.length) {
        grid.innerHTML = '<div class="empty"><p class="t-tagline" style="color:var(--ink)">No dashboards match.</p><p class="t-caption" style="margin-top:6px">Try another keyword or clear the filter.</p></div>';
        return;
      }
      grid.innerHTML = items.map((d, i) => `
        <article class="card dash-card" style="transition-delay:${i * 70}ms">
          <div class="dash-card__img"><img loading="lazy" src="${esc(d.img)}" alt="${esc(d.title)} dashboard preview"></div>
          <div class="dash-card__tags"><span class="tag tag--live">Live</span>${d.tags.slice(0, 2).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <h3>${esc(d.title)}</h3>
          <p>${esc(d.desc)}</p>
          <div class="card__actions">
            <a class="link link--sm" href="${esc(d.link)}" target="_blank" rel="noopener">Open in Power BI</a>
            <button class="link link--sm" type="button" data-preview="${i}">Preview</button>
          </div>
        </article>`).join('');
      requestAnimationFrame(() => $$('.dash-card', grid).forEach((c) => c.classList.add('in')));
      $$('[data-preview]', grid).forEach((btn) => {
        btn.addEventListener('click', () => openModal(items[Number(btn.dataset.preview)]));
      });
    }

    function openModal(d) {
      if (!modal) return;
      $('#modalTitle').textContent = d.title;
      $('#modalMeta').textContent = 'Live Power BI dashboard · ' + d.tags.join(' · ');
      $('#modalImg').src = d.img;
      $('#modalImg').alt = d.title + ' dashboard preview';
      $('#modalOpen').href = d.link;
      const copy = $('#modalCopy');
      copy.textContent = 'Copy link';
      copy.onclick = async () => {
        try { await navigator.clipboard.writeText(d.link); copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy link'; }, 1400); } catch (e) { /* clipboard unavailable */ }
      };
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      $('#modalClose').focus();
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => { $('#modalImg').src = ''; }, 350);
    }
    if (modal) {
      $('#modalClose').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
    }
    chips.forEach((chip) => chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      filter = chip.dataset.filter;
      render();
    }));
    if (search) search.addEventListener('input', render);
    render();
  }
})();
