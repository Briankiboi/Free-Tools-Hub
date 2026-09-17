/* ════════════════════════════════════════════════════════════════════
   DM Solution Technologies Toolkits · Shared App Library (app.js)
   Loaded by every tool page + the hub. Fully offline, no dependencies
   except Alpine.js (CDN, degrades gracefully without it).
   ════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const FAV_STORAGE_KEY = 'dm_solution_tools_favorites';

    /* ── DOM helpers ─────────────────────────────────────────────────── */
    const $  = (sel, ctx) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

    /* ── Escape HTML ─────────────────────────────────────────────────── */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ── Toast ───────────────────────────────────────────────────────── */
    let toastEl, toastTimer;
    function toast(msg, type = 'ok') {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'app-toast';
            toastEl.innerHTML = '<span></span>';
            document.body.appendChild(toastEl);
        }
        toastEl.className = 'toast show ' + type;
        toastEl.querySelector('span').textContent = msg;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
    }

    /* ── Download helper ─────────────────────────────────────────────── */
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 900);
        toast('Downloading ' + filename);
    }
    function downloadDataUrl(dataUrl, filename) {
        const a = document.createElement('a');
        a.href = dataUrl; a.download = filename;
        document.body.appendChild(a); a.click();
        setTimeout(() => a.remove(), 900);
        toast('Downloading ' + filename);
    }

    /* ── File reader helpers ─────────────────────────────────────────── */
    function readFileAsDataURL(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => rej(r.error || new Error('read failed'));
            r.readAsDataURL(file);
        });
    }
    function readFileAsText(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => rej(r.error || new Error('read failed'));
            r.readAsText(file);
        });
    }

    /* ── Copy to clipboard with fallback ─────────────────────────────── */
    async function copyText(text, btn = null) {
        const old = btn ? btn.innerHTML : null;
        try { await navigator.clipboard.writeText(text); }
        catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (_) {}
            ta.remove();
        }
        if (btn) {
            btn.innerHTML = '✓ Copied!';
            setTimeout(() => { if (old) btn.innerHTML = old; }, 1500);
        }
        toast('Copied to clipboard');
    }

    /* ── Formatting helpers ──────────────────────────────────────────── */
    const fmt = {
        num(n, d = 0) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); },
        bytes(b, d = 2) {
            if (b == null || isNaN(b)) return '—';
            if (b === 0) return '0 B';
            const u = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), u.length - 1);
            return (b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : d) + ' ' + u[i];
        },
        date(ts, m = {}) {
            return new Date(ts).toLocaleDateString('en-GB', Object.assign({ day: '2-digit', month: 'short', year: 'numeric' }, m));
        },
        time(ts) { return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); },
        rel(ts) {
            const s = (Date.now() - new Date(ts)) / 1000;
            if (s < 45) return 'just now';
            if (s < 3600) return Math.floor(s / 60) + 'm ago';
            if (s < 86400) return Math.floor(s / 3600) + 'h ago';
            return Math.floor(s / 86400) + 'd ago';
        }
    };

    /* ── URL utils ───────────────────────────────────────────────────── */
    function isHttpUrl(s) {
        try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
        catch (e) { return false; }
    }

    /* ── Favorites (Saved) — localStorage ────────────────────────────── */
    function getFavorites() {
        try { return JSON.parse(localStorage.getItem(FAV_STORAGE_KEY)) || []; }
        catch (e) { return []; }
    }
    function isFavorite(key) { return getFavorites().includes(key); }
    function toggleFavorite(key) {
        let favs = getFavorites();
        const on = favs.includes(key);
        favs = on ? favs.filter(k => k !== key) : favs.concat(key);
        localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favs));
        if (window.refreshFavoriteButtons) window.refreshFavoriteButtons();
        toast(on ? 'Removed from Saved' : 'Saved ⭐');
    }

    /* ── Tool page scaffolding ───────────────────────────────────────── */
    function toolPageInit(rawKey) {
        const toolKey = String(rawKey || '').replace(/_/g, '-');
        $$('[data-fav]').forEach(btn => {
            btn.addEventListener('click', () => toggleFavorite(toolKey));
            btn.classList.toggle('is-fav', isFavorite(toolKey));
        });
        /* Set page title / description meta if overridden */
        const cm = $('#page-meta-title');
        if (cm && cm.dataset.title) document.title = cm.dataset.title;
        /* Dark-mode toggle */
        const dbtn = $('#dark-toggle');
        if (dbtn) dbtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            toast(document.documentElement.classList.contains('dark') ? 'Dark mode on' : 'Light mode on');
        });
        /* footer year */
        $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
        window.toolKey = toolKey;
    }

    /* ── Hub grid helpers (used on index.html) ───────────────────────── */
    const CATEGORY_META = {
        dev:      { icon: '💻', label: 'Dev & Code',     grad: 'from-blue-600 to-indigo-600' },
        seo:      { icon: '📈', label: 'SEO & Search',   grad: 'from-emerald-600 to-teal-600' },
        business: { icon: '💼', label: 'Business',       grad: 'from-amber-500 to-orange-600' },
        image:    { icon: '🎨', label: 'Images',         grad: 'from-purple-600 to-fuchsia-600' },
        pdf:      { icon: '📑', label: 'PDF',            grad: 'from-rose-600 to-pink-600' },
        security: { icon: '🛡️', label: 'Security & SSL', grad: 'from-red-600 to-rose-600' },
        domain:   { icon: '🌐', label: 'Domains & DNS',  grad: 'from-cyan-600 to-sky-600' },
        network:  { icon: '⚡', label: 'Network',        grad: 'from-slate-700 to-gray-800' },
        media:    { icon: '🎥', label: 'Video & Audio',   grad: 'from-violet-600 to-purple-700' },
        general:  { icon: '✨', label: 'General',        grad: 'from-gray-500 to-slate-600' }
    };

    function categoryLabel(cat) { return (CATEGORY_META[cat] && CATEGORY_META[cat].label) || cat; }

    /* ── Hub (landing page) ─────────────────────────────────────────── */
    const hubState = { q: '', cat: 'all', saved: false, data: [] };

    function cardHtml(t) {
        const icon = t.icon || '🛠️';
        const cat = t.category_label || categoryLabel(t.category);
        const uses = t.usage_count == null ? 0 : t.usage_count;
        return '<a class="card" href="' + esc(t.url) + '" data-key="' + esc(t.key) + '" data-category="' + esc(t.category) + '">'
            + '<span class="card-icon" aria-hidden="true">' + icon + '</span>'
            + '<h3>' + esc(t.name) + '</h3>'
            + '<p>' + esc(t.desc) + '</p>'
            + '<div class="meta">'
            +   '<span class="uses">' + fmt.num(uses) + ' uses</span>'
            +   '<span class="pill">' + esc(cat) + '</span>'
            + '</div>'
            + '<span class="card-action">View Details <span class="arrow" aria-hidden="true">→</span></span>'
            + '</a>';
    }

    function buildChips() {
        const holder = $('#category-chips');
        if (!holder) return;
        const cats = [];
        for (const t of hubState.data) {
            if (!cats.includes(t.category)) cats.push(t.category);
        }
        cats.sort((a, b) => {
            const ia = CATEGORY_META[a] ? Object.keys(CATEGORY_META).indexOf(a) : 99;
            const ib = CATEGORY_META[b] ? Object.keys(CATEGORY_META).indexOf(b) : 99;
            return ia - ib;
        });
        const chips = ['all'].concat(cats);
        holder.innerHTML = chips.map(c => {
            const count = c === 'all' ? hubState.data.length : hubState.data.filter(t => t.category === c).length;
            return '<button type="button" class="chip' + (hubState.cat === c ? ' active' : '') + '" data-cat="' + esc(c) + '">'
                + esc(c === 'all' ? 'All' : categoryLabel(c)) + '<span class="count">' + count + '</span></button>';
        }).join('');
        $$('.chip', holder).forEach(ch => ch.addEventListener('click', () => {
            hubState.cat = ch.dataset.cat;
            renderHub();
        }));
    }

    function filteredTools() {
        const q = hubState.q.trim().toLowerCase();
        let list = hubState.data;
        if (hubState.cat !== 'all') list = list.filter(t => t.category === hubState.cat);
        if (hubState.saved) {
            const favs = getFavorites();
            list = list.filter(t => favs.includes(t.key));
        }
        if (q) {
            list = list.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.desc.toLowerCase().includes(q) ||
                (t.category_label || '').toLowerCase().includes(q) ||
                (t.key || '').toLowerCase().includes(q)
            );
        }
        return list;
    }

    function renderHub() {
        const grid = $('#tools-grid');
        const counter = $('#tool-count');
        const heroCounter = $('#tool-count-hero');
        const savedBtn = $('#btn-saved');
        const list = filteredTools();
        if (grid) {
            const emptyMsg = hubState.saved
                ? 'No Saved tools yet — open any tool page and hit the ⭐ to add it here.'
                : 'No tools match your search.';
            grid.innerHTML = list.map(cardHtml).join('') || '<p class="output-text" style="text-align:center;color:var(--muted);grid-column:1/-1;padding:2rem 0">' + emptyMsg + '</p>';
        }
        let countTxt;
        if (hubState.saved) countTxt = list.length + ' saved tool' + (list.length === 1 ? '' : 's');
        else if (hubState.q || hubState.cat !== 'all') countTxt = list.length + ' of ' + hubState.data.length + ' tools';
        else countTxt = hubState.data.length + ' tools';
        if (counter) counter.textContent = countTxt;
        if (heroCounter) heroCounter.textContent = hubState.data.length;
        if (savedBtn) savedBtn.textContent = '⭐ Saved (' + getFavorites().filter(k => hubState.data.some(t => t.key === k)).length + ')';
        buildChips();
        if ($('#category-chips')) $('#category-chips').classList.toggle('hidden', hubState.saved);
        if (savedBtn) savedBtn.classList.toggle('btn-accent', hubState.saved);
    }

    function toggleSavedView() {
        hubState.saved = !hubState.saved;
        renderHub();
    }

    function hubInit(data) {
        hubState.data = (data || []).slice();
        const input = $('#tool-search-input');
        if (input) {
            input.addEventListener('input', () => { hubState.q = input.value; renderHub(); });
            input.addEventListener('keyup', e => { if (e.key === 'Enter') renderHub(); });
        }
        renderHub();
    }

    window.refreshFavoriteButtons = function () { renderHub(); };
    window.toggleSavedView = toggleSavedView;
    window.hubInit = hubInit;

    /* Expose */
    window.ToolsApp = {
        $, $$, esc, toast, downloadBlob, downloadDataUrl, readFileAsDataURL, readFileAsText,
        copyText, fmt, isHttpUrl, getFavorites, isFavorite, toggleFavorite,
        toolPageInit, categoryLabel, CATEGORY_META, hubInit
    };

    /* Auto-init on hub page only */
    document.addEventListener('DOMContentLoaded', () => {
        if (window.TOOL_CATALOG && $('#tools-grid')) {
            if (window.hubInit) window.hubInit(window.TOOL_CATALOG);
        }
    });
})();
