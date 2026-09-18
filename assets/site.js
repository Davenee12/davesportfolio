/* Davenee James — site interactions
   Progressive enhancement: everything renders without JS.
   JS adds: theme toggle, mobile menu, tabs, code expanders,
   one subtle reveal, and the dashboard preview modal. */
(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Year ─────────────────────────────────────────────── */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ── Theme (light / dark) ─────────────────────────────── */
  const THEME_KEY = 'theme';
  const THEME_COLORS = { light: '#faf9f6', dark: '#0f0e0c' };
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function currentTheme() {
    const forced = root.getAttribute('data-theme');
    if (forced === 'light' || forced === 'dark') return forced;
    return systemDark.matches ? 'dark' : 'light';
  }
  function paintThemeColor() {
    const theme = currentTheme();
    // Replace the media-specific meta tags with one explicit value so the browser chrome follows the page.
    $$('meta[name="theme-color"][media]').forEach((m) => m.remove());
    let meta = $('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLORS[theme];
    $$('.theme-btn').forEach((btn) => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.setAttribute('title', theme === 'dark' ? 'Light mode' : 'Dark mode');
    });
  }
  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage unavailable */ }
    paintThemeColor();
  }
  $$('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
  });
  systemDark.addEventListener('change', paintThemeColor);
  paintThemeColor();

  /* ── Mobile menu ──────────────────────────────────────── */
  const burger = $('.nav__burger');
  const menu = $('.menu');
  if (burger && menu) {
    const toggle = (open) => {
      const isOpen = open === undefined ? !document.body.classList.contains('menu-open') : open;
      document.body.classList.toggle('menu-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', () => toggle());
    $$('a', menu).forEach((a) => a.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) toggle(false); });
  }

  /* ── Tabs ─────────────────────────────────────────────── */
  $$('[data-tabs]').forEach((tablist) => {
    const tabs = $$('[role="tab"]', tablist);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls'))).filter(Boolean);
    const activate = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => p.classList.toggle('is-active', p.id === tab.getAttribute('aria-controls')));
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
        activate(tabs[next], true);
      });
    });
    const initial = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    if (initial) activate(initial);
  });

  /* ── Collapsible code blocks ──────────────────────────── */
  $$('.code--collapsible').forEach((code) => {
    const pre = $('pre', code);
    if (!pre) return;
    const lines = pre.textContent.split('\n').length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code__more';
    btn.setAttribute('aria-expanded', 'false');
    const label = () => (code.classList.contains('is-open') ? 'Collapse' : 'Show full query · ' + lines + ' lines');
    btn.innerHTML = '<span></span><svg class="icon" aria-hidden="true"><use href="#i-chevron"/></svg>';
    const text = $('span', btn);
    text.textContent = label();
    btn.addEventListener('click', () => {
      const open = code.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      text.textContent = label();
      if (!open) code.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    code.appendChild(btn);
  });

  /* ── Reveal (one motion, everywhere) ──────────────────── */
  const targets = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => {
      if (el.closest('.hero')) { requestAnimationFrame(() => el.classList.add('in')); return; }
      io.observe(el);
    });
  }

  /* ── Dashboard preview modal ──────────────────────────── */
  const modal = $('#modal');
  if (modal) {
    const img = $('#modalImg');
    const open = (card) => {
      $('#modalTitle').textContent = card.dataset.title || $('h3', card).textContent;
      $('#modalMeta').textContent = card.dataset.meta || 'Live Power BI dashboard';
      img.src = card.dataset.img;
      img.alt = ($('h3', card).textContent || 'Dashboard') + ' preview';
      $('#modalOpen').href = card.dataset.link;
      const copy = $('#modalCopy');
      copy.textContent = 'Copy link';
      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(card.dataset.link);
          copy.textContent = 'Copied';
          setTimeout(() => { copy.textContent = 'Copy link'; }, 1400);
        } catch (e) { /* clipboard unavailable */ }
      };
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      $('#modalClose').focus();
    };
    const close = () => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => { img.removeAttribute('src'); }, 300);
    };
    $$('[data-preview]').forEach((btn) => {
      btn.addEventListener('click', () => { const card = btn.closest('.card'); if (card) open(card); });
    });
    $('#modalClose').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  }
})();
