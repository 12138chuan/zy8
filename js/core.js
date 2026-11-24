/* 胃安 / TummyBuddy — 核心状态、路由、定位、语音与通用 UI */
(function () {
  'use strict';
  const WA = window.WA;

  /* ---------- 基础 ---------- */
  WA.APP_NAME = '胃安';
  WA.APP_NAME_EN = 'TummyBuddy';
  WA.VERSION = '0.3.0';
  WA.STORAGE_KEY = 'weian.tummybuddy.v2';
  WA.screens = {};
  WA.appScreens = ['home', 'profile', 'emergency', 'moderate', 'mild', 'result', 'learn', 'about'];

  const DEFAULT_PROFILE = {
    name: '', age: '', ageRange: '', sex: '', bodyType: '', pregnant: 'no', bloodType: '',
    phone: '', address: '',
    contactName: '', contactRelation: '', contactPhone: '',
    conditions: [], meds: [], medsOther: '', medsAnswered: false,
    allergies: '', noAllergies: false, unsureAllergies: false,
    notes: '', records: [], recordsConsent: false,
    symptoms: []
  };

  function defaultMild() {
    return {
      step: 0,
      answers: {
        chief: [], location: '', duration: '', severity: 5,
        description: '', keywords: [],
        meal: '', stool: '', coldHeat: '', sleep: '', mood: '',
        diet: [], tongueColor: '', tongueCoat: '', teethMarks: '', nails: '',
        redFlags: []
      },
      photos: {},
      result: null
    };
  }

  function defaultModerate() {
    return {
      cluster: '', step: 0,
      answers: {
        redFlags: [], duration: '', severity: 5, meal: '', symptoms: [],
        fever: '', jaundice: '', weightLoss: '', blackStool: '', nightPain: '',
        fatty: '', shoulder: '', dehydration: '', age: ''
      },
      result: null
    };
  }

  const DEFAULT_STATE = {
    version: 2,
    demo: false,
    lang: null,
    phase: 'language',
    setupStep: 0,
    screen: 'home',
    onboarded: false,
    profileOnboarding: false,
    consent: false,
    consentAt: null,
    location: { status: 'idle', lat: null, lng: null, accuracy: null, updatedAt: null, address: '', region: '', source: '', components: null, geocoding: false, geocodeError: false, geocodeProvider: '', geocodePartial: false },
    profile: JSON.parse(JSON.stringify(DEFAULT_PROFILE)),
    settings: { bigText: false, resultBig: false, autoSend: false },
    mild: defaultMild(),
    moderate: defaultModerate(),
    result: null,
    ui: { music: false, breathing: false, speaking: false }
  };

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function mergeDeep(base, saved) {
    if (!saved || typeof saved !== 'object') return clone(base);
    const out = Array.isArray(base) ? [] : {};
    Object.keys(base).forEach((key) => {
      if (saved[key] === undefined) out[key] = clone(base[key]);
      else if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) out[key] = mergeDeep(base[key], saved[key]);
      else out[key] = saved[key];
    });
    return out;
  }

  WA.state = mergeDeep(DEFAULT_STATE, null);
  WA.defaults = { profile: DEFAULT_PROFILE };

  /* ---------- 存取 ---------- */
  WA.load = function () {
    try {
      const raw = localStorage.getItem(WA.STORAGE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      WA.state = mergeDeep(DEFAULT_STATE, saved);
      if (WA.state.location && WA.state.location.source === 'manual') {
        // 旧版本手动地址可能残留旧 GPS 坐标，医院搜索会误用旧位置。
        WA.state.location.lat = null;
        WA.state.location.lng = null;
        WA.state.location.accuracy = null;
      }
      WA.state.phase = WA.state.phase === 'setup' ? 'setup' : (WA.state.lang ? 'app' : 'language');
      return true;
    } catch (err) {
      return false;
    }
  };

  WA.save = function (quiet = true) {
    if (WA.state.demo) return;
    try {
      const payload = {
        version: 2,
        lang: WA.state.lang,
        phase: WA.state.phase,
        setupStep: WA.state.setupStep,
        onboarded: WA.state.onboarded,
        profileOnboarding: WA.state.profileOnboarding,
        consent: WA.state.consent,
        consentAt: WA.state.consentAt,
        location: WA.state.location,
        profile: WA.state.profile,
        settings: WA.state.settings
      };
      localStorage.setItem(WA.STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      // 病历缩略图可能超出 localStorage 配额，退化为只存文字资料。
      try {
        const p = clone(WA.state.profile);
        p.records = [];
        localStorage.setItem(WA.STORAGE_KEY, JSON.stringify({
          version: 2, lang: WA.state.lang, phase: WA.state.phase, setupStep: WA.state.setupStep,
          onboarded: WA.state.onboarded, profileOnboarding: WA.state.profileOnboarding,
          consent: WA.state.consent, consentAt: WA.state.consentAt,
          location: WA.state.location, profile: p, settings: WA.state.settings
        }));
        WA.toast(WA.L('病历照片太大，未保存；其他资料已保存。', 'The record image was too large to save; the rest is saved.'), 'warn');
      } catch (err2) {
        if (!quiet) WA.toast(WA.L('本机存储空间不足，资料未保存。', 'Local storage is full. Your file was not saved.'), 'error');
      }
    }
  };

  WA.clearAll = function () {
    try { localStorage.removeItem(WA.STORAGE_KEY); } catch (err) { /* ignore */ }
    WA.stopSpeak();
    WA.stopMusic();
    WA.stopLocationWatch();
    document.body.classList.remove('big-text', 'music-on', 'emergency-bigtext');
    WA.state = clone(DEFAULT_STATE);
    WA.state.phase = 'language';
    WA.closeModal();
    WA.renderAll();
  };

  /* ---------- 语言与文本 ---------- */
  WA.lang = function () { return WA.state.lang === 'en' ? 'en' : 'zh'; };
  WA.L = function (zh, en) { return WA.lang() === 'en' ? en : zh; };
  WA.tx = function (obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[WA.lang()] != null ? obj[WA.lang()] : (obj.zh || obj.en || '');
  };
  WA.pick = WA.tx;

  WA.esc = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  WA.pct = function (n) { return Math.max(0, Math.min(100, Math.round(n))); };

  WA.formatDate = function (ts) {
    const d = ts ? new Date(ts) : new Date();
    const loc = WA.lang() === 'en' ? 'en-GB' : 'zh-CN';
    return d.toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  WA.formatTime = function (ts) {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString(WA.lang() === 'en' ? 'en-GB' : 'zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  WA.timeAgo = function (ts) {
    if (!ts) return WA.L('尚未更新', 'Not updated yet');
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 10) return WA.L('刚刚', 'just now');
    if (s < 60) return WA.L(s + ' 秒前', s + 's ago');
    const m = Math.floor(s / 60);
    if (m < 60) return WA.L(m + ' 分钟前', m + ' min ago');
    const h = Math.floor(m / 60);
    return WA.L(h + ' 小时前', h + 'h ago');
  };

  /* ---------- 图标与品牌 ---------- */
  WA.icon = function (name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  };

  WA.logo = function (size) {
    const s = size || 44;
    return '<svg class="logo-svg" width="' + s + '" height="' + s + '" viewBox="0 0 64 64" role="img" aria-label="' +
      WA.L('胃安小安标志', 'TummyBuddy logo') + '">' +
      '<rect width="64" height="64" rx="18" fill="#2F5A4A"/>' +
      '<path d="M30 12.5c-6.4 2-8.6 8.4-4.4 13.5 2.2 2.7 1 4.9-1.8 7.6-6.1 5.8-7 13.3-1.9 18.5 6.3 6.4 18 6 24.5-.8 5.7-6.1 4.5-14.6-1.4-20.3-4.2-4.1-8.9-6.1-10.4-11.1-.8-3.2-1.9-6.1-4.6-7.4Z" fill="#F6EEDD" stroke="#F6EEDD" stroke-width="1.2"/>' +
      '<path d="M35.5 12.8c.4-3.7 3.2-5.5 6.4-4.6 2.1.6 3.4 2.5 3.2 4.6-2.8.1-5.8.7-9.6 2.1Z" fill="#D9A05B"/>' +
      '<circle cx="27.6" cy="31" r="1.7" fill="#2F5A4A"/><circle cx="37.8" cy="31" r="1.7" fill="#2F5A4A"/>' +
      '<path d="M28.9 37.2c2 2.2 5 2.2 7 .1" fill="none" stroke="#2F5A4A" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="23.4" cy="35.7" r="2.4" fill="#D98B72" opacity=".65"/><circle cx="42.2" cy="35.7" r="2.4" fill="#D98B72" opacity=".65"/>' +
      '</svg>';
  };

  WA.mascot = function (size, mood) {
    const s = size || 120;
    return '<svg class="mascot-svg mood-' + (mood || 'calm') + '" width="' + s + '" height="' + s + '" viewBox="0 0 140 140" role="img" aria-label="' +
      WA.L('小安，一个会陪你说话的胃', 'An, a friendly stomach companion') + '">' +
      '<ellipse cx="70" cy="124" rx="36" ry="6" fill="#2F5A4A" opacity=".10"/>' +
      '<path d="M65 30c-13 4-17 17-9 27 4 5 2 9-4 14-12 11-14 26-4 36 12 13 35 12 47-2 11-12 9-28-3-39-8-8-17-12-20-22-2-6-3-11-7-14Z" fill="#F6EEDD" stroke="#2F5A4A" stroke-width="3"/>' +
      '<path d="M76 28c1-7 6-10 12-8 4 1 6 5 6 9-5 0-10 1-18 4Z" fill="#D9A05B"/>' +
      '<path d="M54 58c3 6 8 8 14 7" fill="none" stroke="#D98B72" stroke-width="2" stroke-linecap="round" opacity=".5"/>' +
      '<circle cx="61" cy="72" r="3.4" fill="#2F5A4A"/><circle cx="84" cy="72" r="3.4" fill="#2F5A4A"/>' +
      '<circle cx="52" cy="80" r="4.6" fill="#D98B72" opacity=".55"/><circle cx="93" cy="80" r="4.6" fill="#D98B72" opacity=".55"/>' +
      '<path d="M64 84c4 4 10 4 14 0" fill="none" stroke="#2F5A4A" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M47 91c-7 1-13 5-16 11M101 91c7 1 13 5 16 11" fill="none" stroke="#2F5A4A" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="31" cy="103" r="4" fill="#F6EEDD" stroke="#2F5A4A" stroke-width="2.4"/>' +
      '<circle cx="117" cy="103" r="4" fill="#F6EEDD" stroke="#2F5A4A" stroke-width="2.4"/>' +
      '<path d="M108 51c4-2 8-2 12 1" fill="none" stroke="#2F5A4A" stroke-width="2.4" stroke-linecap="round" opacity=".65"/>' +
      '</svg>';
  };

  /* ---------- Toast ---------- */
  WA.toast = function (message, type, duration) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.innerHTML = (type === 'error' ? WA.icon('alert') : type === 'warn' ? WA.icon('alert') : WA.icon('info')) +
      '<span>' + WA.esc(message) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () { el.remove(); }, 260);
    }, duration || 2800);
  };

  /* ---------- 弹窗 ---------- */
  WA.modalState = null;
  WA.openModal = function (opts) {
    const root = document.getElementById('overlay-root');
    if (!root) return;
    WA.modalState = opts;
    const actions = opts.actions || [];
    const cls = 'modal-card' + (opts.wide ? ' modal-wide' : '') + (opts.danger ? ' modal-danger' : '');
    root.innerHTML = '<div class="overlay is-open" data-action="overlay-backdrop">' +
      '<div class="' + cls + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      (opts.dismissible === false ? '' : '<button class="modal-close" type="button" data-action="close-modal" aria-label="' + WA.L('关闭', 'Close') + '">' + WA.icon('close') + '</button>') +
      '<div class="modal-head">' + (opts.kicker ? '<p class="kicker">' + WA.esc(opts.kicker) + '</p>' : '') +
      '<h2 id="modal-title">' + opts.title + '</h2></div>' +
      '<div class="modal-body">' + opts.body + '</div>' +
      (actions.length ? '<div class="modal-actions">' + actions.map(function (a, i) {
        return '<button type="button" class="btn ' + (a.style || 'btn-ghost') + '" data-modal-action="' + i + '">' + a.label + '</button>';
      }).join('') + '</div>' : '') +
      '</div></div>';
    document.body.classList.add('modal-open');
    const first = root.querySelector('button, input, textarea, a');
    if (first) setTimeout(function () { first.focus(); }, 40);
    if (opts.onMount) opts.onMount(root);
  };

  WA.closeModal = function () {
    const modal = WA.modalState;
    if (modal && typeof modal.onClose === 'function') {
      try { modal.onClose(); } catch (err) { /* ignore */ }
    }
    const root = document.getElementById('overlay-root');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
    WA.modalState = null;
  };

  /* ---------- 路由 ---------- */
  WA.go = function (screen, opts) {
    opts = opts || {};
    if (!WA.appScreens.includes(screen)) screen = 'home';
    if (WA.state.screen !== screen && !opts.replace) {
      WA.state.screen = screen;
    } else {
      WA.state.screen = screen;
    }
    if (opts.profileOnboarding !== undefined) WA.state.profileOnboarding = opts.profileOnboarding;
    WA.state.phase = 'app';
    WA.closeModal();
    const toastRoot = document.getElementById('toast-root');
    if (toastRoot) toastRoot.innerHTML = '';
    WA.stopBreathing();
    if (screen !== 'emergency') {
      WA.stopLocationWatch();
      WA.stopMusic();
      WA.stopSpeak();
      if (WA.stopEmergencyTimer) WA.stopEmergencyTimer();
    }
    WA.renderAll();
    if (opts.scroll !== false) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (!WA.state.demo) {
      try { history.pushState({ screen: screen }, '', '#' + screen); } catch (err) { /* file:// */ }
    }
  };

  WA.back = function () {
    const s = WA.state.screen;
    if (s === 'emergency' || s === 'moderate' || s === 'mild' || s === 'result') { WA.go('home'); return; }
    if (s === 'profile' && WA.state.profileOnboarding) { WA.finishOnboarding(true); return; }
    WA.go('home');
  };

  WA.renderAll = function () {
    const app = document.getElementById('app');
    if (!app) return;
    const lang = WA.lang();
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.body.dataset.lang = lang;
    document.title = lang === 'en' ? 'TummyBuddy · Stomach Health Check' : '胃安 · 胃部健康自测';
    if (WA.state.phase !== 'app' || WA.state.screen !== 'emergency' || !WA.state.settings.bigText) document.body.classList.remove('emergency-bigtext');
    if (!WA.state.lang) {
      app.innerHTML = WA.screens.language ? WA.screens.language() : '';
      return;
    }
    if (WA.state.phase === 'setup') {
      app.innerHTML = WA.screens.setup ? WA.screens.setup() : '';
      return;
    }
    const screen = WA.appScreens.includes(WA.state.screen) ? WA.state.screen : 'home';
    WA.state.screen = screen;
    const body = WA.screens[screen] ? WA.screens[screen]() : WA.screens.home();
    app.innerHTML = WA.chrome() + '<main id="screen" class="screen screen-' + screen + '" tabindex="-1">' + body + '</main>' + WA.tabbar();
    if (WA.state.settings.bigText) document.body.classList.add('big-text'); else document.body.classList.remove('big-text');
    document.body.classList.toggle('emergency-bigtext', screen === 'emergency' && WA.state.settings.bigText);
    document.body.classList.toggle('on-emergency', screen === 'emergency');
    if (WA.state.ui.music) document.body.classList.add('music-on'); else document.body.classList.remove('music-on');
  };

  WA.renderScreen = function () {
    const main = document.getElementById('screen');
    if (!main) { WA.renderAll(); return; }
    const screen = WA.state.screen;
    main.className = 'screen screen-' + screen;
    main.innerHTML = WA.screens[screen] ? WA.screens[screen]() : '';
    const tab = document.querySelector('.tabbar');
    if (tab) tab.outerHTML = WA.tabbar();
    if (WA.state.settings.bigText) document.body.classList.add('big-text'); else document.body.classList.remove('big-text');
    document.body.classList.toggle('emergency-bigtext', screen === 'emergency' && WA.state.settings.bigText);
    document.body.classList.toggle('on-emergency', screen === 'emergency');
  };

  WA.chrome = function () {
    const s = WA.state;
    const loc = s.location;
    const located = !!(loc.lat || loc.address);
    const navItems = [
      { id: 'home', label: WA.L('首页', 'Home'), icon: 'home' },
      { id: 'triage', label: WA.L('分诊', 'Triage'), icon: 'grid' },
      { id: 'learn', label: WA.L('养胃课', 'Learn'), icon: 'book' },
      { id: 'about', label: WA.L('关于', 'About'), icon: 'info' }
    ];
    const active = s.screen === 'home' ? 'home' : (['emergency', 'moderate', 'mild', 'result'].includes(s.screen) ? 'triage' : s.screen);
    return '<header class="topbar">' +
      '<a class="brand" href="#" data-action="home" aria-label="' + WA.L('胃安首页', 'TummyBuddy home') + '">' +
        WA.logo(40) +
        '<span class="brand-copy"><strong>' + (WA.lang() === 'en' ? WA.APP_NAME_EN : WA.APP_NAME) + '</strong>' +
        '<small>' + WA.L('胃部健康自测', 'Stomach health check') + '</small></span>' +
      '</a>' +
      '<nav class="desktop-nav" aria-label="' + WA.L('主导航', 'Main navigation') + '">' +
        navItems.map(function (n) {
          return '<button type="button" class="nav-link' + (active === n.id ? ' is-active' : '') + '" data-action="nav" data-nav="' + n.id + '">' + n.label + '</button>';
        }).join('') +
      '</nav>' +
      '<div class="top-actions">' +
        '<button type="button" class="location-chip' + (located ? ' is-on' : ' is-off') + '" data-action="open-location" aria-label="' + WA.L('定位状态，点击管理', 'Location status, tap to manage') + '">' +
          '<span class="status-dot"></span><span class="location-text">' + (located ? WA.L('已定位', 'Located') : WA.L('未定位', 'No location')) + '</span>' +
        '</button>' +
        '<button type="button" class="lang-chip" data-action="toggle-lang" aria-label="' + WA.L('切换到英文', 'Switch to Chinese') + '">' + (WA.lang() === 'en' ? '中' : 'EN') + '</button>' +
        '<button type="button" class="avatar-button" data-action="nav" data-nav="profile" aria-label="' + WA.L('我的档案', 'My file') + '">' +
          (s.profile.name ? WA.esc(s.profile.name.slice(0, 1)) : WA.icon('user')) +
          '<span class="avatar-dot' + (WA.profileCompletion().score >= 60 ? ' is-ready' : '') + '"></span>' +
        '</button>' +
      '</div></header>';
  };

  WA.tabbar = function () {
    const s = WA.state.screen;
    const active = s === 'home' ? 'home' : (['emergency', 'moderate', 'mild', 'result'].includes(s) ? 'triage' : (s === 'profile' ? 'profile' : (s === 'learn' ? 'learn' : '')));
    const items = [
      { id: 'home', label: WA.L('首页', 'Home'), icon: 'home', action: 'home' },
      { id: 'triage', label: WA.L('自测', 'Check'), icon: 'grid', action: 'triage' },
      { id: 'profile', label: WA.L('档案', 'File'), icon: 'user', action: 'profile' },
      { id: 'learn', label: WA.L('养胃课', 'Learn'), icon: 'book', action: 'learn' }
    ];
    return '<nav class="tabbar" aria-label="' + WA.L('底部导航', 'Bottom navigation') + '">' +
      items.map(function (n) {
        return '<button type="button" class="tab-item' + (active === n.id ? ' is-active' : '') + '" data-action="' + n.action + '">' +
          WA.icon(n.icon) + '<span>' + n.label + '</span></button>';
      }).join('') + '</nav>';
  };

  /* ---------- 个人档案工具 ---------- */
  WA.profileCompletion = function () {
    const p = WA.state.profile;
    let score = 0;
    const items = [];
    const hasAge = (p.age && Number(p.age) > 0) || p.ageRange;
    if (hasAge) score += 15; items.push({ key: 'age', done: !!hasAge });
    if (p.sex) score += 10; items.push({ key: 'sex', done: !!p.sex });
    if (p.contactName && p.contactPhone) score += 20; items.push({ key: 'contact', done: !!(p.contactName && p.contactPhone) });
    if (p.conditions.length) score += 15; items.push({ key: 'conditions', done: p.conditions.length > 0 });
    if (p.meds.length || p.medsAnswered) score += 15; items.push({ key: 'meds', done: !!(p.meds.length || p.medsAnswered) });
    if (p.allergies || p.noAllergies || p.unsureAllergies) score += 10; items.push({ key: 'allergies', done: !!(p.allergies || p.noAllergies || p.unsureAllergies) });
    if (p.address || WA.state.location.address) score += 15; items.push({ key: 'address', done: !!(p.address || WA.state.location.address) });
    return { score: Math.min(100, score), items: items };
  };

  WA.ageLabel = function () {
    const p = WA.state.profile;
    if (p.age && Number(p.age) > 0) return WA.L(p.age + ' 岁', 'Age ' + p.age);
    if (p.ageRange) return WA.L(p.ageRange + ' 岁', p.ageRange);
    return WA.L('未填写', 'Not set');
  };

  WA.sexLabel = function () {
    const map = { male: WA.L('男', 'Male'), female: WA.L('女', 'Female'), undisclosed: WA.L('不方便透露', 'Prefer not to say') };
    return map[WA.state.profile.sex] || WA.L('未填写', 'Not set');
  };

  WA.pregnancyLabel = function () {
    const map = {
      no: WA.L('未怀孕', 'Not pregnant'), yes: WA.L('怀孕中', 'Pregnant'),
      maybe: WA.L('可能怀孕', 'Possibly pregnant'), lactation: WA.L('哺乳期', 'Breastfeeding'), na: WA.L('不适用', 'Not applicable')
    };
    return map[WA.state.profile.pregnant] || WA.L('未填写', 'Not set');
  };

  WA.isPregnant = function () {
    return ['yes', 'maybe', 'lactation'].includes(WA.state.profile.pregnant) && WA.state.profile.sex !== 'male';
  };

  WA.conditionLabels = function () {
    const ids = WA.state.profile.conditions || [];
    return ids.map(function (id) {
      const c = (WA.CHRONIC_OPTIONS || []).find(function (x) { return x.id === id; });
      return c ? WA.tx(c.label) : id;
    });
  };

  WA.medLabels = function () {
    const ids = WA.state.profile.meds || [];
    const dict = {};
    Object.keys(WA.MED_GROUPS || {}).forEach(function (g) {
      (WA.MED_GROUPS[g].items || []).forEach(function (m) { dict[m.id] = m; });
    });
    (WA.GENERAL_MEDS || []).forEach(function (m) { dict[m.id] = m; });
    return ids.map(function (id) { return dict[id] ? WA.tx(dict[id].label) : id; });
  };

  WA.hasStomachRiskMeds = function () {
    const ids = WA.state.profile.meds || [];
    const risky = ['nsaid', 'aspirin', 'steroid', 'anticoag', 'clopidogrel', 'oral_steroid'];
    return ids.some(function (id) { return risky.includes(id); });
  };

  WA.emergencyMessage = function () {
    const p = WA.state.profile;
    const loc = WA.state.location;
    const pos = loc.lat ? WA.L('坐标 ' + loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5), 'Coordinates ' + loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5)) : WA.L('暂无可用的实时坐标', 'No live coordinates');
    const region = WA.regionText(loc) || WA.L('未解析', 'Not resolved');
    const addr = WA.fullAddress(loc) || p.address || WA.L('地址未填写', 'Address not set');
    const medText = [WA.medLabels().join('、'), p.medsOther].filter(Boolean).join('；') || WA.L('未填写', 'Not set');
    const bits = [
      WA.L('【胃安急救信息】', '[TummyBuddy emergency info]'),
      WA.L('姓名：', 'Name: ') + (p.name || WA.L('未填写', 'Not set')),
      WA.L('年龄：', 'Age: ') + WA.ageLabel(),
      WA.L('省市区街道：', 'Province / city / district / street: ') + region,
      WA.L('详细地址：', 'Full address: ') + addr,
      pos,
      WA.L('慢病：', 'Conditions: ') + (WA.conditionLabels().join('、') || WA.L('未填写', 'Not set')),
      WA.L('用药：', 'Medicines: ') + medText,
      WA.L('过敏：', 'Allergies: ') + (p.allergies || (p.noAllergies ? WA.L('无已知过敏', 'No known allergies') : WA.L('未填写', 'Not set'))),
      WA.L('紧急联系人：', 'Emergency contact: ') + (p.contactName ? p.contactName + ' ' + (p.contactRelation || '') + ' ' + p.contactPhone : WA.L('未填写', 'Not set')),
      WA.L('请派救护车。', 'Please send an ambulance.')
    ];
    return bits.join('\n');
  };

  /* ---------- 定位 ---------- */
  WA.geo = { watchId: null, requesting: false };

  WA.coordText = function (loc) {
    loc = loc || WA.state.location;
    if (!loc.lat || !loc.lng) return WA.L('暂无坐标', 'No coordinates');
    return loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5);
  };

  WA.componentsFromNominatim = function (data) {
    const a = (data && data.address) || {};
    return {
      province: a.state || a.province || a.region || '',
      city: a.city || a.municipality || a.town || '',
      district: a.district || a.city_district || a.borough || a.county || '',
      subdistrict: a.suburb || a.town || a.village || a.neighbourhood || a.quarter || a.hamlet || '',
      road: a.road || a.pedestrian || a.footway || a.cycleway || a.path || '',
      houseNumber: a.house_number || '',
      postcode: a.postcode || '',
      country: a.country || '',
      displayName: (data && data.display_name) || ''
    };
  };

  WA.componentsFromBigDataCloud = function (data) {
    const admins = (data && data.localityInfo && data.localityInfo.administrative) || [];
    function byLevel(level) {
      return admins.find(function (x) { return Number(x.adminLevel) === level; }) || null;
    }
    const province = (byLevel(4) || {}).name || (data && data.principalSubdivision) || '';
    const city = (byLevel(5) || {}).name || (data && data.city) || '';
    const district = (byLevel(6) || {}).name || (data && data.locality) || '';
    const sub = admins.find(function (x) { const l = Number(x.adminLevel); return l >= 8 && l <= 10; }) || null;
    const subdistrict = sub ? sub.name : '';
    const adcodeSource = byLevel(5) || byLevel(4) || {};
    const adcode = String(adcodeSource.chinaAdminCode || '').replace(/\s+/g, '');
    const parts = [province, city, district, subdistrict].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    return {
      province: province,
      city: city,
      district: district,
      subdistrict: subdistrict,
      adcode: adcode,
      road: '',
      houseNumber: '',
      postcode: (data && data.postcode) || '',
      country: (data && data.countryName) || '',
      displayName: parts.join(' ')
    };
  };

  WA.regionText = function (loc) {
    loc = loc || WA.state.location;
    const c = loc.components;
    if (!c) return loc.region || '';
    const parts = [c.province, c.city, c.district, c.subdistrict].filter(Boolean);
    return parts.filter(function (x, i) { return parts.indexOf(x) === i; }).join(' · ');
  };

  WA.cityFromAddress = function (address) {
    const text = String(address || '');
    const province = text.match(/^(.{2,}?(?:省|自治区))/);
    const rest = province ? text.slice(province[0].length) : text;
    const city = rest.match(/([\u4e00-\u9fa5]{2,}?市)/) || rest.match(/([\u4e00-\u9fa5]{2,}?(?:自治州|地区|盟))/);
    return city ? city[1] : (province ? province[1] : '');
  };

  WA.districtFromAddress = function (address) {
    const text = String(address || '');
    const province = text.match(/^(.{2,}?(?:省|自治区))/);
    const rest = province ? text.slice(province[0].length) : text;
    const afterCity = rest.replace(/^.*?市/, '');
    const district = afterCity.match(/([\u4e00-\u9fa5]{2,}?(?:区|县|旗))/);
    if (district) return district[1];
    const fallback = rest.match(/([\u4e00-\u9fa5]{2,}?(?:区|县|旗))/);
    return fallback ? fallback[1] : '';
  };

  WA.fullAddress = function (loc) {
    loc = loc || WA.state.location;
    const c = loc.components;
    if (!c) return loc.address || '';
    const parts = [c.province, c.city, c.district, c.subdistrict].filter(Boolean);
    const unique = parts.filter(function (x, i) { return parts.indexOf(x) === i; });
    if (c.road && !unique.includes(c.road)) unique.push(c.road);
    if (c.houseNumber) unique.push(c.houseNumber);
    return unique.join(WA.lang() === 'en' ? ', ' : ' ') || loc.address || c.displayName || '';
  };

  WA.locationText = function () {
    const loc = WA.state.location;
    return WA.fullAddress(loc) || loc.address || WA.state.profile.address || (loc.lat ? WA.coordText(loc) : WA.L('定位未开启', 'Location off'));
  };

  WA.paintLocation = function () {
    const loc = WA.state.location;
    const region = document.getElementById('loc-region');
    if (region) {
      region.textContent = WA.regionText(loc) || (loc.geocoding ? WA.L('正在解析省 / 市 / 区 / 街道…', 'Resolving province / city / district / street…') : (loc.geocodeError ? WA.L('行政区划未解析，请手动补全', 'Region not resolved — please complete it manually') : WA.L('行政区划待解析', 'Region not resolved yet')));
    }
    const setupRegion = document.getElementById('setup-map-region');
    if (setupRegion) setupRegion.textContent = WA.regionText(loc) || (loc.geocoding ? WA.L('正在解析行政区划…', 'Resolving region…') : '');
    const address = document.getElementById('loc-address');
    if (address) address.textContent = WA.locationText();
    const setupAddress = document.getElementById('setup-map-address');
    if (setupAddress) setupAddress.textContent = WA.regionText(loc) || WA.locationText();
    const coords = document.getElementById('loc-coords');
    if (coords) coords.textContent = WA.coordText(loc);
    const update = document.getElementById('loc-updated');
    if (update) update.textContent = WA.timeAgo(loc.updatedAt);
    const accuracy = document.getElementById('loc-accuracy');
    if (accuracy) accuracy.textContent = loc.accuracy ? ('±' + Math.round(loc.accuracy) + ' m') : '—';
    const chip = document.querySelector('.location-chip .location-text');
    if (chip) chip.textContent = (loc.lat || loc.address) ? WA.L('已定位', 'Located') : WA.L('未定位', 'No location');
    const chipWrap = document.querySelector('.location-chip');
    if (chipWrap) { chipWrap.classList.toggle('is-on', !!(loc.lat || loc.address)); chipWrap.classList.toggle('is-off', !(loc.lat || loc.address)); }
  };

  /* ---------- 逆向地理编码：多源合并 + 本地缓存 ----------
     目标：只要拿到坐标，就尽量把“省 / 市 / 区 / 街道”补全，而不是停在经纬度。
     通道顺序：BigDataCloud → Photon(Komoot) → Nominatim(OSM)。
     每个通道单独超时；前一个通道缺字段时，用后面的通道补齐；同一坐标成功一次就缓存。 */
  WA.geocode = { busy: false, lastKey: '', lastAt: 0, progress: '' };
  const GEO_CACHE_KEY = 'wa.geo.cache.v1';

  function readGeoCache() {
    try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}') || {}; } catch (err) { return {}; }
  }
  function writeGeoCache(map) {
    try {
      const keys = Object.keys(map);
      if (keys.length > 30) { keys.sort(function (a, b) { return (map[a].ts || 0) - (map[b].ts || 0); }).slice(0, keys.length - 30).forEach(function (k) { delete map[k]; }); }
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(map));
    } catch (err) { /* 配额满就放弃缓存 */ }
  }

  function normComponents() {
    return { province: '', city: '', district: '', subdistrict: '', road: '', houseNumber: '', postcode: '', country: '', displayName: '' };
  }

  function mergeComponents(base, extra) {
    const out = Object.assign(normComponents(), base || {});
    Object.keys(out).forEach(function (k) {
      if ((!out[k] || out[k] === '') && extra && extra[k]) out[k] = extra[k];
    });
    return out;
  }

  function componentsComplete(c) {
    return !!(c && c.province && c.city && c.district);
  }

  function timeoutJson(url, ms) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(function () { try { if (controller) controller.abort(); } catch (err) { /* ignore */ } }, ms);
    return fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller ? controller.signal : undefined,
      mode: 'cors',
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('http-' + r.status);
      return r.json();
    }).finally(function () { clearTimeout(timer); });
  }

  /* BigDataCloud：免费、无需 key；省市区较稳，街道常缺 */
  function fromBigDataCloud(lat, lng) {
    const url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lng +
      '&localityLanguage=' + (WA.lang() === 'en' ? 'en' : 'zh-Hans');
    return timeoutJson(url, 4500).then(function (data) {
      const c = WA.componentsFromBigDataCloud(data);
      if (!c.province && !c.city && !c.district) throw new Error('empty-bdc');
      return { provider: 'bigdatacloud', components: c, displayName: c.displayName || '' };
    });
  }

  /* Photon（Komoot，基于 OSM）：字段细，含 district / street */
  function fromPhoton(lat, lng) {
    const url = 'https://photon.komoot.io/reverse?lat=' + lat + '&lon=' + lng + '&lang=' + (WA.lang() === 'en' ? 'en' : 'zh');
    return timeoutJson(url, 5000).then(function (data) {
      const f = data && data.features && data.features[0];
      if (!f || !f.properties) throw new Error('empty-photon');
      const p = f.properties;
      const c = {
        province: p.state || '',
        city: p.city || p.county || '',
        district: p.district || p.locality || p.county || '',
        subdistrict: p.suburb || p.locality || '',
        road: p.street || p.name || '',
        houseNumber: p.housenumber || '',
        postcode: p.postcode || '',
        country: p.country || '',
        displayName: [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(', ')
      };
      if (!c.province && !c.city && !c.district) throw new Error('empty-photon');
      return { provider: 'photon', components: c, displayName: c.displayName };
    });
  }

  /* Nominatim：字段最全，但在部分地区会被限速或拦截 */
  function fromNominatim(lat, lng) {
    const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=' + lat +
      '&lon=' + lng + '&accept-language=' + (WA.lang() === 'en' ? 'en' : 'zh-CN');
    return timeoutJson(url, 6000).then(function (data) {
      if (!data || (!data.address && !data.display_name)) throw new Error('empty-osm');
      return { provider: 'openstreetmap', components: WA.componentsFromNominatim(data), displayName: data.display_name || '' };
    });
  }

  const GEO_PROVIDERS = [
    { id: 'bigdatacloud', label: 'BigDataCloud', fn: fromBigDataCloud },
    { id: 'photon', label: 'Photon', fn: fromPhoton },
    { id: 'openstreetmap', label: 'OpenStreetMap', fn: fromNominatim }
  ];

  WA.reverseGeocode = function (opts) {
    opts = opts || {};
    const loc = WA.state.location;
    if (!loc.lat || !loc.lng) return Promise.reject(new Error('no-location'));
    const key = loc.lat.toFixed(4) + ',' + loc.lng.toFixed(4);
    if (WA.geocode.busy) return Promise.resolve(loc);
    if (!opts.force && loc.components && WA.geocode.lastKey === key) return Promise.resolve(loc);

    const cache = opts.force ? {} : readGeoCache();
    if (cache[key] && cache[key].components) {
      loc.components = cache[key].components;
      loc.region = WA.regionText(loc);
      loc.address = WA.fullAddress(loc) || cache[key].address || '';
      loc.geocoding = false;
      loc.geocodeError = false;
      loc.geocodeProvider = 'cache';
      loc.geocodePartial = !loc.components.subdistrict;
      loc.source = cache[key].source || 'gps+cache';
      WA.paintLocation();
      return Promise.resolve(loc);
    }

    WA.geocode.busy = true;
    loc.geocoding = true;
    loc.geocodeError = false;
    loc.geocodeProvider = '';
    WA.paintLocation();

    let merged = normComponents();
    let providerUsed = '';
    let displayName = '';

    function step(i) {
      if (i >= GEO_PROVIDERS.length) return Promise.reject(new Error('all-providers-failed'));
      const p = GEO_PROVIDERS[i];
      WA.geocode.progress = (i + 1) + '/' + GEO_PROVIDERS.length;
      const region = document.getElementById('loc-region');
      if (region && !WA.regionText(loc)) region.textContent = WA.L('正在解析省 / 市 / 区 / 街道…（通道 ' + (i + 1) + '/' + GEO_PROVIDERS.length + '）', 'Resolving region… (provider ' + (i + 1) + ' of ' + GEO_PROVIDERS.length + ')');
      return p.fn(loc.lat, loc.lng).then(function (result) {
        merged = mergeComponents(merged, result.components);
        if (!providerUsed) providerUsed = p.id;
        if (!displayName) displayName = result.displayName || result.components.displayName || '';
        // 区级已经拿到就够用了；街道能补则继续补一轮
        if (componentsComplete(merged) && merged.subdistrict && merged.road) return merged;
        if (componentsComplete(merged) && i >= 1) return merged;
        return step(i + 1);
      }).catch(function () {
        return step(i + 1);
      });
    }

    return step(0).then(function () {
      if (loc.source === 'manual') {
        loc.geocoding = false;
        WA.paintLocation();
        return loc;
      }
      loc.components = merged;
      loc.region = WA.regionText(loc);
      loc.address = WA.fullAddress(loc) || displayName || '';
      loc.geocoding = false;
      loc.geocodeError = false;
      loc.geocodeProvider = providerUsed;
      loc.geocodePartial = !merged.subdistrict;
      loc.source = 'gps+' + (providerUsed === 'bigdatacloud' ? 'bdc' : providerUsed === 'photon' ? 'photon' : 'osm');
      WA.geocode.lastKey = key;
      WA.geocode.lastAt = Date.now();
      const map = readGeoCache();
      map[key] = { components: merged, address: loc.address, source: loc.source, ts: Date.now() };
      writeGeoCache(map);
      WA.save();
      WA.paintLocation();
      if (WA.state.phase === 'setup' && !WA.state.setupManual) WA.renderAll();
      if (opts.toast) {
        WA.toast(loc.geocodePartial
          ? WA.L('已解析到省 / 市 / 区；街道未解析，可在手动区划里补全。', 'Province / city / district resolved. Street not resolved — add it in manual region.')
          : WA.L('已解析到省 / 市 / 区 / 街道。', 'Province / city / district / street resolved.'), 'success', 4200);
      }
      return loc;
    }).catch(function (err) {
      // 全部通道失败：保留坐标，标记未解析，并提示手动补全
      if (merged && (merged.province || merged.city)) {
        loc.components = merged;
        loc.region = WA.regionText(loc);
        loc.address = WA.fullAddress(loc);
        loc.geocodePartial = true;
        loc.geocodeError = false;
        loc.geocodeProvider = providerUsed;
        WA.save();
        WA.paintLocation();
        if (opts.toast) WA.toast(WA.L('只解析到部分区划，请补全街道 / 门牌，急救时更保险。', 'Only part of the region was resolved. Add street / door number for emergencies.'), 'warn', 4600);
        return loc;
      }
      loc.geocoding = false;
      if (loc.source !== 'manual') loc.geocodeError = true;
      WA.save();
      WA.paintLocation();
      if (WA.state.phase === 'setup' && !WA.state.setupManual) WA.renderAll();
      if (opts.toast) WA.toast(WA.L('网络暂时解析不了区划。坐标已经记下，请手动填写省 / 市 / 区 / 街道，急救时仍可播报。', 'The region could not be resolved right now. Your coordinates are saved — enter province / city / district / street manually; we can still read them aloud.'), 'warn', 5200);
      throw err;
    }).finally(function () {
      WA.geocode.busy = false;
      WA.geocode.progress = '';
    });
  };

  WA.requestLocation = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        WA.state.location.status = 'unsupported';
        WA.toast(WA.L('这个浏览器不支持定位。请手动填写省 / 市 / 区 / 街道。', 'This browser does not support location. Enter province / city / district / street manually.'), 'error');
        if (opts.onError) opts.onError(new Error('unsupported'));
        reject(new Error('unsupported'));
        return;
      }
      WA.geo.requesting = true;
      WA.state.location.status = 'requesting';
      if (opts.onStart) opts.onStart();
      navigator.geolocation.getCurrentPosition(function (pos) {
        WA.geo.requesting = false;
        WA.state.location = {
          status: 'ok',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updatedAt: Date.now(),
          address: '',
          region: '',
          source: 'gps',
          components: null,
          geocoding: true,
          geocodeError: false,
          geocodeProvider: '',
          geocodePartial: false
        };
        WA.geocode.lastKey = '';
        WA.save();
        WA.paintLocation();
        WA.reverseGeocode({ force: true }).catch(function () { /* manual fallback is shown */ });
        if (opts.onSuccess) opts.onSuccess(WA.state.location);
        resolve(WA.state.location);
      }, function (err) {
        WA.geo.requesting = false;
        WA.state.location.status = 'error';
        WA.state.location.error = err.code;
        WA.save();
        if (opts.onError) opts.onError(err);
        reject(err);
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    });
  };

  WA.watchLocation = function () {
    if (!navigator.geolocation || WA.geo.watchId != null) return;
    try {
      WA.geo.watchId = navigator.geolocation.watchPosition(function (pos) {
        WA.state.location.status = 'ok';
        WA.state.location.lat = pos.coords.latitude;
        WA.state.location.lng = pos.coords.longitude;
        WA.state.location.accuracy = pos.coords.accuracy;
        WA.state.location.updatedAt = Date.now();
        WA.state.location.source = 'gps';
        WA.paintLocation();
        if (!WA.state.location.components && !WA.state.location.geocoding && !WA.state.location.geocodeError) {
          WA.reverseGeocode({ force: true }).catch(function () { /* ignore */ });
        }
      }, function () { /* keep last known */ }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 });
    } catch (err) { /* ignore */ }
  };

  WA.stopLocationWatch = function () {
    if (WA.geo.watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(WA.geo.watchId);
      WA.geo.watchId = null;
    }
  };

  WA.lookupAddress = function () {
    const loc = WA.state.location;
    if (!loc.lat || !loc.lng) {
      WA.toast(WA.L('请先开启定位，或手动填写省 / 市 / 区 / 街道。', 'Turn on location first, or enter province / city / district / street manually.'), 'warn');
      return;
    }
    WA.toast(WA.L('正在用坐标解析省 / 市 / 区 / 街道…', 'Resolving province / city / district / street…'));
    WA.reverseGeocode({ force: true, toast: true }).then(function () {
      if (WA.modalState) WA.closeModal();
    }).catch(function () { /* toast handled */ });
  };

  /* ---------- 语音 ---------- */
  WA.speechSupported = 'speechSynthesis' in window;
  let voicesCache = [];
  function refreshVoices() { try { voicesCache = window.speechSynthesis.getVoices() || []; } catch (err) { voicesCache = []; } }
  if (WA.speechSupported) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  WA.speak = function (text, opts) {
    opts = opts || {};
    if (!WA.speechSupported) {
      WA.toast(WA.L('这个浏览器不支持语音播报。', 'This browser cannot read text aloud.'), 'warn');
      return false;
    }
    try {
      if (!opts.append) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const target = WA.lang() === 'en' ? 'en' : 'zh';
      u.lang = target === 'en' ? 'en-US' : 'zh-CN';
      u.rate = opts.rate || (target === 'en' ? 0.86 : 0.82);
      u.pitch = opts.pitch || (target === 'en' ? 1.0 : 1.02);
      u.volume = opts.volume == null ? 0.9 : opts.volume;
      if (!voicesCache.length) refreshVoices();
      const prefix = target === 'en' ? 'en' : 'zh';
      const softNames = target === 'en'
        ? ['samantha', 'aria', 'jenny', 'zira', 'google us english']
        : ['xiaoxiao', 'huihui', 'yaoyao', 'ting-ting', 'meijia', 'google 普通话'];
      const sameLang = voicesCache.filter(function (x) { return (x.lang || '').toLowerCase().indexOf(prefix) === 0; });
      const v = sameLang.find(function (x) { return softNames.some(function (n) { return (x.name || '').toLowerCase().indexOf(n) !== -1; }); }) || sameLang[0];
      if (v) u.voice = v;
      u.onstart = function () { WA.state.ui.speaking = true; };
      u.onend = function () { WA.state.ui.speaking = false; };
      u.onerror = function () { WA.state.ui.speaking = false; };
      window.speechSynthesis.speak(u);
      return true;
    } catch (err) {
      WA.toast(WA.L('语音播报失败。', 'Could not read aloud.'), 'warn');
      return false;
    }
  };

  WA.stopSpeak = function () {
    if (WA.speechSupported) {
      try { window.speechSynthesis.cancel(); } catch (err) { /* ignore */ }
    }
    WA.state.ui.speaking = false;
  };

  /* ---------- 背景音乐（WebAudio 演示） ---------- */
  WA.audio = { ctx: null, master: null, nodes: [], timer: null };
  WA.startMusic = function () {
    if (WA.state.ui.music) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      WA.toast(WA.L('这个浏览器不支持音频播放。', 'This browser cannot play audio.'), 'warn');
      return;
    }
    try {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.connect(ctx.destination);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 760;
      filter.Q.value = 0.4;
      filter.connect(master);
      const freqs = [130.81, 164.81, 196.00, 261.63, 329.63];
      const nodes = [];
      freqs.forEach(function (f, i) {
        const osc = ctx.createOscillator();
        osc.type = i % 2 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.018 / (i * 0.28 + 1);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.045 + i * 0.012;
        const lg = ctx.createGain();
        lg.gain.value = 0.012;
        lfo.connect(lg);
        lg.connect(g.gain);
        osc.connect(g);
        g.connect(filter);
        osc.start();
        lfo.start();
        nodes.push(osc, lfo);
      });
      master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 4);
      WA.audio = { ctx: ctx, master: master, nodes: nodes, timer: null };
      WA.state.ui.music = true;
      document.body.classList.add('music-on');
      WA.toast(WA.L('舒缓音已播放。它不能替代急救。', 'Calming audio is on. It does not replace emergency care.'));
      WA.updateAudioButtons();
    } catch (err) {
      WA.toast(WA.L('音频启动失败。', 'Could not start audio.'), 'warn');
    }
  };

  WA.stopMusic = function (silent) {
    const a = WA.audio;
    if (a && a.ctx) {
      try {
        a.master.gain.cancelScheduledValues(a.ctx.currentTime);
        a.master.gain.setValueAtTime(a.master.gain.value || 0.0001, a.ctx.currentTime);
        a.master.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + 0.8);
        setTimeout(function () {
          try { a.nodes.forEach(function (n) { n.stop(); }); } catch (err) { /* ignore */ }
          try { a.ctx.close(); } catch (err) { /* ignore */ }
        }, 900);
      } catch (err) { /* ignore */ }
    }
    WA.audio = { ctx: null, master: null, nodes: [], timer: null };
    const wasOn = WA.state.ui.music;
    WA.state.ui.music = false;
    document.body.classList.remove('music-on');
    WA.updateAudioButtons();
    if (wasOn && !silent) WA.toast(WA.L('舒缓音已停止。', 'Calming audio stopped.'));
  };

  WA.updateAudioButtons = function () {
    document.querySelectorAll('[data-audio-label]').forEach(function (el) {
      el.textContent = WA.state.ui.music ? WA.L('停止舒缓音', 'Stop calming audio') : WA.L('播放舒缓音', 'Play calming audio');
    });
    document.querySelectorAll('[data-audio-icon]').forEach(function (el) {
      el.innerHTML = WA.state.ui.music ? WA.icon('stop') : WA.icon('music');
    });
  };

  /* ---------- 呼吸引导 ---------- */
  WA.breath = { timer: null, running: false, cycle: 0 };
  WA.startBreathing = function () {
    WA.stopBreathing(true);
    WA.breath.running = true;
    WA.breath.cycle = 0;
    WA.state.ui.breathing = true;
    const orb = document.getElementById('breath-orb');
    const label = document.getElementById('breath-label');
    if (orb) orb.classList.add('is-breathing');
    const speakPhase = function (phase) {
      if (!WA.breath.running) return;
      if (label) label.textContent = phase === 'in' ? WA.L('吸气 4 秒', 'Breathe in for 4') : WA.L('呼气 6 秒', 'Breathe out for 6');
      if (orb) {
        orb.dataset.phase = phase;
        orb.style.animationDuration = phase === 'in' ? '4s' : '6s';
      }
      if (WA.breath.cycle < 3) WA.speak(phase === 'in' ? WA.L('慢慢吸气，四秒。', 'Breathe in slowly, four seconds.') : WA.L('慢慢呼气，六秒。', 'Breathe out slowly, six seconds.'), { rate: 0.8 });
    };
    const step = function () {
      if (!WA.breath.running) return;
      WA.breath.cycle += 1;
      speakPhase('in');
      WA.breath.timer = setTimeout(function () {
        if (!WA.breath.running) return;
        speakPhase('out');
        WA.breath.timer = setTimeout(step, 6000);
      }, 4000);
    };
    step();
    WA.updateBreathButtons();
    WA.toast(WA.L('跟着圆点呼吸。不要因为呼吸练习耽误呼救。', 'Follow the circle. Do not let breathing delay the call.'));
  };

  WA.stopBreathing = function (silent) {
    if (WA.breath.timer) clearTimeout(WA.breath.timer);
    WA.breath.timer = null;
    WA.breath.running = false;
    WA.state.ui.breathing = false;
    const orb = document.getElementById('breath-orb');
    if (orb) { orb.classList.remove('is-breathing'); orb.removeAttribute('style'); }
    const label = document.getElementById('breath-label');
    if (label) label.textContent = WA.L('准备好了就开始', 'Ready when you are');
    WA.updateBreathButtons();
    if (!silent) WA.stopSpeak();
  };

  WA.updateBreathButtons = function () {
    document.querySelectorAll('[data-breath-label]').forEach(function (el) {
      el.textContent = WA.breath.running ? WA.L('停止呼吸引导', 'Stop breathing guide') : WA.L('开始呼吸引导', 'Start breathing guide');
    });
  };

  /* ---------- 页面生命周期 ---------- */
  WA.finishOnboarding = function (skipped) {
    WA.state.profileOnboarding = false;
    WA.state.onboarded = true;
    WA.state.phase = 'app';
    WA.save();
    WA.go('home', { replace: true });
    const comp = WA.profileCompletion();
    setTimeout(function () {
      if (comp.score < 60) {
        WA.toast(WA.L('档案已保存，但急救卡仍不完整。急救时可能缺少关键信息，建议尽快补齐。', 'Your file is saved, but the emergency card is still incomplete. Key information may be missing in an emergency. Please complete it soon.'), 'warn', 4600);
      } else if (skipped) {
        WA.toast(WA.L('已跳过档案确认。急救卡仍可用，之后可在“我的档案”里修改。', 'File confirmation skipped. Your emergency card is still available; edit it anytime in My File.'), 'info', 3600);
      } else {
        WA.toast(WA.L('急救档案已保存。首页已为你打开。', 'Emergency file saved. Home is ready.'), 'success');
      }
    }, 350);
  };

  WA.setLanguage = function (lang) {
    WA.state.lang = lang === 'en' ? 'en' : 'zh';
    WA.state.phase = 'setup';
    WA.state.setupStep = 0;
    WA.save();
    WA.renderAll();
    window.scrollTo(0, 0);
  };

  WA.toggleLanguage = function () {
    WA.state.lang = WA.lang() === 'en' ? 'zh' : 'en';
    if (WA.state.demo) {
      const en = WA.lang() === 'en';
      if (WA.state.location.source === 'demo') {
        WA.state.location.components = demoComponents(en);
        WA.state.location.region = en ? 'Shanghai · Huangpu District · Nanjing East Road Subdistrict' : '上海市 · 黄浦区 · 南京东路街道';
        WA.state.location.address = demoAddress(en);
      }
      if (WA.state.profile.address) {
        WA.state.profile.address = en
          ? '3F, No. 00 Nanjing East Road, Huangpu District, Shanghai'
          : '上海市黄浦区南京东路 00 号 3 楼';
      }
    } else if (WA.state.location.lat && WA.state.location.components && WA.state.location.source === 'gps+osm') {
      WA.reverseGeocode({ force: true }).catch(function () { /* keep previous region */ });
    }
    if (WA.analysis && WA.state.mild && WA.state.mild.answers && WA.state.mild.answers.description) {
      WA.state.mild.answers.keywords = WA.analysis.extractKeywords(WA.state.mild.answers.description);
    }
    if (WA.analysis && WA.state.result) {
      const created = WA.state.result.createdAt;
      try {
        if (WA.state.result.kind === 'mild' && WA.state.mild) WA.state.result = WA.analysis.buildMildResult();
        if (WA.state.result.kind === 'moderate' && WA.state.moderate) WA.state.result = WA.analysis.buildModerateResult();
        if (WA.state.result) WA.state.result.createdAt = created;
      } catch (err) { /* keep existing result if it cannot be rebuilt */ }
    }
    WA.save();
    WA.renderAll();
    WA.toast(WA.L('已切换为中文。', 'Switched to English.'), 'info', 1600);
  };

  /* ---------- 演示模式 ---------- */
  function demoComponents(en) {
    return {
      province: en ? 'Shanghai' : '上海市',
      city: en ? 'Shanghai' : '上海市',
      district: en ? 'Huangpu District' : '黄浦区',
      subdistrict: en ? 'Nanjing East Road Subdistrict' : '南京东路街道',
      road: en ? 'Nanjing East Road' : '南京东路',
      houseNumber: en ? 'No. 00' : '00 号',
      postcode: '200001',
      country: en ? 'China' : '中国',
      displayName: en
        ? 'Nanjing East Road, Huangpu District, Shanghai, China'
        : '中国上海市黄浦区南京东路街道南京东路 00 号'
    };
  }

  function demoAddress(en) {
    return en
      ? 'Shanghai, Huangpu District, Nanjing East Road Subdistrict, Nanjing East Road, No. 00'
      : '上海市 黄浦区 南京东路街道 南京东路 00 号';
  }

  WA.seedDemo = function (opts) {
    opts = opts || {};
    WA.state.demo = true;
    WA.state.lang = opts.lang || 'zh';
    WA.state.phase = 'app';
    WA.state.onboarded = true;
    WA.state.consent = true;
    WA.state.consentAt = Date.now();
    WA.state.screen = opts.screen || 'home';
    const en = WA.lang() === 'en';
    WA.state.location = {
      status: 'ok', lat: 31.23042, lng: 121.47370, accuracy: 18,
      updatedAt: Date.now() - 42000,
      address: demoAddress(en), region: en ? 'Shanghai · Huangpu District · Nanjing East Road Subdistrict' : '上海市 · 黄浦区 · 南京东路街道',
      source: 'demo', components: demoComponents(en), geocoding: false, geocodeError: false
    };
    WA.state.profile = Object.assign({}, clone(DEFAULT_PROFILE), {
      name: opts.lang === 'en' ? 'Alex Chen' : '林小满',
      age: 24, sex: 'female', pregnant: 'no', bodyType: 'normal', bloodType: '不清楚',
      address: WA.lang() === 'en' ? '3F, No. 00 Nanjing East Road, Huangpu District, Shanghai' : '上海市黄浦区南京东路 00 号 3 楼',
      contactName: opts.lang === 'en' ? 'Mum' : '妈妈', contactRelation: opts.lang === 'en' ? 'Mother' : '母亲', contactPhone: '138 0000 0000',
      conditions: ['gastritis'], meds: ['ppi'], medsAnswered: true,
      allergies: opts.lang === 'en' ? 'Penicillin' : '青霉素', noAllergies: false, unsureAllergies: false,
      records: [], recordsConsent: false,
      symptoms: ['reflux', 'belch']
    });
  };

  WA.parseDemoQuery = function () {
    const q = new URLSearchParams(window.location.search);
    if (q.get('demo') !== '1') return false;
    const lang = q.get('lang') === 'en' ? 'en' : 'zh';
    const screen = q.get('screen') || 'home';
    WA.seedDemo({ lang: lang, screen: ['home', 'profile', 'emergency', 'moderate', 'mild', 'result', 'learn', 'about'].includes(screen) ? screen : 'home' });
    const step = q.get('step');
    if (step != null) {
      if (WA.state.screen === 'mild') WA.state.mild.step = Math.max(0, Math.min(5, Number(step) || 0));
      if (WA.state.screen === 'moderate') WA.state.moderate.step = Math.max(0, Math.min(2, Number(step) || 0));
    }
    if (q.get('pregnant') === '1') WA.state.profile.pregnant = 'yes';
    if (q.get('bigtext') === '1') WA.state.settings.bigText = true;
    if (q.get('resultbig') === '1') WA.state.settings.resultBig = true;
    if (q.get('setup') === '1') {
      WA.state.phase = 'setup';
      WA.state.setupStep = q.get('step') === '2' ? 1 : 0;
    }
    if (q.get('language') === '1') {
      WA.state.lang = null;
      WA.state.phase = 'language';
    }
    return true;
  };
})();
