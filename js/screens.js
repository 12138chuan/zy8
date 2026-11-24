/* 胃安 / TummyBuddy — 页面模板 */
(function () {
  'use strict';
  const WA = window.WA;
  const L = WA.L, tx = WA.tx, esc = WA.esc, icon = WA.icon;
  const S = WA.screens;

  function kicker(text, cls) { return '<p class="kicker ' + (cls || '') + '">' + text + '</p>'; }

  function sectionHead(k, title, sub, extra) {
    return '<div class="section-head">' +
      (k ? kicker(k) : '') +
      '<div class="section-head-row"><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (extra || '') + '</div>' +
      '</div>';
  }

  function chip(label, opts) {
    opts = opts || {};
    return '<button type="button" class="chip' + (opts.active ? ' is-active' : '') + (opts.danger ? ' is-danger' : '') + '"' +
      (opts.attrs || '') + (opts.disabled ? ' disabled' : '') + '>' +
      (opts.icon ? icon(opts.icon) : '') + '<span>' + label + '</span>' +
      (opts.hint ? '<small>' + opts.hint + '</small>' : '') + '</button>';
  }

  function progressDots(current, total, label) {
    let out = '<div class="progress-dots" aria-label="' + esc(label || '') + '">';
    for (let i = 0; i < total; i++) out += '<span class="' + (i < current ? 'is-done' : i === current ? 'is-current' : '') + '"></span>';
    return out + '</div>';
  }

  function safetyStrip(text) {
    return '<div class="safety-strip">' + icon('alert') + '<p>' + text + '</p></div>';
  }

  function emptyState(text) {
    return '<div class="empty-state">' + icon('info') + '<p>' + text + '</p></div>';
  }

  function medGroupsFor(profile) {
    const ids = (profile.conditions || []).filter(function (id) { return id !== 'none' && id !== 'unsure'; });
    const groups = [];
    const seen = {};
    ids.forEach(function (id) {
      const group = WA.MED_GROUPS[id];
      if (!group) return;
      const items = [];
      (group.items || []).forEach(function (m) {
        if (seen[m.id]) return;
        seen[m.id] = true;
        items.push(m);
      });
      if (items.length) groups.push({ id: id, label: group.label, items: items });
    });
    const general = [];
    (WA.GENERAL_MEDS || []).forEach(function (m) {
      if (seen[m.id]) return;
      seen[m.id] = true;
      general.push(m);
    });
    if (general.length) groups.push({ id: 'general', label: { zh: '其他常用药 / 保健品', en: 'Other common medicines / supplements' }, items: general });
    return groups;
  }

  WA.medGroupsFor = medGroupsFor;

  function allMedMap() {
    const map = {};
    Object.keys(WA.MED_GROUPS || {}).forEach(function (g) {
      (WA.MED_GROUPS[g].items || []).forEach(function (m) { map[m.id] = m; });
    });
    (WA.GENERAL_MEDS || []).forEach(function (m) { map[m.id] = m; });
    return map;
  }

  /* =========================================================
     语言选择
     ========================================================= */
  S.language = function () {
    return '<div class="gate">' +
      '<div class="gate-glow" aria-hidden="true"></div>' +
      '<div class="gate-top">' +
        '<span class="gate-seal">' + WA.logo(38) + '</span>' +
        '<span class="gate-version">v' + WA.VERSION + '</span>' +
      '</div>' +
      '<div class="gate-hero">' +
        '<div class="gate-mascot">' + WA.mascot(150) + '</div>' +
        '<p class="gate-kicker">A calmer way to check your stomach</p>' +
        '<h1>' + L('先选一种语言', 'Choose your language') + '</h1>' +
        '<p class="gate-lead">' + L('选好后，整页只显示一种语言，不挤、不绕。', 'One language only after you choose. No clutter, no mixed-up words.') + '</p>' +
      '</div>' +
      '<div class="gate-options">' +
        '<button type="button" class="gate-option" data-action="set-lang" data-lang="zh">' +
          '<span class="gate-option-main">中文</span>' +
          '<span class="gate-option-sub">用中文开始 · 约 1 分钟设置</span>' +
          '<span class="gate-option-arrow">' + icon('arrow') + '</span>' +
        '</button>' +
        '<button type="button" class="gate-option gate-option-en" data-action="set-lang" data-lang="en">' +
          '<span class="gate-option-main">English</span>' +
          '<span class="gate-option-sub">Continue in English · about 1 minute</span>' +
          '<span class="gate-option-arrow">' + icon('arrow') + '</span>' +
        '</button>' +
      '</div>' +
      '<p class="gate-foot">' + L('之后可在“我的档案”里切换语言。', 'You can switch language later in My File.') + '</p>' +
      '<div class="gate-safety">' + icon('phone') + '<span>' + L('如果现在就有剧烈腹痛、呕血、黑便、胸痛大汗或晕厥，请先拨打 120，不要等设置完成。', 'If you have severe belly pain, vomiting blood, black stools, chest pain with sweating, or fainting right now, call 120 first. Do not wait to finish setup.') + '</span></div>' +
      '</div>';
  };

  /* =========================================================
     首次设置：定位 → 免责 → 档案
     ========================================================= */
  S.setup = function () {
    const step = WA.state.setupStep === 1 ? 1 : 0;
    const loc = WA.state.location;
    const isBusy = loc.status === 'requesting';
    const hasLoc = !!(loc.lat || loc.address);
    const region = WA.regionText(loc);
    const regionReady = !!region || !!loc.address;
    const manual = WA.state.setupManual === true;
    const showManual = manual || loc.status === 'error' || (loc.geocodeError && !regionReady);
    const mc = loc.components || {};

    let statusClass = 'is-idle';
    let statusIcon = 'locate';
    let statusStrong = L('还没有定位', 'Location is off');
    let statusSmall = L('点下面的按钮，浏览器会弹出权限请求。请选择“允许”。', 'Tap the button below. Your browser will ask for permission. Choose “Allow”.');
    if (regionReady) {
      statusClass = 'is-ok';
      statusIcon = 'check-circle';
      statusStrong = loc.geocodePartial ? L('行政区划已解析，街道待补全', 'Region resolved — street still missing') : L('定位与行政区划已就绪', 'Location and region ready');
      statusSmall = esc(region || WA.locationText()) + ' · ' + WA.timeAgo(loc.updatedAt) + (loc.geocodePartial ? L(' · 点下面可手动补街道', ' · add the street manually below') : '');
    } else if (isBusy) {
      statusIcon = 'locate';
      statusStrong = L('正在请求定位…', 'Requesting location…');
      statusSmall = L('请允许浏览器使用你的位置。', 'Please allow the browser to use your location.');
    } else if (loc.geocoding) {
      statusIcon = 'locate';
      statusStrong = L('已获取坐标，正在解析行政区划…', 'Coordinates found — resolving region…');
      statusSmall = L('正在把坐标解析成省 / 市 / 区 / 街道，请稍等几秒。', 'Turning the coordinates into province / city / district / street. A few seconds.');
    } else if (loc.geocodeError && hasLoc) {
      statusIcon = 'alert';
      statusClass = 'is-error';
      statusStrong = L('已获取坐标，行政区划未解析', 'Coordinates found — region unresolved');
      statusSmall = L('行政区划解析失败，请手动填写省 / 市 / 区 / 街道后继续。', 'Region resolution failed. Enter province / city / district / street to continue.');
    } else if (loc.status === 'error') {
      statusIcon = 'alert';
      statusClass = 'is-error';
      statusStrong = L('定位没有成功', 'Location failed');
      statusSmall = L('浏览器拒绝了定位，或信号不可用。你必须手动填写省 / 市 / 区 / 街道。', 'The browser denied location or there is no signal. You must enter province / city / district / street manually.');
    }

    const visual = '<div class="setup-visual">' +
      '<div class="map-card">' +
        '<div class="map-grid" aria-hidden="true"></div>' +
        '<div class="map-road road-a" aria-hidden="true"></div><div class="map-road road-b" aria-hidden="true"></div>' +
        '<div class="map-pin' + (hasLoc ? ' is-live' : '') + '"><span class="pin-ring"></span>' + icon('pin') + '</div>' +
        '<div class="map-label">' +
          '<span class="live-dot"></span>' +
          '<strong>' + (regionReady ? (loc.geocodePartial ? L('省市区已解析', 'Province / city / district resolved') : L('省市区街道已解析', 'Region resolved')) : (hasLoc ? L('已获取坐标', 'Coordinates found') : L('等待定位', 'Waiting for location'))) + '</strong>' +
          '<small id="setup-map-address">' + esc(regionReady ? (region || WA.locationText()) : (hasLoc ? (loc.geocodeError ? L('行政区划未解析，请手动补全', 'Region unresolved — complete it manually') : L('正在解析省 / 市 / 区 / 街道…', 'Resolving province / city / district / street…')) : L('开启后，急救时可播报', 'Turn on so we can read it to 120'))) + '</small>' +
        '</div>' +
        '<div class="map-coords">' + icon('locate') + '<span>' + esc(hasLoc ? WA.coordText(loc) : '31.23042, 121.47370') + '</span></div>' +
      '</div>' +
      '<div class="setup-visual-note">' + icon('shield') + '<span>' + L('定位用于急救播报和附近医院查询。为把坐标解析成省 / 市 / 区 / 街道，坐标会发送给 OpenStreetMap 和备用区划服务（BigDataCloud）；不会发送个人资料。', 'Location is used for emergency read-out and nearby hospital search. To turn coordinates into a province / city / district / street, coordinates are sent to OpenStreetMap and a backup region service (BigDataCloud); no personal data is sent.') + '</span></div>' +
    '</div>';

    const locationCard = '<div class="setup-card">' +
      '<div class="setup-step">' + L('第 1 步 / 共 3 步', 'Step 1 of 3') + '</div>' +
      '<h1>' + L('先打开实时定位。', 'Turn on live location first.') + '</h1>' +
      '<p class="setup-lead">' + L('急救时，急救人员必须先知道你在哪。现在开，别等疼得说不出话。', 'In an emergency, responders must know where you are. Do it now — not when you are in too much pain to speak.') + '</p>' +
      '<div class="setup-status ' + statusClass + '">' +
        icon(statusIcon) +
        '<div><strong>' + statusStrong + '</strong>' +
        '<small>' + statusSmall + '</small></div>' +
      '</div>' +
      '<div class="setup-actions">' +
        (regionReady
          ? '<button type="button" class="btn btn-primary btn-block" data-action="setup-next">' + L('定位与区划已就绪，继续', 'Location and region ready — continue') + icon('arrow') + '</button>'
          : (hasLoc
            ? '<button type="button" class="btn btn-primary btn-block" disabled>' + icon('locate') + (loc.geocodeError ? L('请手动补全区划后继续', 'Complete the region to continue') : L('正在解析省 / 市 / 区 / 街道…', 'Resolving region…')) + '</button>'
            : '<button type="button" class="btn btn-primary btn-block' + (isBusy ? ' is-busy' : '') + '" data-action="request-location" ' + (isBusy ? 'disabled' : '') + '>' + icon('locate') + (isBusy ? L('正在定位…', 'Locating…') : L('允许定位', 'Allow location')) + '</button>')) +
        '<button type="button" class="btn btn-ghost btn-block" data-action="toggle-manual-location">' + L(loc.geocodePartial ? '补全街道 / 修改区划' : '无法定位？手动填写省 / 市 / 区 / 街道', loc.geocodePartial ? 'Add street / edit region' : 'Cannot locate? Enter province / city / district / street') + '</button>' +
      '</div>' +
      (showManual ? '<div class="manual-location">' +
        '<div class="manual-title">' + L('手动填写行政区划', 'Enter the region manually') + '</div>' +
        '<div class="manual-grid">' +
          '<label class="manual-field"><span>' + L('省 / 直辖市', 'Province / municipality') + '</span><input class="input" data-manual-field="province" value="' + esc(mc.province || '') + '" placeholder="' + L('例如：上海市', 'e.g. Shanghai') + '"></label>' +
          '<label class="manual-field"><span>' + L('市 / 地区', 'City / prefecture') + '</span><input class="input" data-manual-field="city" value="' + esc(mc.city || '') + '" placeholder="' + L('例如：上海市', 'e.g. Shanghai') + '"></label>' +
          '<label class="manual-field"><span>' + L('区 / 县', 'District / county') + '</span><input class="input" data-manual-field="district" value="' + esc(mc.district || '') + '" placeholder="' + L('例如：黄浦区', 'e.g. Huangpu District') + '"></label>' +
          '<label class="manual-field"><span>' + L('街道 / 乡镇', 'Subdistrict / town') + '</span><input class="input" data-manual-field="subdistrict" value="' + esc(mc.subdistrict || '') + '" placeholder="' + L('例如：南京东路街道', 'e.g. Nanjing East Road Subdistrict') + '"></label>' +
        '</div>' +
        '<label class="manual-field"><span>' + L('道路 / 门牌 / 楼栋 / 单元 / 门牌号', 'Road / building / unit / door number') + '</span><input class="input" data-manual-field="road" value="' + esc([mc.road, mc.houseNumber].filter(Boolean).join(' ')) + '" placeholder="' + L('例如：南京东路 00 号 3 楼 302', 'e.g. 3F, No. 00 Nanjing East Road') + '"></label>' +
        '<button type="button" class="btn btn-dark btn-block" data-action="save-manual-location">' + L('保存省市区街道并继续', 'Save region and continue') + '</button>' +
        '<p class="micro-note">' + L('没有坐标也可以继续，但急救时只能播报你填写的省 / 市 / 区 / 街道和详细地址。', 'You can continue without coordinates, but we can only read the province / city / district / street and address you enter.') + '</p>' +
      '</div>' : '') +
      '<p class="micro-note">' + L('浏览器只在 localhost 或 HTTPS 页面开放定位。', 'Browsers only allow location on localhost or HTTPS.') + '</p>' +
    '</div>';

    const consentCard = '<div class="setup-card">' +
      '<div class="setup-step">' + L('第 2 步 / 共 3 步 · 先读这 20 秒', 'Step 2 of 3 · read this first') + '</div>' +
      '<h1>' + L('先看清楚：这不是诊断。', 'Read this first: this is not a diagnosis.') + '</h1>' +
      '<p class="setup-lead">' + L('胃安只做两件事：帮你先排危险信号，再给就医方向。它不能代替医生，也不能开药。', 'TummyBuddy does two things: it screens for danger first, then points you toward the right care. It cannot replace a doctor or prescribe medicine.') + '</p>' +
      '<ul class="consent-list">' +
        '<li>' + icon('shield') + '<div><strong>' + L('不是医疗器械，不构成诊断、处方或治疗建议。', 'Not a medical device. It does not diagnose, prescribe or treat.') + '</strong><span>' + L('最终判断以医生面诊、检查和处方为准。', 'A doctor’s assessment, tests and prescription always come first.') + '</span></div></li>' +
        '<li>' + icon('phone') + '<div><strong>' + L('出现危险信号，先拨打 120。', 'If there are danger signs, call 120 first.') + '</strong><span>' + L('剧烈腹痛、呕血 / 黑便、胸痛大汗、晕厥、孕期腹痛出血，不要在这里等结果。', 'Severe belly pain, vomiting blood / black stools, chest pain with sweating, fainting, or pregnancy with pain or bleeding: do not wait for a result here.') + '</span></div></li>' +
        '<li>' + icon('lock') + '<div><strong>' + L('资料只保存在本机浏览器。', 'Your data stays in this browser.') + '</strong><span>' + L('病历照片是否上传由你决定，可随时删除。清除浏览器数据会一并清除。', 'Uploading record photos is your choice, and you can delete them anytime. Clearing browser data removes everything.') + '</span></div></li>' +
      '</ul>' +
      '<label class="consent-check">' +
        '<input type="checkbox" id="consent-check" data-action="toggle-consent" ' + (WA.state.consent ? 'checked' : '') + '>' +
        '<span class="consent-box">' + icon('check') + '</span>' +
        '<span>' + L('我已阅读并理解。出现危险信号，我会先拨打 120。', 'I have read and understood this. If danger signs appear, I will call 120 first.') + '</span>' +
      '</label>' +
      '<div class="setup-actions">' +
        '<button type="button" class="btn btn-primary btn-block" data-action="accept-consent" ' + (WA.state.consent ? '' : 'disabled') + '>' + L('同意，继续建立档案', 'Agree — set up my file') + icon('arrow') + '</button>' +
        '<p class="micro-note">' + L('继续即表示你理解：本工具不承担诊断责任。', 'By continuing, you accept that this tool does not provide a diagnosis.') + '</p>' +
      '</div>' +
    '</div>';

    return '<div class="setup">' +
      '<header class="setup-top">' +
        '<a class="brand" href="#" data-action="setup-home">' + WA.logo(40) + '<span class="brand-copy"><strong>' + (WA.lang() === 'en' ? WA.APP_NAME_EN : WA.APP_NAME) + '</strong><small>' + L('胃部健康自测', 'Stomach health check') + '</small></span></a>' +
        '<div class="setup-progress"><span class="' + (step === 0 ? 'is-current' : 'is-done') + '"></span><span class="' + (step === 1 ? 'is-current' : '') + '"></span><span class=""></span></div>' +
        '<button type="button" class="lang-chip" data-action="toggle-lang">' + (WA.lang() === 'en' ? '中' : 'EN') + '</button>' +
      '</header>' +
      '<div class="setup-grid">' +
        visual +
        (step === 0 ? locationCard : consentCard) +
      '</div>' +
      '<footer class="setup-footer">' + L('胃安 · 先分清急、重、缓，再决定下一步。', 'TummyBuddy · sort urgent, serious or slow — then decide the next step.') + '</footer>' +
    '</div>';
  };

  /* =========================================================
     首页
     ========================================================= */
  S.home = function () {
    const p = WA.state.profile;
    const comp = WA.profileCompletion();
    const loc = WA.state.location;
    const located = !!(loc.lat || loc.address);
    const hasContact = !!(p.contactName && p.contactPhone);
    const pregnant = WA.isPregnant();

    const locationBar = '<button type="button" class="home-location ' + (located ? 'is-on' : 'is-off') + '" data-action="open-location">' +
      '<span class="status-dot"></span>' +
      '<span class="home-location-copy"><strong>' + (located ? L('实时定位已开启', 'Live location is on') : L('实时定位未开启', 'Live location is off')) + '</strong>' +
      '<small>' + (located ? esc(WA.regionText(loc) || loc.address || WA.coordText(loc)) + ' · ' + WA.timeAgo(loc.updatedAt) : L('急救时，120 无法自动获取你的位置。现在开启。', 'In an emergency, 120 will not get your location automatically. Turn it on now.')) + '</small></span>' +
      '<span class="home-location-action">' + (located ? L('管理', 'Manage') : L('去开启', 'Turn on')) + icon('chevron') + '</span>' +
    '</button>';

    const hero = '<section class="home-hero">' +
      '<div class="hero-copy">' +
        kicker(L('胃部健康自测 · 30 秒先分清', 'STOMACH HEALTH CHECK · 30-SECOND TRIAGE')) +
        '<h1 class="hero-title">' + L('胃部健康自测', 'Stomach Health Check') + '</h1>' +
        '<p class="hero-sub">' + L('先分清急、重、缓，再决定下一步。', 'Sort urgent, serious or slow — before you guess.') + '</p>' +
        '<p class="hero-lead">' + L('接下来 30 秒：看 5 个危险信号，选一条适合现在的路径，然后拿到科室、检查和时间建议。', 'In the next 30 seconds: check 5 danger signs, choose the path that fits you now, and get a department, tests and a timeframe.') + '</p>' +
        '<div class="hero-actions">' +
          '<button type="button" class="btn btn-primary btn-large" data-action="scroll-entries">' + L('开始自测', 'Start the check') + icon('arrow') + '</button>' +
          '<button type="button" class="text-link" data-action="nav" data-nav="about">' + L('先看 40 秒说明', 'Read the 40-second guide') + '</button>' +
        '</div>' +
        '<div class="hero-meta"><span>' + icon('clock') + L('急 1 分钟 · 重 3 分钟 · 缓 6–8 分钟', 'Urgent 1 min · Serious 3 min · Slow 6–8 min') + '</span><span>' + icon('shield') + L('不抽血 · 不拍片 · 不上传', 'No blood test · No scan · No upload') + '</span></div>' +
      '</div>' +
      '<div class="hero-visual">' +
        '<div class="hero-card">' +
          '<div class="hero-card-top"><span class="live-dot"></span><span>' + L('小安在线', 'An is here') + '</span><span class="hero-card-code">' + L('胃 / 01', 'STOMACH / 01') + '</span></div>' +
          '<div class="hero-mascot">' + WA.mascot(176) + '</div>' +
          '<div class="hero-bubble">' + L('“先别急着吃药。把急、重、缓分清，比猜病名有用。”', '“Don’t reach for medicine yet. Sorting urgent, serious and slow is more useful than guessing a disease name.”') + '</div>' +
          '<div class="hero-card-foot"><span>' + icon('pin') + esc(located ? (WA.regionText(loc) || loc.address || WA.coordText(loc)) : L('定位未开启', 'Location off')) + '</span><span class="hero-card-status ' + (comp.score >= 60 ? 'is-ready' : '') + '">' + L('急救卡 ', 'Emergency card ') + comp.score + '%</span></div>' +
        '</div>' +
      '</div>' +
    '</section>';

    const explainer = '<section class="thirty-card">' +
      '<div class="thirty-head"><span class="thirty-num">30<small>s</small></span><div><strong>' + L('接下来 30 秒，你会做什么', 'What you will do in the next 30 seconds') + '</strong><p>' + L('不是做完全部问卷，而是先找到“现在最该走的那条路”。', 'Not the whole questionnaire — first find the path you should take right now.') + '</p></div></div>' +
      '<div class="thirty-steps">' +
        '<div class="thirty-step"><span>01</span><strong>' + L('看信号', 'Check signs') + '</strong><p>' + L('5 个必须马上处理的危险信号。', '5 danger signs that cannot wait.') + '</p><small>10s</small></div>' +
        '<div class="thirty-step"><span>02</span><strong>' + L('选路径', 'Choose a path') + '</strong><p>' + L('急、重、缓，三种不同节奏。', 'Urgent, serious or slow — three different paces.') + '</p><small>10s</small></div>' +
        '<div class="thirty-step"><span>03</span><strong>' + L('拿建议', 'Get a next step') + '</strong><p>' + L('看哪科、查什么、多久复查。', 'Which clinic, which tests, when to review.') + '</p><small>10s</small></div>' +
      '</div>' +
      '<div class="thirty-dims"><span>' + L('测评维度', 'What we look at') + '</span><span>' + L('症状', 'Symptoms') + '</span><span>' + L('病史与用药', 'History & medicines') + '</span><span>' + L('饮食与情绪', 'Food & mood') + '</span><span>' + L('舌象（可选）', 'Tongue (optional)') + '</span></div>' +
    '</section>';

    const entries = '<section class="entries" id="entries">' +
      '<div class="entries-head"><div>' + kicker(L('现在，选一条路', 'NOW CHOOSE A PATH')) + '<h2>' + L('你现在的“急”，是哪一种？', 'Which kind of “urgent” are you?') + '</h2></div><p>' + L('不确定就选“重”，我们会先帮你排危险信号。', 'Not sure? Choose “Serious”. We will screen for danger first.') + '</p></div>' +
      '<div class="entry-grid">' +
        '<button type="button" class="entry entry-danger" data-action="start-emergency">' +
          '<span class="entry-top"><span class="entry-index">01</span><span class="entry-badge">' + L('急', 'URGENT') + '</span><span class="entry-time">' + icon('clock') + L('1 分钟', '1 min') + '</span></span>' +
          '<span class="entry-icon">' + icon('siren') + '</span>' +
          '<span class="entry-title">' + L('现在就很危险', 'Something may be dangerously wrong') + '</span>' +
          '<span class="entry-desc">' + L('剧烈腹痛 · 呕血 / 黑便 · 胸痛大汗 · 晕厥', 'Severe pain · vomiting blood / black stools · chest pain with sweat · fainting') + '</span>' +
          '<span class="entry-foot"><span>' + L('进入危急检测', 'Start emergency check') + '</span>' + icon('arrow') + '</span>' +
        '</button>' +
        '<button type="button" class="entry entry-warm" data-action="start-moderate">' +
          '<span class="entry-top"><span class="entry-index">02</span><span class="entry-badge">' + L('重', 'SERIOUS') + '</span><span class="entry-time">' + icon('clock') + L('3 分钟', '3 min') + '</span></span>' +
          '<span class="entry-icon">' + icon('pulse') + '</span>' +
          '<span class="entry-title">' + L('很难受，想知道看哪科', 'Very uncomfortable — which clinic?') + '</span>' +
          '<span class="entry-desc">' + L('反酸灼痛 · 右上腹痛 · 恶心呕吐 · 胸闷', 'Burning / reflux · right-upper pain · nausea / vomiting · chest pressure') + '</span>' +
          '<span class="entry-foot"><span>' + L('选择症状', 'Choose symptoms') + '</span>' + icon('arrow') + '</span>' +
        '</button>' +
        '<button type="button" class="entry entry-calm" data-action="start-mild">' +
          '<span class="entry-top"><span class="entry-index">03</span><span class="entry-badge">' + L('缓', 'SLOW') + '</span><span class="entry-time">' + icon('clock') + L('6–8 分钟', '6–8 min') + '</span></span>' +
          '<span class="entry-icon">' + icon('leaf') + '</span>' +
          '<span class="entry-title">' + L('不着急，想系统查一查', 'Not urgent — a full review') + '</span>' +
          '<span class="entry-desc">' + L('反复胀痛 · 早饱 · 打嗝 · 想顺便学养胃', 'Recurring bloating · early fullness · belching · TCM + nutrition') + '</span>' +
          '<span class="entry-foot"><span>' + L('开始全面测评', 'Start full check') + '</span>' + icon('arrow') + '</span>' +
        '</button>' +
      '</div>' +
    '</section>';

    const quick = '<section class="quick-grid">' +
      '<button type="button" class="quick-card" data-action="open-emergency-card">' +
        '<span class="quick-icon">' + icon('shield') + '</span><span><strong>' + L('急救卡', 'Emergency card') + '</strong><small>' + L('完整度 ', 'Ready ') + comp.score + '% · ' + L('昏迷时给医生看', 'show it when you cannot speak') + '</small></span>' + icon('chevron') +
      '</button>' +
      '<button type="button" class="quick-card' + (hasContact ? '' : ' is-warning') + '" data-action="nav" data-nav="profile">' +
        '<span class="quick-icon">' + icon('user') + '</span><span><strong>' + L('我的档案', 'My file') + '</strong><small>' + (hasContact ? L('联系人已填写', 'Emergency contact is set') : L('缺紧急联系人，现在补', 'No emergency contact yet')) + '</small></span>' + icon('chevron') +
      '</button>' +
      '<button type="button" class="quick-card" data-action="nav" data-nav="learn">' +
        '<span class="quick-icon">' + icon('book') + '</span><span><strong>' + L('养胃小课', 'Stomach school') + '</strong><small>' + L('吃、睡、情绪、中医', 'Food, sleep, mood, TCM') + '</small></span>' + icon('chevron') +
      '</button>' +
    '</section>';

    const disclaimer = '<div class="home-disclaimer">' +
      '<div class="disclaimer-mark">' + icon('alert') + '</div>' +
      '<div><strong>' + L('小安温馨提醒', 'A note from An') + '</strong><p>' + L('本测评仅供参考，不能代替医疗诊断或医生处方。若你出现剧烈腹痛、呕血、黑便、胸痛大汗、晕厥，请立即拨打 120。', 'This check is for reference only. It is not a diagnosis or a prescription. If you have severe belly pain, vomiting blood, black stools, chest pain with sweating, or fainting, call 120 now.') + '</p></div>' +
    '</div>';

    const footer = '<footer class="home-footer">' +
      '<span>' + L('胃安 · 只做胃部不适的分诊与健康教育', 'TummyBuddy · triage and health education for stomach symptoms') + '</span>' +
      '<span>' + L('中国大陆急救 120 · 香港/澳门 999 · 台湾 119', 'Mainland China 120 · Hong Kong/Macau 999 · Taiwan 119') + '</span>' +
    '</footer>';

    return '<div class="home-page">' + locationBar + hero + explainer + entries + quick + disclaimer + footer + '</div>';
  };

  /* =========================================================
     我的档案
     ========================================================= */
  function inputRow(label, hint, control, required) {
    return '<div class="field">' +
      '<div class="field-top"><label class="field-label">' + label + (required ? '<em class="req">' + L('必填', 'Required') + '</em>' : '<em class="opt">' + L('选填', 'Optional') + '</em>') + '</label>' + (hint ? '<span class="field-hint">' + hint + '</span>' : '') + '</div>' +
      control + '</div>';
  }

  function segButtons(name, options, value, attrsPrefix) {
    return '<div class="seg-row" role="group">' + options.map(function (o) {
      return '<button type="button" class="seg' + (value === o.value ? ' is-active' : '') + '" ' + (attrsPrefix || 'data-profile-single="' + name + '"') + ' data-value="' + o.value + '">' + o.label + '</button>';
    }).join('') + '</div>';
  }

  S.profile = function () {
    const p = WA.state.profile;
    const comp = WA.profileCompletion();
    const onboarding = !!WA.state.profileOnboarding;
    const meds = allMedMap();
    const groups = medGroupsFor(p);
    const isFemale = p.sex === 'female' || p.sex === 'undisclosed';
    const records = p.records || [];
    const medText = [WA.medLabels().slice(0, 3).join('、'), p.medsOther].filter(Boolean).join('；') || L('未填写', 'Not set');

    const banner = onboarding ? '<div class="onboarding-banner">' +
      '<div class="onboarding-step">' + L('第 3 步 / 共 3 步', 'Step 3 of 3') + '</div>' +
      '<h2>' + L('花 1 分钟，把“说不出口”的信息先存好。', 'One minute now, so the key facts are ready when you cannot speak.') + '</h2>' +
      '<p>' + L('昏迷时，医生需要知道你的年龄、病史、用药、过敏和联系人。至少填年龄、性别；紧急联系人强烈建议填写。病历照片可选，不上传也能用。', 'If you cannot speak, medics need your age, history, medicines, allergies and contact. Age and sex are required; an emergency contact is strongly recommended. Record photos are optional.') + '</p>' +
    '</div>' : '';

    const head = '<header class="profile-head">' +
      '<div class="profile-head-copy">' +
        kicker(onboarding ? L('急救档案', 'EMERGENCY FILE') : L('急救与健康信息', 'EMERGENCY & HEALTH FILE')) +
        '<h1>' + L('我的档案', 'My file') + '</h1>' +
        '<p>' + L('急救时，这张卡比“我好像胃疼”更有用。资料只保存在本机浏览器。', 'In an emergency, this card is worth more than “my stomach hurts”. Everything stays in this browser.') + '</p>' +
      '</div>' +
      '<div class="completeness"><div class="ring" style="--p:' + comp.score + '"><span>' + comp.score + '<small>%</small></span></div><div><strong>' + L('急救卡完整度', 'Emergency card') + '</strong><small>' + (comp.score >= 80 ? L('可以直接出示', 'Ready to show') : (comp.score >= 50 ? L('还差几项关键信息', 'A few key items missing') : L('信息不足，急救时帮不上忙', 'Too little to help in an emergency'))) + '</small></div></div>' +
    '</header>';

    const cardPreview = '<section class="emergency-preview">' +
      '<div class="ep-top"><span class="ep-badge">' + icon('shield') + L('急救信息卡', 'Emergency card') + '</span><span class="ep-status ' + (comp.score >= 60 ? 'is-ready' : '') + '">' + (comp.score >= 60 ? L('可用', 'Ready') : L('待完善', 'Incomplete')) + '</span></div>' +
      '<div class="ep-name"><strong>' + esc(p.name || L('未填写姓名', 'No name yet')) + '</strong><span>' + WA.ageLabel() + ' · ' + WA.sexLabel() + (isFemale ? ' · ' + WA.pregnancyLabel() : '') + '</span></div>' +
      '<div class="ep-grid">' +
        '<div><small>' + L('慢病', 'Conditions') + '</small><span>' + (WA.conditionLabels().join('、') || L('未填写', 'Not set')) + '</span></div>' +
        '<div><small>' + L('用药', 'Medicines') + '</small><span>' + esc(medText) + (WA.medLabels().length > 3 ? '…' : '') + '</span></div>' +
        '<div><small>' + L('过敏', 'Allergies') + '</small><span>' + (p.allergies ? esc(p.allergies) : (p.noAllergies ? L('无已知过敏', 'No known allergies') : L('未填写', 'Not set'))) + '</span></div>' +
        '<div><small>' + L('紧急联系人', 'Emergency contact') + '</small><span>' + (p.contactName ? esc(p.contactName) + ' · ' + esc(p.contactPhone || '') : L('未填写', 'Not set')) + '</span></div>' +
      '</div>' +
      '<div class="ep-foot"><span>' + icon('pin') + esc(WA.locationText()) + '</span><span>' + L('更新 ', 'Updated ') + WA.formatTime(Date.now()) + '</span></div>' +
    '</section>';

    const basic = '<section class="form-card" id="profile-basic">' +
      '<div class="form-head"><span class="form-num">01</span><div><h2>' + L('基本信息', 'Basics') + '</h2><p>' + L('年龄和生理性别是必填；其他可以慢慢补。', 'Age and sex at birth are required. Everything else can wait.') + '</p></div></div>' +
      '<div class="field-grid two">' +
        inputRow(L('姓名 / 称呼', 'Name'), L('急救时怎么叫你', 'What should we call you?'), '<input class="input" type="text" data-profile-input="name" value="' + esc(p.name) + '" placeholder="' + L('例如：小满', 'e.g. Alex') + '" autocomplete="name">') +
        inputRow(L('联系电话', 'Phone'), L('选填', 'Optional'), '<input class="input" type="tel" data-profile-input="phone" value="' + esc(p.phone) + '" placeholder="' + L('你的手机号', 'Your mobile number') + '" autocomplete="tel">') +
      '</div>' +
      inputRow(L('年龄', 'Age'), L('必填 · 记不清可选年龄段', 'Required · choose a range if unsure'),
        '<div class="age-row"><div class="age-input"><input class="input" type="number" min="0" max="120" inputmode="numeric" data-profile-input="age" value="' + esc(p.age) + '" placeholder="' + L('岁', 'years') + '"><span>' + L('岁', 'yrs') + '</span></div><span class="age-or">' + L('或', 'or') + '</span><div class="range-chips">' +
        ['18–29', '30–39', '40–49', '50–59', '60–69', '70+'].map(function (r) {
          return '<button type="button" class="mini-chip' + (p.ageRange === r ? ' is-active' : '') + '" data-profile-range="' + r + '">' + r + '</button>';
        }).join('') + '</div></div>', true) +
      inputRow(L('生理性别', 'Sex at birth'), L('必填 · 影响孕期和部分风险判断', 'Required · affects pregnancy and some risk checks'),
        '<div class="seg-row three">' +
          '<button type="button" class="seg' + (p.sex === 'male' ? ' is-active' : '') + '" data-profile-single="sex" data-value="male">' + L('男', 'Male') + '</button>' +
          '<button type="button" class="seg' + (p.sex === 'female' ? ' is-active' : '') + '" data-profile-single="sex" data-value="female">' + L('女', 'Female') + '</button>' +
          '<button type="button" class="seg' + (p.sex === 'undisclosed' ? ' is-active' : '') + '" data-profile-single="sex" data-value="undisclosed">' + L('不方便透露', 'Prefer not to say') + '</button>' +
        '</div>', true) +
      (isFemale ? '<div class="pregnancy-block">' +
        '<div class="field-top"><span class="field-label">' + L('怀孕 / 哺乳情况', 'Pregnancy / breastfeeding') + '<em class="req">' + L('重要', 'Important') + '</em></span><span class="field-hint">' + L('急救和用药会用到', 'Used in emergency care and medicines') + '</span></div>' +
        '<div class="seg-row wrap">' +
          [['no', L('未怀孕', 'Not pregnant')], ['yes', L('怀孕中', 'Pregnant')], ['maybe', L('可能怀孕', 'Possibly pregnant')], ['lactation', L('哺乳期', 'Breastfeeding')], ['na', L('不适用', 'Not applicable')]].map(function (x) {
            return '<button type="button" class="seg' + (p.pregnant === x[0] ? ' is-active' : '') + '" data-profile-single="pregnant" data-value="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div>' +
        (WA.isPregnant() ? '<div class="inline-warning">' + icon('pregnant') + '<span>' + L('已开启孕妇关怀：急救页会提示左侧卧、不要自行吃药，并提醒 120 你怀孕了。', 'Pregnancy care is on: the emergency page will suggest lying on your left side, avoiding self-medication, and telling 120 you are pregnant.') + '</span></div>' : '') +
      '</div>' : '') +
      '<div class="field-grid two">' +
        inputRow(L('体型', 'Body type'), L('选填', 'Optional'),
          '<div class="mini-chips">' + [['thin', L('偏瘦', 'Thin')], ['normal', L('中等', 'Average')], ['overweight', L('偏胖', 'Overweight')], ['obese', L('肥胖', 'Obese')], ['unsure', L('不确定', 'Not sure')]].map(function (x) {
            return '<button type="button" class="mini-chip' + (p.bodyType === x[0] ? ' is-active' : '') + '" data-profile-single="bodyType" data-value="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div>') +
        inputRow(L('血型', 'Blood type'), L('选填', 'Optional'),
          '<div class="mini-chips">' + ['A', 'B', 'AB', 'O', '不清楚'].map(function (x) {
            return '<button type="button" class="mini-chip' + (p.bloodType === x ? ' is-active' : '') + '" data-profile-single="bloodType" data-value="' + x + '">' + (x === '不清楚' ? L('不清楚', 'Not sure') : x) + '</button>';
          }).join('') + '</div>') +
      '</div>' +
      inputRow(L('平时常见的胃部症状', 'Usual stomach symptoms'), L('可多选 · 开始自测时会自动带上，可修改', 'Multi-select · pre-filled in the full check, editable'),
        '<div class="chip-grid">' + [
          ['reflux', L('反酸 / 烧心', 'Reflux / heartburn')],
          ['belch', L('打嗝 / 嗳气', 'Belching')],
          ['shoulder', L('肩背放射痛', 'Shoulder/back pain')],
          ['bloating', L('胀满', 'Bloating')],
          ['fullness', L('早饱', 'Early fullness')],
          ['nausea', L('恶心', 'Nausea')],
          ['none', L('都没有', 'None')]
        ].map(function (x) {
          return '<button type="button" class="chip' + ((p.symptoms || []).includes(x[0]) ? ' is-active' : '') + '" data-profile-multi="symptoms" data-value="' + x[0] + '">' + x[1] + '</button>';
        }).join('') + '</div>') +
      inputRow(L('常住地址 / 急救时能找到你的地址', 'Address where help can find you'), L('选填但强烈建议', 'Optional but strongly recommended'),
        '<textarea class="input textarea" rows="2" data-profile-input="address" placeholder="' + L('省 / 市 / 区 / 街道 / 小区 / 楼栋 / 单元 / 门牌；独居请写清楚进门方式。', 'Province / city / district / street / building / unit / door number; if you live alone, note how to get in.') + '">' + esc(p.address) + '</textarea>' +
        '<div class="address-loc"><button type="button" class="mini-btn" data-action="use-location-address">' + icon('pin') + L('使用当前定位的省市区街道', 'Use current location region') + '</button><span>' + esc(WA.regionText() || L('定位尚未解析', 'Region not resolved yet')) + '</span></div>') +
    '</section>';

    const contact = '<section class="form-card" id="profile-contact">' +
      '<div class="form-head"><span class="form-num">02</span><div><h2>' + L('紧急联系人', 'Emergency contact') + '</h2><p>' + L('急救人员会先联系这个人。请先征得对方同意。', 'Medics will call this person first. Please ask their permission.') + '</p></div><span class="form-flag">' + L('强烈建议', 'Strongly recommended') + '</span></div>' +
      '<div class="field-grid three">' +
        inputRow(L('姓名', 'Name'), '', '<input class="input" type="text" data-profile-input="contactName" value="' + esc(p.contactName) + '" placeholder="' + L('例如：妈妈', 'e.g. Mum') + '">') +
        inputRow(L('关系', 'Relationship'), '', '<input class="input" type="text" data-profile-input="contactRelation" value="' + esc(p.contactRelation) + '" placeholder="' + L('母亲 / 室友 / 伴侣', 'Mother / roommate / partner') + '">') +
        inputRow(L('电话', 'Phone'), '', '<input class="input" type="tel" data-profile-input="contactPhone" value="' + esc(p.contactPhone) + '" placeholder="' + L('手机号', 'Mobile number') + '">') +
      '</div>' +
      '<p class="micro-note">' + L('独居、老人、孕妇：建议至少留两个联系人，并让对方知道你的常用地址。', 'Living alone, older, or pregnant? Add at least two contacts and make sure they know your address.') + '</p>' +
    '</section>';

    const conditions = '<section class="form-card" id="profile-conditions">' +
      '<div class="form-head"><span class="form-num">03</span><div><h2>' + L('慢性病与用药', 'Chronic conditions & medicines') + '</h2><p>' + L('多选。选了慢病，下面会出现对应的常用药。', 'Select all that apply. Common medicines for each condition will appear below.') + '</p></div></div>' +
      '<div class="field"><div class="field-top"><span class="field-label">' + L('有没有这些慢性病？', 'Do you have any of these?') + '<em class="opt">' + L('可多选', 'Multi-select') + '</em></span></div>' +
        '<div class="chip-grid">' + WA.CHRONIC_OPTIONS.map(function (c) {
          return '<button type="button" class="chip' + (p.conditions.includes(c.id) ? ' is-active' : '') + '" data-profile-multi="conditions" data-value="' + c.id + '">' + tx(c.label) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="med-section">' +
        '<div class="field-top"><span class="field-label">' + L('正在服用的药', 'Medicines you take') + '<em class="opt">' + L('可多选', 'Multi-select') + '</em></span><span class="field-hint">' + L('包括长期药、偶尔吃的止痛药、保健品和减肥药', 'Include long-term medicines, occasional painkillers, supplements and weight-loss drugs') + '</span></div>' +
        (groups.length ? groups.map(function (g) {
          return '<div class="med-group"><div class="med-group-label">' + tx(g.label) + '</div><div class="chip-grid">' + g.items.map(function (m) {
            return '<button type="button" class="chip med-chip' + (p.meds.includes(m.id) ? ' is-active' : '') + (m.stomachRisk ? ' is-risk' : '') + '" data-profile-med="' + m.id + '">' + tx(m.label) + (m.stomachRisk ? '<small>' + L('可能伤胃', 'stomach risk') + '</small>' : '') + '</button>';
          }).join('') + '</div></div>';
        }).join('') : emptyState(L('先选择上面的慢性病，或直接勾选下面的常用药。', 'Select a condition above, or tick a common medicine below.'))) +
        '<div class="chip-grid"><button type="button" class="chip' + (p.medsAnswered && !p.meds.length ? ' is-active' : '') + '" data-profile-med="none">' + L('都没有 / 记不清', 'None / not sure') + '</button></div>' +
        '<div class="field" style="margin-top:14px"><label class="field-label" for="meds-other">' + L('其他药物、保健品、减肥药', 'Other medicines, supplements, weight-loss drugs') + '</label><textarea id="meds-other" class="input textarea" rows="2" data-profile-input="medsOther" placeholder="' + L('例如：某减肥针、某中药粉、朋友推荐的胃药', 'e.g. a weight-loss injection, herbal powder, a friend-recommended stomach pill') + '">' + esc(p.medsOther) + '</textarea></div>' +
        '<div class="stomach-warning">' + icon('alert') + '<div><strong>' + L('有些药会伤胃，必须记下来。', 'Some medicines hurt the stomach. Record them.') + '</strong><p>' + L('阿司匹林、布洛芬等止痛药、激素、部分抗凝药和心血管药，可能引起胃痛、反酸甚至出血。不要自行停药；就诊时把药盒或处方带给医生。', 'Aspirin, ibuprofen and other painkillers, steroids, some blood thinners and heart medicines can cause pain, reflux or bleeding. Do not stop them on your own — bring the box or prescription to the doctor.') + '</p></div></div>' +
        (WA.hasStomachRiskMeds() ? '<div class="inline-warning is-danger">' + icon('alert') + '<span>' + L('你勾选了可能伤胃的药物。测评结果会把“药物相关胃损伤”纳入考虑，并在就医时提醒医生。', 'You selected medicines that can hurt the stomach. The check will consider medicine-related injury and flag it for your doctor.') + '</span></div>' : '') +
      '</div>' +
    '</section>';

    const allergies = '<section class="form-card" id="profile-allergies">' +
      '<div class="form-head"><span class="form-num">04</span><div><h2>' + L('过敏史', 'Allergies') + '</h2><p>' + L('药物、食物、造影剂都算。', 'Medicines, food and contrast dye all count.') + '</p></div></div>' +
      '<div class="seg-row wrap"><button type="button" class="seg' + (p.noAllergies ? ' is-active' : '') + '" data-profile-toggle="noAllergies">' + L('无已知过敏', 'No known allergies') + '</button><button type="button" class="seg' + (p.unsureAllergies ? ' is-active' : '') + '" data-profile-toggle="unsureAllergies">' + L('不清楚', 'Not sure') + '</button></div>' +
      '<textarea class="input textarea" rows="2" data-profile-input="allergies" placeholder="' + L('例如：青霉素、磺胺、海鲜；或“做增强 CT 曾经过敏”', 'e.g. penicillin, sulfa drugs, shellfish; or “reacted to contrast dye once”') + '">' + esc(p.allergies) + '</textarea>' +
    '</section>';

    const recordsCard = '<section class="form-card" id="profile-records">' +
      '<div class="form-head"><span class="form-num">05</span><div><h2>' + L('病历 / 处方 / 检查报告', 'Records, prescriptions & reports') + '</h2><p>' + L('可选。上传后，急救或就诊时可以直接出示。', 'Optional. Show them in an emergency or at the clinic.') + '</p></div><span class="form-flag soft">' + L('自愿上传', 'Your choice') + '</span></div>' +
      '<label class="consent-check small"><input type="checkbox" data-profile-check="recordsConsent" ' + (p.recordsConsent ? 'checked' : '') + '><span class="consent-box">' + icon('check') + '</span><span>' + L('我同意把照片保存在本机，用于就医时出示。', 'I agree to keep the photos on this device to show a doctor.') + '</span></label>' +
      '<div class="record-grid">' +
        records.map(function (r, i) {
          return '<div class="record-item"><img src="' + r.data + '" alt="' + esc(r.name || L('病历照片', 'Record photo')) + '"><button type="button" class="record-delete" data-action="delete-record" data-index="' + i + '" aria-label="' + L('删除这张照片', 'Delete this photo') + '">' + icon('trash') + '</button><span>' + esc(r.name || L('病历照片', 'Record')) + '</span></div>';
        }).join('') +
      '</div>' +
      (records.length < 3 ? '<div class="record-add-actions">' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="open-camera" data-target="record">' + icon('camera') + L('拍照 / 扫描', 'Camera / scan') + '</button>' +
        '<label class="btn btn-ghost btn-small upload-label"><input type="file" accept="image/*" data-record-input hidden>' + icon('image') + L('从相册选择', 'From gallery') + '</label>' +
        '<span class="micro-note">' + L('最多 3 张；摄像头需 localhost/HTTPS。', 'Up to 3; camera needs localhost/HTTPS.') + '</span>' +
      '</div>' : '') +
      (records.length === 0 ? '<p class="micro-note record-empty">' + L('还没有照片。拍照或从相册选择后，会显示在这里。', 'No photos yet. Take one or choose from the gallery and it will appear here.') + '</p>' : '') +
      '<div class="record-actions">' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="demo-ocr">' + icon('search') + L('用示例报告体验智能识别', 'Try smart recognition with a sample') + '</button>' +
        '<span class="micro-note">' + L('OCR 为演示；真实照片不会上传，也不会自动诊断。', 'OCR is a demo. Real photos are never uploaded or auto-diagnosed.') + '</span>' +
      '</div>' +
      '<p class="micro-note">' + L('照片只保存在浏览器本地，不会上传到服务器。清除浏览器数据会一并删除。', 'Photos stay in this browser and are never uploaded. Clearing browser data deletes them.') + '</p>' +
    '</section>';

    const privacy = '<section class="form-card privacy-card">' +
      '<div class="form-head"><span class="form-num">06</span><div><h2>' + L('隐私与设置', 'Privacy & settings') + '</h2><p>' + L('你可以随时清除全部资料。', 'You can clear everything at any time.') + '</p></div></div>' +
      '<div class="settings-list">' +
        '<button type="button" class="settings-row" data-action="toggle-lang"><span>' + icon('globe') + '<span><strong>' + L('语言', 'Language') + '</strong><small>' + (WA.lang() === 'en' ? 'English' : '中文') + '</small></span></span>' + icon('chevron') + '</button>' +
        '<button type="button" class="settings-row" data-action="toggle-bigtext"><span>' + icon('file') + '<span><strong>' + L('大字急救模式', 'Large-text emergency') + '</strong><small>' + (WA.state.settings.bigText ? L('已开启', 'On') : L('关闭', 'Off')) + '</small></span></span>' + icon('chevron') + '</button>' +
        '<button type="button" class="settings-row danger" data-action="clear-data"><span>' + icon('trash') + '<span><strong>' + L('清除全部资料', 'Clear all data') + '</strong><small>' + L('档案、病历照片、定位和设置', 'File, photos, location and settings') + '</small></span></span>' + icon('chevron') + '</button>' +
      '</div>' +
      '<div class="privacy-note">' + icon('lock') + '<p>' + L('胃安不设账号、不上传健康资料。资料仅保存在当前浏览器的 localStorage 中。换浏览器、无痕模式或清除缓存后会丢失。', 'TummyBuddy has no account and does not upload health data. Everything is stored in this browser’s localStorage. It is lost if you change browsers, use private mode or clear cache.') + '</p></div>' +
    '</section>';

    const sticky = '<div class="profile-sticky">' +
      '<div class="profile-sticky-inner">' +
        (onboarding ? '<button type="button" class="text-link" data-action="skip-profile">' + L('先跳过，稍后填', 'Skip for now') + '</button>' : '<span class="micro-note">' + L('保存后只在本机生效', 'Saved on this device only') + '</span>') +
        '<button type="button" class="btn btn-primary" data-action="save-profile">' + icon('check') + (onboarding ? L('保存并进入首页', 'Save and go home') : L('保存档案', 'Save my file')) + '</button>' +
      '</div>' +
    '</div>';

    return '<div class="page profile-page">' + banner + head + cardPreview + basic + contact + conditions + allergies + recordsCard + privacy + '<div class="profile-error" id="profile-error" role="alert"></div>' + sticky + '</div>';
  };

  /* =========================================================
     养胃小课
     ========================================================= */
  S.learn = function () {
    const filter = WA.learnFilter || 'all';
    const cats = [
      { id: 'all', label: L('全部', 'All') },
      { id: 'food', label: L('吃与睡', 'Food & sleep') },
      { id: 'mind', label: L('情绪', 'Mood') },
      { id: 'safety', label: L('安全', 'Safety') },
      { id: 'care', label: L('就医', 'Care') },
      { id: 'tcm', label: L('中医', 'TCM') }
    ];
    const list = WA.LEARN.filter(function (a) { return filter === 'all' || a.category === filter; });
    return '<div class="page learn-page">' +
      '<header class="page-head">' + kicker(L('健康教育', 'HEALTH EDUCATION')) +
        '<h1>' + L('养胃小课', 'Stomach school') + '</h1>' +
        '<p>' + L('不是养生玄学，是有出处的日常建议。每篇 2–3 分钟，先看懂，再决定要不要改。', 'Not wellness folklore — practical advice with sources. Each read takes 2–3 minutes. Understand first, then decide what to change.') + '</p>' +
      '</header>' +
      safetyStrip(L('这些内容用于健康教育，不能替代医生诊断或处方。症状持续、加重或出现危险信号，请就医。', 'This is health education, not diagnosis or prescription. If symptoms persist, worsen or danger signs appear, seek care.')) +
      '<div class="filter-row" role="tablist">' + cats.map(function (c) {
        return '<button type="button" class="filter-chip' + (filter === c.id ? ' is-active' : '') + '" data-learn-filter="' + c.id + '" role="tab" aria-selected="' + (filter === c.id) + '">' + c.label + '</button>';
      }).join('') + '</div>' +
      '<div class="article-grid">' + list.map(function (a) {
        return '<button type="button" class="article-card" data-action="open-article" data-id="' + a.id + '">' +
          '<span class="article-top"><span class="article-icon">' + icon(a.icon) + '</span><span class="article-time">' + a.time + ' min</span></span>' +
          '<span class="article-cat">' + cats.find(function (x) { return x.id === a.category; }).label + '</span>' +
          '<strong>' + tx(a.title) + '</strong>' +
          '<span class="article-dek">' + tx(a.dek) + '</span>' +
          '<span class="article-foot">' + L('读这篇', 'Read this') + icon('arrow') + '</span>' +
        '</button>';
      }).join('') + '</div>' +
      '<div class="learn-tip">' + icon('leaf') + '<div><strong>' + L('一个提醒', 'One reminder') + '</strong><p>' + L('不要因为一篇科普就自行买药、停药或长期忌口。身体的事，最好让医生看见你本人。', 'Do not start, stop or restrict treatment based on one article. For your body, let a doctor see you in person.') + '</p></div></div>' +
    '</div>';
  };

  /* =========================================================
     关于 / 说明书
     ========================================================= */
  S.about = function () {
    return '<div class="page about-page">' +
      '<header class="about-hero">' +
        '<div class="about-copy">' + kicker(L('关于胃安', 'ABOUT')) +
          '<h1>' + L('我们是谁？', 'Who are we?') + '</h1>' +
          '<p class="about-lead">' + L('几个被胃痛耽误过干饭的人，拉上消化科医生、中医师和做产品的朋友，做了一个不吓人、也不糊弄人的小工具。', 'A few people whose meals have been ruined by stomach pain, working with gastroenterologists, TCM practitioners and product friends on something that is neither scary nor sloppy.') + '</p>' +
          '<p>' + L('我们不想再看到两种场面：一种是“忍忍就过去了”，最后拖成急诊；另一种是“网上说是胃癌”，把自己吓到睡不着。胃安想做的，是在中间放一盏路灯。', 'We are tired of two scenes: “it will pass” until it becomes an emergency, and “the internet says cancer” until you cannot sleep. TummyBuddy is a streetlight in the middle.') + '</p>' +
        '</div>' +
        '<div class="about-mascot">' + WA.mascot(190) + '<div class="about-bubble">' + L('“我不替你诊断。我帮你问对问题。”', '“I do not diagnose you. I help you ask the right questions.”') + '</div></div>' +
      '</header>' +
      sectionHead(L('三步说明', 'THE 3 STEPS'), L('三步，把“不舒服”说清楚', 'Three steps to explain what is wrong'), L('先保命，再说清，最后才是可能性。', 'Safety first, clarity second, possibilities last.')) +
      '<div class="process-grid">' +
        '<div class="process-card"><span>01</span><div class="process-icon">' + icon('siren') + '</div><h3>' + L('先保命', 'Safety first') + '</h3><p>' + L('剧烈腹痛、呕血黑便、胸痛大汗、晕厥、孕期出血——这些不适合在家自测。先拨打 120。', 'Severe pain, vomiting blood or black stools, chest pain with sweat, fainting, pregnancy bleeding — these do not belong in a self-check. Call 120.') + '</p></div>' +
        '<div class="process-card"><span>02</span><div class="process-icon">' + icon('file') + '</div><h3>' + L('再说清', 'Then clarity') + '</h3><p>' + L('把位置、时间、吃饭关系、反酸打嗝、用药、情绪和舌象放在一起看，而不是只盯“胃疼”两个字。', 'Put location, timing, meals, reflux, belching, medicines, mood and tongue together — not just the word “stomachache”.') + '</p></div>' +
        '<div class="process-card"><span>03</span><div class="process-icon">' + icon('route') + '</div><h3>' + L('再判断', 'Then direction') + '</h3><p>' + L('给出优先科室、可能需要做的检查和要问医生的问题。不是病名判决书。', 'A priority clinic, possible tests and questions for the doctor. Not a verdict.') + '</p></div>' +
      '</div>' +
      '<div class="about-note">' + icon('route') + '<div><strong>' + L('该去哪一科，就写清楚。', 'Say which clinic — clearly.') + '</strong><p>' + L('刀割样咽痛不一定只看呼吸科；鼻窦炎也可能要耳鼻喉科。胃痛也不一定是胃病。我们会在结果里写清楚“先去哪一科”，而不是把所有不舒服都归到胃。', 'A knife-like sore throat is not always a respiratory problem; sinusitis may need ENT. Stomach pain is not always the stomach. The result says which clinic to go to first — it does not file everything under “gastritis”.') + '</p></div></div>' +
      '<div class="about-note">' + icon('info') + '<div><strong>' + L('我们不是', 'We are not') + '</strong><p>' + L('不是医疗器械，不是急诊替代，不是处方生成器，也不是“AI 医生”。如果你正在犹豫要不要去医院，答案是：去吧。', 'Not a medical device, not an emergency service, not a prescription generator, not an “AI doctor”. If you are wondering whether to go to hospital, the answer is yes.') + '</p></div></div>' +
      sectionHead(L('名字的由来', 'THE NAME'), L('为什么叫 TummyBuddy？', 'Why TummyBuddy?'), '', '') +
      '<div class="name-card"><div class="name-word">Tummy<span>Buddy</span></div><p>' + L('tummy 是“肚子”，buddy 是“伙伴”。中文叫“胃安”，取“胃部安稳”的意思。我们希望它在手机里像一个不慌不忙的朋友。', '“Tummy” is your belly; a “buddy” is a friend. The Chinese name 胃安 means “a settled stomach”. We want it to feel like a calm friend on your phone.') + '</p></div>' +
      sectionHead(L('知识底座与边界', 'SOURCES & BOUNDARIES'), L('知识底座与边界', 'Sources and boundaries'), '', '') +
      '<div class="source-card">' +
        '<div class="kb-stats"><span><b>8</b>' + L('个危险信号', 'red flags') + '</span><span><b>11</b>' + L('类常见情况', 'conditions') + '</span><span><b>7</b>' + L('篇养胃课', 'learning notes') + '</span><span><b>3</b>' + L('部核心参考', 'core references') + '</span></div>' +
        '<p><strong>' + L('内容参考', 'References') + '</strong></p>' +
        '<ul>' +
          '<li>' + L('《黄帝内经》情志与脾胃理论；《神农本草经》药物分类（仅作文化背景，不提供剂量与处方）。', 'Huangdi Neijing on emotion and the Spleen-Stomach; Shennong Bencao Jing for historical context only — no doses or prescriptions.') + '</li>' +
          '<li>' + L('《内科学》消化系统章节、胃食管反流病 / 幽门螺杆菌 / 消化性溃疡相关诊疗共识。', 'Internal Medicine gastroenterology chapters; consensus guidance on GERD, H. pylori and peptic ulcer.') + '</li>' +
          '<li>' + L('急诊分诊原则：危险信号优先于症状匹配；胸痛、消化道出血、晕厥、孕期腹痛按急症处理。', 'Emergency triage principles: danger signs outrank symptom matching; chest pain, GI bleeding, fainting and pregnancy pain are treated as emergencies.') + '</li>' +
        '</ul>' +
        '<p class="micro-note">' + L('本演示没有训练或微调任何大模型，也没有把教材原文直接变成诊断结论。所有结论来自可解释的规则与经过整理的科普内容。正式版会把医生审核过的教材条目做成检索增强，而不是让模型自由发挥。', 'This demo does not train or fine-tune any large model, and does not turn textbook text directly into diagnoses. Results come from explainable rules and curated education content. A production version would use doctor-reviewed textbook passages as retrieval support — not let a model improvise.') + '</p>' +
      '</div>' +
      '<div class="version-line"><span>' + L('胃安 / TummyBuddy', 'TummyBuddy / 胃安') + ' · v' + WA.VERSION + '</span><span>' + L('双语原型 · 仅用于健康教育与产品演示', 'Bilingual prototype · health education and product demo only') + '</span></div>' +
    '</div>';
  };

  /* =========================================================
     急救
     ========================================================= */
  function elapsedText() {
    const start = WA.state.emergencyStart || Date.now();
    const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function locationBlock() {
    const loc = WA.state.location;
    const has = !!(loc.lat || loc.address);
    const region = WA.regionText(loc);
    const regionLine = region || (loc.geocoding ? L('正在解析省 / 市 / 区 / 街道…', 'Resolving province / city / district / street…') : (loc.geocodeError ? L('行政区划未解析，请手动补全', 'Region not resolved — please complete it manually') : L('行政区划待解析', 'Region not resolved yet')));
    return '<div class="emergency-loc ' + (has ? 'is-on' : 'is-off') + '">' +
      '<div class="el-top"><span class="live-dot"></span><strong>' + (has ? L('实时定位', 'Live location') : L('定位未开启', 'Location is off')) + '</strong><span id="loc-updated">' + WA.timeAgo(loc.updatedAt) + '</span></div>' +
      '<div class="el-region" id="loc-region">' + esc(regionLine) + '</div>' +
      '<div class="el-address" id="loc-address">' + esc(has ? WA.locationText() : L('现在开启定位，救护车才能找到你。', 'Turn on location now so the ambulance can find you.')) + '</div>' +
      '<div class="el-meta"><span>' + icon('locate') + '<span id="loc-coords">' + WA.coordText(loc) + '</span></span><span>±<span id="loc-accuracy">' + (loc.accuracy ? Math.round(loc.accuracy) : '—') + '</span> m</span></div>' +
      '<div class="el-actions">' +
        (has ? '<button type="button" class="mini-btn" data-action="speak-location">' + icon('volume') + L('朗读地址', 'Read address') + '</button>' +
          '<button type="button" class="mini-btn" data-action="copy-location">' + icon('copy') + L('复制', 'Copy') + '</button>' +
          '<button type="button" class="mini-btn" data-action="refresh-location">' + icon('refresh') + L('刷新', 'Refresh') + '</button>' +
          '<button type="button" class="mini-btn" data-action="lookup-address">' + icon('search') + L('解析省市区', 'Resolve region') + '</button>'
          : '<button type="button" class="btn btn-dark btn-small" data-action="request-location">' + icon('locate') + L('立即开启定位', 'Turn on location now') + '</button>') +
      '</div>' +
      (has ? '<p class="el-note">' + (loc.geocodePartial ? L('街道未解析，可手动补全。', 'Street not resolved — complete it manually.') + ' ' : '') + L('“朗读地址”只在本机播放，不会自动传给 120。内容包含省 / 市 / 区 / 街道和坐标。为解析行政区划，坐标会发送给 OpenStreetMap 和备用区划服务。', '“Read address” only plays on this device and is not sent to 120 automatically. It includes province / city / district / street and coordinates. Coordinates are sent to OpenStreetMap and a backup region service.') + '</p>' : '') +
    '</div>';
  }

  function emergencyInfoCard() {
    const p = WA.state.profile;
    const comp = WA.profileCompletion();
    const contactPhone = String(p.contactPhone || '').replace(/[^\d+]/g, '');
    const contactReady = !!(p.contactName && contactPhone);
    const medText = [WA.medLabels().join('、'), p.medsOther].filter(Boolean).join('；') || L('未填写', 'Not set');
    return '<section class="em-info">' +
      '<div class="em-section-head"><div><span class="em-num">04</span><h2>' + L('急救信息卡', 'Emergency information') + '</h2></div><span class="em-ready ' + (comp.score >= 60 ? 'is-ready' : '') + '">' + comp.score + '%</span></div>' +
      '<div class="em-info-grid">' +
        '<div><small>' + L('姓名 / 年龄', 'Name / age') + '</small><strong>' + esc(p.name || L('未填写', 'Not set')) + ' · ' + WA.ageLabel() + '</strong></div>' +
        '<div><small>' + L('慢病', 'Conditions') + '</small><strong>' + (WA.conditionLabels().join('、') || L('未填写', 'Not set')) + '</strong></div>' +
        '<div><small>' + L('用药', 'Medicines') + '</small><strong>' + esc(medText) + '</strong></div>' +
        '<div><small>' + L('过敏', 'Allergies') + '</small><strong>' + (p.allergies ? esc(p.allergies) : (p.noAllergies ? L('无已知过敏', 'No known allergies') : L('未填写', 'Not set'))) + '</strong></div>' +
      '</div>' +
      (comp.score < 60 ? '<div class="inline-warning is-danger">' + icon('alert') + '<span>' + L('档案不完整：急救人员可能不知道你的病史、用药和联系人。现在补齐，别等昏迷。', 'Your file is incomplete: medics may not know your history, medicines or contact. Fill it in now.') + '</span><button type="button" class="text-link" data-action="nav" data-nav="profile">' + L('去补齐', 'Complete it') + icon('arrow') + '</button></div>' : '') +
      '<div class="em-info-actions">' +
        (contactReady
          ? '<a class="btn btn-dark btn-small" href="tel:' + esc(contactPhone) + '" data-action="call-contact">' + icon('phone') + L('拨打紧急联系人', 'Call contact') + '</a>' +
            '<a class="btn btn-ghost btn-small" href="sms:' + esc(contactPhone) + '?body=' + encodeURIComponent(WA.emergencyMessage()) + '" data-action="send-info">' + icon('send') + L('发送信息', 'Send info') + '</a>'
          : '<button type="button" class="btn btn-dark btn-small" data-action="nav" data-nav="profile">' + icon('user') + L('先填写紧急联系人', 'Add an emergency contact') + '</button>') +
        '<button type="button" class="btn btn-ghost btn-small" data-action="copy-info">' + icon('copy') + L('复制信息', 'Copy info') + '</button>' +
      '</div>' +
      '<button type="button" class="autosend-row ' + (WA.state.settings.autoSend ? 'is-on' : '') + '" data-action="toggle-autosend">' +
        '<span class="switch"><i></i></span><span><strong>' + L('无响应时自动发送（演示）', 'Auto-send if unresponsive (demo)') + '</strong><small>' + L('网页版无法在后台自动发送；正式 App 可接入系统级紧急功能。', 'A web page cannot send in the background. A native app could use system emergency features.') + '</small></span>' +
      '</button>' +
    '</section>';
  }

  function bigTextEmergency() {
    const p = WA.state.profile;
    const contactPhone = String(p.contactPhone || '').replace(/[^\d+]/g, '');
    const hasContact = !!(p.contactName && contactPhone);
    const pregnant = WA.isPregnant();
    const loc = WA.state.location;
    const region = WA.regionText(loc) || L('定位尚未解析', 'Location not resolved');
    const address = WA.locationText() || L('还没有地址，请点“定位”', 'No address yet — tap Location');
    return '<div class="big-em-page">' +
      '<div class="big-em-bar">' +
        '<span class="big-em-badge">' + L('大字急救模式', 'LARGE-TEXT EMERGENCY') + '</span>' +
        '<span class="big-em-timer" id="emergency-timer">' + elapsedText() + '</span>' +
        '<button type="button" class="big-em-exit" data-action="toggle-bigtext">' + L('退出大字', 'Exit large text') + '</button>' +
      '</div>' +
      '<p class="big-em-kicker">' + L('不要等 · 不要自己开车', 'DO NOT WAIT · DO NOT DRIVE') + '</p>' +
      '<h1 class="big-em-title"><span>' + L('现在拨打', 'CALL NOW') + '</span><strong>120</strong></h1>' +
      '<a class="big-em-call" href="tel:120" data-action="call120">' +
        '<span>' + L('一键拨打', 'CALL') + '</span>' +
        '<strong>120</strong>' +
        '<small>' + L('打开免提 · 读出下方地址', 'Speakerphone on · read the address below') + '</small>' +
      '</a>' +
      (hasContact
        ? '<a class="big-em-contact" href="tel:' + esc(contactPhone) + '" data-action="call-contact">' +
            '<span>' + L('拨打紧急联系人', 'CALL EMERGENCY CONTACT') + '</span>' +
            '<strong>' + esc(p.contactName) + '</strong>' +
            '<small>' + esc(p.contactPhone) + '</small>' +
          '</a>'
        : '<button type="button" class="big-em-contact is-empty" data-action="nav" data-nav="profile">' +
            '<span>' + L('紧急联系人', 'EMERGENCY CONTACT') + '</span>' +
            '<strong>' + L('未填写', 'NOT SET') + '</strong>' +
            '<small>' + L('点此去档案填写', 'Tap to add in My File') + '</small>' +
          '</button>') +
      '<div class="big-em-location">' +
        '<span>' + L('我的位置', 'MY LOCATION') + '</span>' +
        '<strong>' + esc(region) + '</strong>' +
        '<p>' + esc(address) + '</p>' +
      '</div>' +
      '<div class="big-em-steps">' +
        '<div class="big-em-step"><span>1</span><div><strong>' + L('开门', 'OPEN DOOR') + '</strong><p>' + L('开灯 · 留钥匙', 'Lights on · leave key') + '</p></div></div>' +
        '<div class="big-em-step"><span>2</span><div><strong>' + L('侧卧', 'ON YOUR SIDE') + '</strong><p>' + L('头偏向一侧', 'Head to one side') + '</p></div></div>' +
        '<div class="big-em-step"><span>3</span><div><strong>' + L('不要吃喝', 'NO FOOD OR DRINK') + '</strong><p>' + L('不自行吃药', 'No self-medication') + '</p></div></div>' +
      '</div>' +
      (pregnant ? '<div class="big-em-pregnant">' + icon('pregnant') + '<strong>' + L('怀孕：左侧卧，不要自行吃药', 'PREGNANT: LEFT SIDE · NO SELF-MEDICATION') + '</strong></div>' : '') +
      '<div class="big-em-actions">' +
        '<button type="button" class="btn btn-ghost" data-action="speak-emergency">' + icon('volume') + L('朗读急救要点', 'Read key steps') + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="speak-location">' + icon('volume') + L('朗读地址', 'Read address') + '</button>' +
        '<button type="button" class="btn btn-ghost" data-action="open-location">' + icon('pin') + L('定位', 'Location') + '</button>' +
      '</div>' +
      '<p class="big-em-note">' + L('网页不能把定位自动传给急救中心。拨号后请打开免提，把地址读给调度员。', 'A web page cannot send your location to the dispatcher automatically. After dialling, use speakerphone and read the address aloud.') + '</p>' +
    '</div>';
  }

  S.emergency = function () {
    if (WA.state.settings.bigText) return bigTextEmergency();
    const p = WA.state.profile;
    const contactPhone = String(p.contactPhone || '').replace(/[^\d+]/g, '');
    const hasContact = !!(p.contactName && contactPhone);
    const pregnant = WA.isPregnant();
    const female = p.sex === 'female' || p.sex === 'undisclosed';
    const comp = WA.profileCompletion();
    const initial = elapsedText();

    return '<div class="emergency-page">' +
      '<div class="emergency-bar">' +
        '<span class="em-badge"><i></i>' + L('危急检测 · 急救模式', 'EMERGENCY MODE') + '</span>' +
        '<span class="em-timer" id="emergency-timer" aria-label="' + L('已进入急救模式的时间', 'Time in emergency mode') + '">' + initial + '</span>' +
        '<button type="button" class="bigtext-btn' + (WA.state.settings.bigText ? ' is-on' : '') + '" data-action="toggle-bigtext">' + icon('file') + L('大字模式', 'Large text') + '</button>' +
      '</div>' +

      '<section class="em-hero">' +
        '<div class="em-hero-copy">' +
          '<p class="em-kicker">' + L('不要等自测结果 · 不要自己开车', 'DO NOT WAIT FOR A RESULT · DO NOT DRIVE YOURSELF') + '</p>' +
          '<h1>' + L('现在拨打 ', 'Call ') + '<span>120</span>' + L('。', ' now.') + '</h1>' +
          '<p class="em-lead">' + L('你进入了危急检测。下面的动作只是等待救护车时的安全措施，不能代替急救。', 'You are in emergency mode. The steps below are safety measures while you wait — they do not replace emergency care.') + '</p>' +
          '<a class="call-button" href="tel:120" data-action="call120">' +
            '<span class="call-icon">' + icon('phone') + '</span>' +
            '<span class="call-copy"><strong>' + L('一键拨打 120（测试）', 'Call 120 (test)') + '</strong><small>' + L('测试号码 · 拨号后开免提，读出地址', 'Test number · speakerphone on, read the address') + '</small></span>' +
            '<span class="call-arrow">' + icon('arrow') + '</span>' +
          '</a>' +
          '<div class="call-contact-row">' +
            (hasContact
              ? '<a class="call-contact" href="tel:' + esc(contactPhone) + '" data-action="call-contact" aria-label="' + L('拨打紧急联系人', 'Call emergency contact') + '">' +
                  '<span class="cc-icon">' + icon('user') + '</span>' +
                  '<span class="cc-copy"><strong>' + L('拨打紧急联系人', 'Call emergency contact') + '</strong><small>' + esc(p.contactName) + ' · ' + esc(p.contactPhone) + '</small></span>' +
                  '<span class="cc-arrow">' + icon('phone') + '</span>' +
                '</a>'
              : '<button type="button" class="call-contact is-empty" data-action="nav" data-nav="profile">' +
                  '<span class="cc-icon">' + icon('user') + '</span>' +
                  '<span class="cc-copy"><strong>' + L('未填写紧急联系人', 'No emergency contact yet') + '</strong><small>' + L('先去档案填写，昏迷时急救人员可以联系', 'Add one in My File so medics can call someone') + '</small></span>' +
                  '<span class="cc-arrow">' + icon('chevron') + '</span>' +
                '</button>') +
          '</div>' +
          '<p class="em-call-note">' + L('网页不能把定位或病史自动传给急救中心。“朗读地址”只在本机播放。拨号后请打开免提，把下方地址读给调度员。', 'A web page cannot send your location or history to the dispatcher automatically. “Read address” only plays on this device. After dialling, use speakerphone and read the address aloud.') + '</p>' +
          '<p class="em-region">' + L('测试拨打 120 · 正式急救 120 / 999 / 119 · 海外请拨当地急救电话', 'Test number 120 · real emergency 120 / 999 / 119 · use your local number elsewhere') + '</p>' +
          '<button type="button" class="text-link light" data-action="speak-emergency">' + icon('volume') + L('先听一遍急救要点', 'Hear the key steps first') + '</button>' +
        '</div>' +
        '<div class="em-hero-side">' +
          locationBlock() +
          (pregnant ? '<div class="pregnancy-quick">' + icon('pregnant') + '<div><strong>' + L('你已标记怀孕。左侧卧，不要自行吃药。', 'You marked pregnancy. Lie on your left side. Do not self-medicate.') + '</strong><small>' + L('告诉 120：“我怀孕了，大约几周。” 如果出血或下腹剧痛，强调“可能宫外孕”。', 'Tell 120: “I am pregnant, about how many weeks.” If there is bleeding or severe lower pain, say “possible ectopic pregnancy”.') + '</small></div></div>' : '') +
          '<div class="em-breath-card">' +
            '<div class="breath-orb" id="breath-orb"><span id="breath-label">' + L('准备好了就开始', 'Ready when you are') + '</span></div>' +
            '<div class="breath-copy"><strong>' + L('疼得看不清屏幕？', 'Pain making the screen hard to read?') + '</strong><p>' + L('打开大字模式，或跟着圆点呼吸：吸 4 秒，呼 6 秒。', 'Turn on large text, or follow the circle: in for 4, out for 6.') + '</p>' +
              '<div class="breath-actions"><button type="button" class="mini-btn" data-action="toggle-breath">' + icon('breath') + '<span data-breath-label>' + L('开始呼吸引导', 'Start breathing guide') + '</span></button>' +
              '<button type="button" class="mini-btn" data-action="toggle-music"><span data-audio-icon>' + icon(WA.state.ui.music ? 'stop' : 'music') + '</span><span data-audio-label>' + (WA.state.ui.music ? L('停止舒缓音', 'Stop calming audio') : L('播放舒缓音', 'Play calming audio')) + '</span></button></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="em-three">' +
        '<div class="em-card door-card">' +
          '<div class="em-card-head"><span class="em-num">01</span><h2>' + L('开门，让救护人员进来', 'Open the door') + '</h2></div>' +
          '<p>' + L('如果还能动，现在做这三件事。做完一件打一个勾。', 'If you can still move, do these three things. Tick each one.') + '</p>' +
          '<label class="check-row"><input type="checkbox"><span class="fake-check">' + icon('check') + '</span><span><strong>' + L('打开房门，或把钥匙留给邻居 / 房东', 'Unlock the door, or leave a key with a neighbour / landlord') + '</strong><small>' + L('不要反锁内门；告诉对方钥匙在哪。', 'Do not double-lock the inner door. Tell them where the key is.') + '</small></span></label>' +
          '<label class="check-row"><input type="checkbox"><span class="fake-check">' + icon('check') + '</span><span><strong>' + L('打开楼道灯 / 门灯', 'Turn on the corridor or door light') + '</strong><small>' + L('夜里尤其重要，救护人员要看清门牌。', 'Especially at night, so they can read your door number.') + '</small></span></label>' +
          '<label class="check-row"><input type="checkbox"><span class="fake-check">' + icon('check') + '</span><span><strong>' + L('把楼栋、单元、楼层、门牌告诉 120', 'Tell 120 your building, unit, floor and door number') + '</strong><small>' + L('如果安全，坐在门边等，不要锁门。', 'If it is safe, wait by the door. Do not lock yourself in.') + '</small></span></label>' +
        '</div>' +
        '<div class="em-card position-card">' +
          '<div class="em-card-head"><span class="em-num">02</span><h2>' + L('选一个能呼吸的姿势', 'Choose a safe position') + '</h2></div>' +
          '<p>' + L('不要勉强平躺。疼痛允许时，半坐卧或侧卧蜷曲；想吐时头偏向一侧。', 'Do not force yourself to lie flat. Sit propped up or lie curled on your side; turn your head to one side if you may vomit.') + '</p>' +
          '<div class="position-visual">' + icon('chair') + '<span>' + L('半坐卧', 'Propped up') + '</span><i></i>' + icon('breath') + '<span>' + L('缓慢呼吸', 'Slow breathing') + '</span></div>' +
          (pregnant ? '<div class="pregnant-inline">' + icon('pregnant') + '<span>' + L('你已标记怀孕：优先左侧卧，不要自行吃药，告诉 120“我怀孕了”。', 'You marked pregnancy: lie on your left side, do not self-medicate, and tell 120 “I am pregnant”.') + '</span></div>' : '') +
          '<p class="micro-note">' + L('如果出现呕吐，头偏向一侧，防止呛入气道；意识不清时不要喂水喂药。', 'If vomiting, turn the head to one side to prevent choking. Never give food, water or medicine to someone who is drowsy or unconscious.') + '</p>' +
        '</div>' +
        '<div class="em-card no-card">' +
          '<div class="em-card-head"><span class="em-num">03</span><h2>' + L('不要做这些', 'Do not do these') + '</h2></div>' +
          '<ul class="no-list">' +
            '<li><span>×</span>' + L('不要吃东西、喝水、喝姜茶或“养胃”饮品。', 'No food, water, ginger tea or “stomach-soothing” drinks.') + '</li>' +
            '<li><span>×</span>' + L('不要自行吃止痛药、胃药、阿司匹林或中成药。', 'No painkillers, antacids, aspirin or herbal medicine on your own.') + '</li>' +
            '<li><span>×</span>' + L('不要热敷或用力按摩剧烈腹痛。', 'Do not heat or massage a severe belly.') + '</li>' +
            '<li><span>×</span>' + L('不要自己开车；如无人陪同，等救护车。', 'Do not drive yourself. If alone, wait for the ambulance.') + '</li>' +
          '</ul>' +
        '</div>' +
      '</section>' +

      (female ? '<section class="pregnancy-panel' + (pregnant ? ' is-on' : '') + '">' +
        '<div class="pp-icon">' + icon('pregnant') + '</div>' +
        '<div class="pp-copy"><h2>' + (pregnant ? L('孕妇关怀已开启', 'Pregnancy care is on') : L('怀孕或可能怀孕？', 'Pregnant or possibly pregnant?')) + '</h2>' +
          '<p>' + (pregnant ? L('左侧卧，不要自行吃任何药，告诉 120 你怀孕了、几周了。如果出现阴道出血或剧烈下腹痛，强调“可能宫外孕”。', 'Lie on your left side. Do not take any medicine on your own. Tell 120 that you are pregnant and how many weeks. If there is bleeding or severe lower pain, say “possible ectopic pregnancy”.') : L('怀孕会让腹痛、用药和检查的选择完全不同。现在标记，急救页会给出孕妇专用提示。', 'Pregnancy changes pain, medicine and test decisions. Mark it now and the emergency page will show pregnancy-specific guidance.')) + '</p></div>' +
        '<button type="button" class="btn ' + (pregnant ? 'btn-ghost' : 'btn-dark') + ' btn-small" data-action="' + (pregnant ? 'unmark-pregnant' : 'mark-pregnant') + '">' + (pregnant ? L('取消标记', 'Turn off') : L('我怀孕 / 可能怀孕', 'I am / may be pregnant')) + '</button>' +
      '</section>' : '') +

      '<section class="companion">' +
        '<div class="companion-mascot">' + WA.mascot(146) + '</div>' +
        '<div class="companion-copy">' +
          kicker(L('陪伴模式', 'COMPANION')) +
          '<h2>' + L('小安在。你不用一个人扛。', 'An is here. You do not have to do this alone.') + '</h2>' +
          '<p>' + L('如果屏幕模糊，按下面任意一个按钮。语音会慢一点、重复一遍；音乐只是帮你稳住呼吸，不能替代急救。', 'If the screen is blurry, use any button below. The voice will slow down and repeat. Music only helps you breathe; it never replaces emergency care.') + '</p>' +
          '<div class="companion-actions">' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="speak-emergency">' + icon('volume') + L('语音播报急救要点', 'Read the key steps') + '</button>' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="toggle-bigtext">' + icon('file') + L('大字急救', 'Large-text emergency') + '</button>' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="toggle-breath">' + icon('breath') + '<span data-breath-label>' + L('开始呼吸引导', 'Start breathing guide') + '</span></button>' +
            '<button type="button" class="btn btn-ghost btn-small" data-action="toggle-music"><span data-audio-icon>' + icon(WA.state.ui.music ? 'stop' : 'music') + '</span><span data-audio-label>' + (WA.state.ui.music ? L('停止舒缓音', 'Stop calming audio') : L('播放舒缓音', 'Play calming audio')) + '</span></button>' +
          '</div>' +
          '<p class="micro-note">' + L('如果语音和 120 调度员的指令冲突，以 120 为准。', 'If the voice here conflicts with the 120 dispatcher, follow the dispatcher.') + '</p>' +
        '</div>' +
      '</section>' +

      emergencyInfoCard() +

      '<section class="em-uncertain">' +
        '<div><strong>' + L('如果你其实不确定是不是急症', 'If you are not sure this is an emergency') + '</strong><p>' + L('先做 30 秒危险信号核对。不要因为“怕麻烦”而留在急救页，也不要因为“还能忍”而离开。', 'Run the 30-second danger check. Do not stay here out of politeness, and do not leave because you can still bear it.') + '</p></div>' +
        '<div class="em-uncertain-actions"><button type="button" class="btn btn-ghost btn-small" data-action="emergency-uncertain">' + L('做 30 秒核对', 'Run the 30-second check') + icon('arrow') + '</button><button type="button" class="btn btn-ghost btn-small" data-action="home">' + L('返回首页', 'Back home') + '</button></div>' +
      '</section>' +

      '<footer class="em-footer">' + L('本页不替代急救调度员的指导。若症状与你的判断不一致，以 120 和现场医生的意见为准。', 'This page does not replace the dispatcher. If your judgement conflicts with 120 or the on-scene doctor, follow them.') + '</footer>' +
    '</div>';
  };

  /* =========================================================
     “重”：定向排查
     ========================================================= */
  function flowHead(step, total, label, backAction) {
    let segs = '';
    for (let i = 0; i < total; i++) segs += '<span class="' + (i < step ? 'is-done' : i === step ? 'is-current' : '') + '"></span>';
    return '<div class="flow-head">' +
      '<button type="button" class="back-btn" data-action="' + (backAction || 'back') + '">' + icon('back') + '<span>' + L('返回', 'Back') + '</span></button>' +
      '<div class="flow-progress"><div class="flow-segs">' + segs + '</div><span>' + label + '</span></div>' +
      '<span class="flow-time">' + icon('clock') + L('约 3 分钟', 'about 3 min') + '</span>' +
    '</div>';
  }

  S.moderate = function () {
    const m = WA.state.moderate;
    const step = m.step || 0;
    if (step === 0) return moderateClusters();
    if (step === 1) return moderateFlags();
    return moderateQuestions();
  };

  function moderateClusters() {
    return '<div class="page flow-page moderate-page">' +
      flowHead(0, 3, L('第 1 / 3 步 · 选择症状', 'Step 1 of 3 · choose symptoms'), 'home') +
      '<header class="flow-title">' + kicker(L('定向排查', 'FOCUSED TRIAGE')) +
        '<h1>' + L('最像哪一种？', 'What feels closest?') + '</h1>' +
        '<p>' + L('选最困扰你的那一类。下一步仍会先排危险信号，选错也没关系。', 'Pick what bothers you most. The next step still screens for danger, so a wrong choice is not fatal.') + '</p>' +
      '</header>' +
      '<div class="cluster-grid">' + WA.CLUSTERS.map(function (c) {
        return '<button type="button" class="cluster-card tone-' + c.tone + '" data-action="choose-cluster" data-id="' + c.id + '">' +
          '<span class="cluster-icon">' + icon(c.icon) + '</span>' +
          '<span class="cluster-copy"><strong>' + tx(c.title) + '</strong><small>' + tx(c.desc) + '</small></span>' +
          '<span class="cluster-dept">' + tx(c.dept) + '</span>' +
          (c.priority ? '<span class="cluster-priority">' + L('先排心脏', 'Heart first') + '</span>' : '') +
          '<span class="cluster-arrow">' + icon('arrow') + '</span>' +
        '</button>';
      }).join('') + '</div>' +
      safetyStrip(L('如果现在有胸痛大汗、呕血黑便、突然剧烈腹痛或晕厥，不要选症状，直接拨打 120。', 'If you have chest pain with sweating, vomiting blood or black stools, sudden severe pain, or fainting right now, do not choose symptoms. Call 120.')) +
    '</div>';
  }

  function moderateFlags() {
    const flags = WA.RED_FLAGS.filter(function (f) { return ['chest', 'bleeding', 'severe', 'faint', 'pregnancy'].includes(f.id); });
    const selected = WA.state.moderate.answers.redFlags || [];
    const any = selected.length > 0;
    return '<div class="page flow-page moderate-page">' +
      flowHead(1, 3, L('第 2 / 3 步 · 危险信号', 'Step 2 of 3 · danger signs'), 'moderate-back') +
      '<header class="flow-title">' + kicker(L('安全核对', 'SAFETY CHECK')) +
        '<h1>' + L('先排掉不能等的情况', 'First rule out what cannot wait') + '</h1>' +
        '<p>' + L('这不是让你对号入座，而是决定“现在该不该拨打 120”。只要符合任意一项，就按急症处理。', 'This is not a diagnosis. It decides whether you need 120 now. Any one of these means emergency care.') + '</p>' +
      '</header>' +
      '<div class="flag-list">' + flags.map(function (f) {
        const on = selected.includes(f.id);
        return '<button type="button" class="flag-card' + (on ? ' is-on' : '') + '" data-action="toggle-mod-flag" data-id="' + f.id + '">' +
          '<span class="flag-icon">' + icon(f.icon) + '</span>' +
          '<span class="flag-copy"><strong>' + tx(f.title) + '</strong><small>' + tx(f.desc) + '</small></span>' +
          '<span class="flag-check">' + (on ? icon('check') : '') + '</span>' +
        '</button>';
      }).join('') + '</div>' +
      (any ? '<div class="urgent-callout">' + icon('alert') + '<div><strong>' + L('你勾选了危险信号。现在拨打 120。', 'You selected a danger sign. Call 120 now.') + '</strong><p>' + L('不要继续做问卷，不要等结果，不要自己开车。', 'Do not continue the questionnaire, wait for a result or drive yourself.') + '</p></div><button type="button" class="btn btn-danger" data-action="start-emergency">' + icon('phone') + L('进入急救', 'Go to emergency') + '</button></div>'
        : '<div class="none-callout">' + icon('check-circle') + '<div><strong>' + L('以上都没有？', 'None of these?') + '</strong><p>' + L('继续回答几个问题，我们会把你的线索放到一起看。', 'Answer a few questions and we will put the clues together.') + '</p></div><button type="button" class="btn btn-primary" data-action="moderate-next">' + L('继续', 'Continue') + icon('arrow') + '</button></div>') +
      '<div class="flow-actions"><button type="button" class="text-link" data-action="moderate-back">' + icon('back') + L('返回重新选症状', 'Back to symptom choice') + '</button></div>' +
    '</div>';
  }

  function qGroup(title, hint, options, key, type) {
    const a = WA.state.moderate.answers;
    const value = a[key];
    const multi = type === 'multi';
    return '<div class="q-group"><div class="q-head"><h3>' + title + '</h3>' + (hint ? '<span>' + hint + '</span>' : '') + '</div><div class="chip-grid">' +
      options.map(function (o) {
        const on = multi ? Array.isArray(value) && value.includes(o.value) : value === o.value;
        return '<button type="button" class="chip' + (on ? ' is-active' : '') + (o.danger ? ' is-danger' : '') + '" data-mod-' + (multi ? 'multi' : 'single') + '="' + key + '" data-value="' + o.value + '">' + o.label + (o.hint ? '<small>' + o.hint + '</small>' : '') + '</button>';
      }).join('') + '</div></div>';
  }

  function moderateQuestions() {
    const m = WA.state.moderate;
    const c = m.cluster;
    const a = m.answers;
    const duration = [
      { value: 'today', label: L('今天刚开始', 'Started today') },
      { value: 'days', label: L('2–3 天', '2–3 days') },
      { value: 'weeks', label: L('1–2 周', '1–2 weeks') },
      { value: 'month', label: L('1 个月以上', 'Over a month') },
      { value: 'recurrent', label: L('反复 3 个月以上', 'Recurring 3+ months') }
    ];
    const meal = [
      { value: 'before', label: L('空腹 / 饭前更明显', 'Worse when hungry / before meals') },
      { value: 'after', label: L('饭后更明显', 'Worse after meals') },
      { value: 'night', label: L('夜间会痛醒', 'Wakes me at night') },
      { value: 'none', label: L('和吃饭关系不大', 'Not clearly related to meals') },
      { value: 'unsure', label: L('说不清', 'Not sure') }
    ];
    const symptoms = [
      { value: 'reflux', label: L('反酸 / 烧心', 'Sour taste / heartburn') },
      { value: 'belch', label: L('打嗝 / 嗳气', 'Belching') },
      { value: 'nausea', label: L('恶心', 'Nausea') },
      { value: 'vomit', label: L('呕吐', 'Vomiting') },
      { value: 'bloat', label: L('胀满 / 早饱', 'Fullness / early fullness') },
      { value: 'diarrhea', label: L('腹泻', 'Diarrhoea') },
      { value: 'constipation', label: L('便秘', 'Constipation') },
      { value: 'weight_loss', label: L('体重下降', 'Weight loss') },
      { value: 'dysphagia', label: L('吞咽困难', 'Trouble swallowing') },
      { value: 'black', label: L('黑便 / 呕血', 'Black stools / vomiting blood'), danger: true },
      { value: 'none', label: L('没有以上', 'None of these') }
    ];
    const extra = [];
    if (c === 'reflux') {
      extra.push(qGroup(L('躺下或夜间会加重吗？', 'Worse lying down or at night?'), '', [
        { value: 'yes', label: L('会，躺下明显', 'Yes, clearly worse lying down') },
        { value: 'no', label: L('不会', 'No') },
        { value: 'unsure', label: L('说不清', 'Not sure') }
      ], 'night', 'single'));
    }
    if (c === 'gallbladder') {
      extra.push(qGroup(L('吃油腻后加重吗？', 'Worse after fatty food?'), '', [
        { value: 'yes', label: L('会，很明显', 'Yes, clearly') },
        { value: 'no', label: L('不会', 'No') },
        { value: 'unsure', label: L('没注意', 'Not sure') }
      ], 'fatty', 'single'));
      extra.push(qGroup(L('疼痛牵连到右肩 / 右背吗？', 'Does it spread to the right shoulder or back?'), '', [
        { value: 'yes', label: L('会', 'Yes') },
        { value: 'no', label: L('不会', 'No') },
        { value: 'unsure', label: L('说不清', 'Not sure') }
      ], 'shoulder', 'single'));
      extra.push(qGroup(L('有没有发热寒战或皮肤发黄？', 'Fever/chills or yellow skin?'), L('出现任一项，今天就去医院', 'Either means same-day care'), [
        { value: 'fever', label: L('发热 / 寒战', 'Fever / chills'), danger: true },
        { value: 'jaundice', label: L('皮肤 / 眼白发黄', 'Yellow skin / eyes'), danger: true },
        { value: 'none', label: L('都没有', 'Neither') }
      ], 'biliary', 'multi'));
    }
    if (c === 'nausea') {
      extra.push(qGroup(L('有没有脱水信号？', 'Any signs of dehydration?'), '', [
        { value: 'yes', label: L('口干、头晕、尿很少', 'Dry mouth, dizziness, very little urine'), danger: true },
        { value: 'no', label: L('没有', 'No') },
        { value: 'unsure', label: L('说不清', 'Not sure') }
      ], 'dehydration', 'single'));
      extra.push(qGroup(L('大便带血或持续高热？', 'Bloody stools or persistent high fever?'), '', [
        { value: 'blood', label: L('大便带血', 'Blood in stool'), danger: true },
        { value: 'fever', label: L('持续高热', 'Persistent high fever'), danger: true },
        { value: 'none', label: L('都没有', 'Neither') }
      ], 'infection', 'multi'));
    }
    if (c === 'dyspepsia') {
      extra.push(qGroup(L('有没有这些“报警症状”？', 'Any alarm features?'), L('有任一项，建议尽快消化内科评估', 'Any one deserves prompt Gastroenterology review'), [
        { value: 'weight_loss', label: L('体重下降', 'Weight loss'), danger: true },
        { value: 'dysphagia', label: L('吞咽困难', 'Trouble swallowing'), danger: true },
        { value: 'night_pain', label: L('夜间痛醒', 'Waking at night with pain'), danger: true },
        { value: 'none', label: L('都没有', 'None') }
      ], 'alarm', 'multi'));
    }

    return '<div class="page flow-page moderate-page">' +
      flowHead(2, 3, L('第 3 / 3 步 · 补充线索', 'Step 3 of 3 · more clues'), 'moderate-back') +
      '<header class="flow-title compact">' + kicker(L('补充线索', 'A FEW MORE CLUES')) +
        '<h1>' + L('再补充几个关键线索', 'A few more key clues') + '</h1>' +
        '<p>' + L('不用每个都填。和吃饭、时间、伴随症状有关的线索，最能帮助分流。', 'You do not need every answer. Timing, meals and associated symptoms help most with routing.') + '</p>' +
      '</header>' +
      '<div class="question-stack">' +
        qGroup(L('不舒服多久了？', 'How long has this been going on?'), '', duration, 'duration', 'single') +
        qGroup(L('和吃饭的关系', 'Relationship to meals'), '', meal, 'meal', 'single') +
        qGroup(L('同时还有哪些感觉？', 'What else are you feeling?'), L('可多选', 'Multi-select'), symptoms, 'symptoms', 'multi') +
        extra.join('') +
        '<div class="severity-block"><div class="q-head"><h3>' + L('现在有多难受？', 'How bad is it right now?') + '</h3><span>0–10</span></div><input type="range" min="0" max="10" step="1" value="' + (a.severity == null ? 5 : a.severity) + '" data-mod-range="severity" class="range"><div class="range-labels"><span>' + L('能忍', 'Mild') + '</span><strong id="mod-severity-value">' + (a.severity == null ? 5 : a.severity) + '</strong><span>' + L('难以忍受', 'Unbearable') + '</span></div></div>' +
      '</div>' +
      '<div class="flow-actions sticky-actions"><button type="button" class="btn btn-ghost" data-action="moderate-back">' + icon('back') + L('上一步', 'Back') + '</button><button type="button" class="btn btn-primary" data-action="analyze-moderate">' + L('把线索放在一起看', 'Put the clues together') + icon('arrow') + '</button></div>' +
      safetyStrip(L('填写过程中如果出现胸痛大汗、呕血黑便、晕厥或剧烈腹痛，立即停止，拨打 120。', 'If chest pain with sweating, vomiting blood or black stools, fainting, or severe pain appears while answering, stop and call 120.')) +
    '</div>';
  }

  /* =========================================================
     “缓”：全面测评
     ========================================================= */
  S.mild = function () {
    const m = WA.state.mild;
    const step = m.step || 0;
    if (step === 0) return mildIntro();
    if (step === 1) return mildSymptoms();
    if (step === 2) return mildDescribe();
    if (step === 3) return mildLifestyle();
    if (step === 4) return mildPhotos();
    return mildReview();
  };

  function mildProgress(step, total, label) {
    let segs = '';
    for (let i = 1; i <= total; i++) segs += '<span class="' + (i < step ? 'is-done' : i === step ? 'is-current' : '') + '"></span>';
    return '<div class="flow-head">' +
      '<button type="button" class="back-btn" data-action="mild-back">' + icon('back') + '<span>' + L('返回', 'Back') + '</span></button>' +
      '<div class="flow-progress"><div class="flow-segs">' + segs + '</div><span>' + label + '</span></div>' +
      '<span class="flow-time">' + icon('clock') + L('约 6–8 分钟', 'about 6–8 min') + '</span>' +
    '</div>';
  }

  function mildIntro() {
    return '<div class="page flow-page mild-page">' +
      '<div class="mild-hero">' +
        '<div class="mild-hero-copy">' + kicker(L('全面测评', 'FULL CHECK')) +
          '<h1>' + L('不着急，我们慢慢看。', 'Not urgent. Let’s look properly.') + '</h1>' +
          '<p class="mild-lead">' + L('这不是一张考试卷。5 个小段，6–8 分钟，把症状、饮食、情绪和舌象放在一起。照片可以跳过。', 'This is not an exam. Five short sections, 6–8 minutes, putting symptoms, food, mood and tongue together. Photos are optional.') + '</p>' +
          '<div class="mild-meta"><span>' + icon('clock') + L('6–8 分钟', '6–8 minutes') + '</span><span>' + icon('file') + L('5 个小段', '5 sections') + '</span><span>' + icon('camera') + L('照片可选', 'Photos optional') + '</span></div>' +
          '<button type="button" class="btn btn-primary btn-large" data-action="mild-start">' + L('开始第 1 段', 'Start section 1') + icon('arrow') + '</button>' +
        '</div>' +
        '<div class="mild-hero-visual">' + WA.mascot(170) + '<div class="mild-bubble">' + L('“不用一次说对。想到什么说什么，我会帮你归类。”', '“You do not have to get it right. Say what comes to mind; I will help sort it.”') + '</div></div>' +
      '</div>' +
      '<div class="mild-outline">' +
        '<div><span>01</span><strong>' + L('哪里、怎么不舒服', 'Where and how') + '</strong><small>' + L('部位 · 感觉 · 时间', 'Location · feeling · timing') + '</small></div>' +
        '<div><span>02</span><strong>' + L('用你的话说一遍', 'Say it in your words') + '</strong><small>' + L('文字或语音', 'Type or speak') + '</small></div>' +
        '<div><span>03</span><strong>' + L('吃、睡、情绪', 'Food, sleep, mood') + '</strong><small>' + L('饮食 · 二便 · 睡眠', 'Food · stools · sleep') + '</small></div>' +
        '<div><span>04</span><strong>' + L('舌面手诊（可选）', 'Tongue, face, hand (optional)') + '</strong><small>' + L('拍照 · 只存本机', 'Photos · local only') + '</small></div>' +
        '<div><span>05</span><strong>' + L('确认并分析', 'Review and analyse') + '</strong><small>' + L('下一步 · 4 周计划', 'Next step · 4-week plan') + '</small></div>' +
      '</div>' +
      safetyStrip(L('如果中途出现剧烈腹痛、呕血黑便、胸痛大汗或晕厥，立即停止，拨打 120。', 'If severe pain, vomiting blood or black stools, chest pain with sweating, or fainting appears, stop and call 120.')) +
      '<p class="micro-note">' + L('本测评不做胃镜、不抽血、不替代医生。结果只用于健康教育和就医方向参考。', 'This check does not replace gastroscopy, blood tests or a doctor. Results are for education and care direction only.') + '</p>' +
    '</div>';
  }

  /* 腹部分区：患者右侧 = 图像左侧。
     九宫格的每一块单独按身体轮廓裁剪，数字和文字画在裁剪之外，避免被边缘切掉。 */
  const ZONE_COLS = [[58, 106], [106, 154], [154, 202]];
  const ZONE_ROWS = [[98, 148], [148, 202], [202, 262]];
  const TORSO_PATH = 'M115 50 C104 52 92 56 82 64 C72 72 64 84 60 98 L56 120 L58 150 L64 198 L70 244 L76 280 L82 302 L178 302 L184 280 L190 244 L196 198 L202 150 L204 120 L200 98 C196 84 188 72 178 64 C168 56 156 52 145 50 Z';
  const ARM_LEFT = 'M62 100 C50 108 44 122 42 140 L40 186 C40 194 46 198 52 195 L60 191 L62 150 Z';
  const ARM_RIGHT = 'M198 100 C210 108 216 122 218 140 L220 186 C220 194 214 198 208 195 L200 191 L198 150 Z';

  const BODY_ZONES = [
    { id: 'right_upper', n: 2, col: 0, row: 0, label: { zh: '右上腹（你的右侧 · 肝、胆）', en: 'Right upper (your right · liver, gallbladder)' }, short: { zh: '右上腹', en: 'R upper' } },
    { id: 'epigastric', n: 1, col: 1, row: 0, label: { zh: '上腹正中 · 心窝（剑突下）', en: 'Upper middle · below the breastbone' }, short: { zh: '心窝', en: 'Upper mid' } },
    { id: 'left_upper', n: 3, col: 2, row: 0, label: { zh: '左上腹（你的左侧 · 胃）', en: 'Left upper (your left · stomach)' }, short: { zh: '左上腹', en: 'L upper' } },
    { id: 'right_flank', n: 4, col: 0, row: 1, label: { zh: '右侧腹（右腰侧）', en: 'Right flank' }, short: { zh: '右腰', en: 'R flank' } },
    { id: 'periumbilical', n: 5, col: 1, row: 1, label: { zh: '脐周（肚脐周围）', en: 'Around the navel' }, short: { zh: '脐周', en: 'Navel' } },
    { id: 'left_flank', n: 6, col: 2, row: 1, label: { zh: '左侧腹（左腰侧）', en: 'Left flank' }, short: { zh: '左腰', en: 'L flank' } },
    { id: 'right_lower', n: 7, col: 0, row: 2, label: { zh: '右下腹（阑尾附近）', en: 'Right lower (near the appendix)' }, short: { zh: '右下腹', en: 'R lower' } },
    { id: 'lower', n: 8, col: 1, row: 2, label: { zh: '下腹 / 小腹（耻骨上）', en: 'Lower belly (above the pubis)' }, short: { zh: '下腹', en: 'Lower' } },
    { id: 'left_lower', n: 9, col: 2, row: 2, label: { zh: '左下腹', en: 'Left lower belly' }, short: { zh: '左下腹', en: 'L lower' } }
  ];
  const DIFFUSE_LOCATION = { id: 'diffuse', n: 10, label: { zh: '整个肚子 / 说不清', en: 'Whole belly / not sure' }, short: { zh: '整个肚子', en: 'Whole belly' } };
  const BODY_LOCATIONS = BODY_ZONES.map(function (z) {
    const cx = (ZONE_COLS[z.col][0] + ZONE_COLS[z.col][1]) / 2;
    const cy = (ZONE_ROWS[z.row][0] + ZONE_ROWS[z.row][1]) / 2;
    return { id: z.id, n: z.n, cx: cx, cy: cy, label: z.label, short: z.short };
  }).concat([{ id: DIFFUSE_LOCATION.id, n: DIFFUSE_LOCATION.n, label: DIFFUSE_LOCATION.label, short: DIFFUSE_LOCATION.short }]);

  function bodyMap() {
    const selected = WA.state.mild.answers.location;
    const cells = BODY_ZONES.map(function (z) {
      const x0 = ZONE_COLS[z.col][0], x1 = ZONE_COLS[z.col][1];
      const y0 = ZONE_ROWS[z.row][0], y1 = ZONE_ROWS[z.row][1];
      return '<rect class="bz-cell" data-z="' + z.id + '" x="' + (x0 + 1.5) + '" y="' + (y0 + 1.5) + '" width="' + (x1 - x0 - 3) + '" height="' + (y1 - y0 - 3) + '" rx="8"></rect>';
    }).join('');

    const marks = BODY_ZONES.map(function (z) {
      const x0 = ZONE_COLS[z.col][0], x1 = ZONE_COLS[z.col][1];
      const y0 = ZONE_ROWS[z.row][0], y1 = ZONE_ROWS[z.row][1];
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const on = selected === z.id;
      return '<g class="bmark' + (on ? ' is-active' : '') + '" data-action="mild-loc" data-id="' + z.id + '" role="button" tabindex="0" aria-label="' + esc(tx(z.label)) + '" aria-pressed="' + on + '">' +
        '<title>' + esc(tx(z.label)) + '</title>' +
        '<rect x="' + (x0 + 1.5) + '" y="' + (y0 + 1.5) + '" width="' + (x1 - x0 - 3) + '" height="' + (y1 - y0 - 3) + '" rx="8" fill="transparent"></rect>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="11"></circle>' +
        '<text class="bz-n" x="' + cx + '" y="' + (cy + 4.2) + '">' + z.n + '</text>' +
      '</g>';
    }).join('');

    return '<div class="body-map-wrap">' +
      '<div class="body-map" role="group" aria-label="' + esc(L('点击身体部位选择最不舒服的位置', 'Tap a body area to choose where it hurts most')) + '">' +
        '<svg class="body-svg" viewBox="0 0 260 330">' +
          '<defs>' +
            '<clipPath id="torsoClip"><path d="' + TORSO_PATH + '"/></clipPath>' +
            '<linearGradient id="torsoFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FAF2E4"/><stop offset="1" stop-color="#F0E1CB"/></linearGradient>' +
          '</defs>' +
          '<ellipse cx="130" cy="26" rx="17" ry="19" fill="#F4E7D3" stroke="#2F5A4A" stroke-width="2"/>' +
          '<path d="M121 42h18v12h-18z" fill="#F4E7D3" stroke="#2F5A4A" stroke-width="2" stroke-linejoin="round"/>' +
          '<path d="' + TORSO_PATH + '" fill="url(#torsoFill)" stroke="#2F5A4A" stroke-width="2.2" stroke-linejoin="round"/>' +
          '<g clip-path="url(#torsoClip)">' +
            '<path d="M58 104c16-9 36-10 47-3v26c-14 7-32 4-47-3Z" fill="#C98A6A" opacity=".14"/>' +
            '<path d="M152 104c15-6 30-1 32 13 1 12-9 21-23 19-10-2-13-12-11-21Z" fill="#D9A05B" opacity=".17"/>' +
            cells +
          '</g>' +
          '<path d="' + TORSO_PATH + '" fill="none" stroke="#2F5A4A" stroke-width="2.2" stroke-linejoin="round"/>' +
          '<path d="M106 62c12 5 36 5 48 0" fill="none" stroke="#D8C3A8" stroke-width="1.4" stroke-linecap="round"/>' +
          marks +
          '<circle cx="130" cy="188" r="3" fill="#2F5A4A" opacity=".45"/>' +
        '</svg>' +
      '</div>' +
      '<button type="button" class="body-diffuse' + (selected === 'diffuse' ? ' is-active' : '') + '" data-action="mild-loc" data-id="diffuse" aria-pressed="' + (selected === 'diffuse') + '">' +
        '<span class="legend-num">10</span><span>' + tx(DIFFUSE_LOCATION.label) + '</span>' +
      '</button>' +
      '<div class="body-legend">' + BODY_LOCATIONS.slice(0, 9).map(function (z) {
        return '<button type="button" class="legend-row' + (selected === z.id ? ' is-active' : '') + '" data-action="mild-loc" data-id="' + z.id + '"><span class="legend-num">' + z.n + '</span><span>' + tx(z.label) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="body-hint">' + L('不确定具体位置就选“整个肚子”；医生问诊时，能指出大概位置就够用了。', 'If you are unsure, choose “whole belly”. Pointing to the general area is enough for a doctor.') + '</p>' +
    '</div>';
  }

  function chipGroup(key, options, type) {
    const a = WA.state.mild.answers;
    const value = a[key];
    return '<div class="chip-grid">' + options.map(function (o) {
      const on = type === 'multi' ? Array.isArray(value) && value.includes(o.value) : value === o.value;
      return '<button type="button" class="chip' + (on ? ' is-active' : '') + (o.danger ? ' is-danger' : '') + '" data-mild-' + (type === 'multi' ? 'multi' : 'single') + '="' + key + '" data-value="' + o.value + '">' + o.label + (o.hint ? '<small>' + o.hint + '</small>' : '') + '</button>';
    }).join('') + '</div>';
  }

  function mildSymptoms() {
    const a = WA.state.mild.answers;
    const duration = [
      { value: 'today', label: L('今天刚开始', 'Started today') },
      { value: 'days', label: L('2–3 天', '2–3 days') },
      { value: 'weeks', label: L('1–2 周', '1–2 weeks') },
      { value: 'month', label: L('1 个月以上', 'Over a month') },
      { value: 'recurrent', label: L('反复 3 个月以上', 'Recurring 3+ months') }
    ];
    return '<div class="page flow-page mild-page">' +
      mildProgress(1, 5, L('第 1 / 5 段 · 症状与部位', 'Section 1 of 5 · symptoms')) +
      '<header class="flow-title compact">' + kicker(L('部位与感觉', 'WHERE AND HOW')) +
        '<h1>' + L('哪里不舒服，是什么感觉？', 'Where does it hurt, and how?') + '</h1>' +
        '<p>' + L('最主要的感觉可以多选，再点人体图选位置。选“说不清”也可以。', 'Pick all that apply, then tap the body map. “Not sure” is a valid answer.') + '</p>' +
      '</header>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('最主要的感觉', 'Main feelings') + '</h3><span>' + L('可多选', 'Multi-select') + '</span></div>' +
        chipGroup('chief', [
          { value: 'bloating', label: L('胀满 / 撑胀', 'Bloating / fullness') },
          { value: 'pain', label: L('隐痛 / 钝痛', 'Dull ache') },
          { value: 'burning', label: L('灼痛 / 烧灼感', 'Burning') },
          { value: 'cramp', label: L('绞痛 / 阵发痛', 'Cramping') },
          { value: 'fullness', label: L('堵闷 / 早饱', 'Blocked / early fullness') },
          { value: 'nausea', label: L('恶心 / 想吐', 'Nausea') },
          { value: 'reflux', label: L('反酸 / 烧心', 'Reflux / heartburn') },
          { value: 'belch', label: L('打嗝 / 嗳气', 'Belching') },
          { value: 'shoulder', label: L('肩背放射痛', 'Pain spreading to shoulder/back') },
          { value: 'unsure', label: L('说不清 / 其他', 'Not sure / other') }
        ], 'multi') + '</div>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('最不舒服的位置', 'Where it hurts most') + '</h3><span>' + L('点图或点下面的名称', 'Tap the body or the list') + '</span></div>' + bodyMap() + '</div>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('不舒服多久了？', 'How long?') + '</h3></div>' + chipGroup('duration', duration, 'single') + '</div>' +
      '<div class="severity-block"><div class="q-head"><h3>' + L('现在有多难受？', 'How bad is it now?') + '</h3><span>0–10</span></div><input type="range" min="0" max="10" step="1" value="' + (a.severity == null ? 5 : a.severity) + '" data-mild-range="severity" class="range"><div class="range-labels"><span>' + L('能忍', 'Mild') + '</span><strong id="mild-severity-value">' + (a.severity == null ? 5 : a.severity) + '</strong><span>' + L('难以忍受', 'Unbearable') + '</span></div></div>' +
      '<div class="flow-actions sticky-actions"><button type="button" class="btn btn-ghost" data-action="mild-back">' + icon('back') + L('返回', 'Back') + '</button><button type="button" class="btn btn-primary" data-action="mild-next">' + L('下一段', 'Next') + icon('arrow') + '</button></div>' +
    '</div>';
  }

  function keywordWarning() {
    const a = WA.state.mild.answers;
    const ids = WA.analysis && WA.analysis.dangerFromText ? WA.analysis.dangerFromText(a.description) : [];
    const labels = {
      chest: L('胸闷 / 胸痛 / 大汗', 'Chest pain / tightness / sweating'),
      bleeding: L('黑便 / 呕血', 'Black stools / vomiting blood'),
      severe: L('剧烈腹痛', 'Severe pain'),
      faint: L('晕厥 / 意识模糊', 'Fainting / confusion')
    };
    const hits = ids.filter(function (id) { return labels[id]; });
    if (!hits.length) return '';
    return '<div class="inline-warning is-danger voice-warning">' + icon('alert') + '<div><strong>' + L('你提到的内容里，有需要先排危险信号的词：', 'Your words include signs that need emergency screening first:') + ' ' + hits.map(function (h) { return labels[h]; }).join('、') + '</div><button type="button" class="text-link" data-action="start-moderate">' + L('先做危险信号核对', 'Run the danger check') + icon('arrow') + '</button></div>';
  }

  function mildDescribe() {
    const a = WA.state.mild.answers;
    return '<div class="page flow-page mild-page">' +
      mildProgress(2, 5, L('第 2 / 5 段 · 用你的话说', 'Section 2 of 5 · your words')) +
      '<header class="flow-title compact">' + kicker(L('用你的话说', 'IN YOUR OWN WORDS')) +
        '<h1>' + L('用一句话，说说最困扰你的问题。', 'In one sentence, what bothers you most?') + '</h1>' +
        '<p>' + L('不用医学术语。比如“一吃完饭就胀，晚上躺下反酸”。可以直接说，也可以打字。', 'No medical terms needed. For example: “I bloat after every meal and reflux when I lie down.” Speak or type.') + '</p>' +
      '</header>' +
      '<div class="describe-box">' +
        '<textarea class="input textarea describe-input" rows="5" data-mild-input="description" maxlength="300" placeholder="' + L('例如：最近一个月饭后上腹胀，晚上躺下会反酸，压力大时更明显。', 'e.g. For the past month I feel full after meals, reflux when lying down, and it is worse under stress.') + '">' + esc(a.description || '') + '</textarea>' +
        '<div class="describe-actions">' +
          '<button type="button" class="mic-button' + (WA.dictation && WA.dictation.active ? ' is-recording' : '') + '" data-action="dictation">' + icon('mic') + '<span>' + (WA.dictation && WA.dictation.active ? L('正在听…点一下停止', 'Listening… tap to stop') : L('点一下开始说话', 'Tap to speak')) + '</span></button>' +
          '<span class="micro-note" id="dictation-status">' + (WA.dictation && WA.dictation.supported === false ? L('这个浏览器不支持语音输入，请直接打字。', 'This browser does not support voice input. Please type.') : L('语音只在本机识别，不会上传。', 'Speech is recognised on your device and not uploaded.')) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="keyword-block"><div class="q-head"><h3>' + L('我们听到的关键词', 'Keywords we heard') + '</h3><span>' + L('可点掉不准确的', 'Tap to remove wrong ones') + '</span></div>' +
        ((a.keywords || []).length ? '<div class="keyword-chips">' + a.keywords.map(function (k) {
          return '<button type="button" class="keyword-chip" data-action="remove-keyword" data-keyword="' + esc(k) + '">' + esc(k) + icon('close') + '</button>';
        }).join('') + '</div>' : '<p class="micro-note">' + L('说完或写完后，这里会出现关键词。', 'Keywords will appear here after you speak or type.') + '</p>') +
      '</div>' +
      keywordWarning() +
      '<div class="example-block"><span>' + L('不知道怎么说？试试这些', 'Not sure how to say it? Try one') + '</span><div class="example-chips">' +
        [L('一吃完饭就胀，打嗝', 'I bloat and belch after every meal'), L('晚上躺下反酸，嘴里发苦', 'I reflux and get a bitter taste lying down'), L('空腹痛，吃点东西会好一点', 'Pain when hungry, a little better after eating'), L('右上腹痛，牵连到右肩', 'Right-upper pain spreading to my right shoulder')].map(function (t) {
          return '<button type="button" class="example-chip" data-action="use-example" data-text="' + esc(t) + '">' + t + '</button>';
        }).join('') + '</div></div>' +
      '<div class="flow-actions sticky-actions"><button type="button" class="btn btn-ghost" data-action="mild-back">' + icon('back') + L('上一步', 'Back') + '</button><button type="button" class="btn btn-primary" data-action="mild-next">' + L('下一段', 'Next') + icon('arrow') + '</button></div>' +
    '</div>';
  }

  function mildLifestyle() {
    const a = WA.state.mild.answers;
    const stoolDanger = a.stool === 'black' || a.stool === 'blood';
    return '<div class="page flow-page mild-page">' +
      mildProgress(3, 5, L('第 3 / 5 段 · 吃、睡、情绪', 'Section 3 of 5 · food, sleep, mood')) +
      '<header class="flow-title compact">' + kicker(L('吃、睡、情绪', 'FOOD, BODY, MOOD')) +
        '<h1>' + L('吃、睡、情绪，都会写进胃里。', 'Food, sleep and mood all show up in the stomach.') + '</h1>' +
        '<p>' + L('中医看胃不只看胃。二便、寒热、睡眠和情绪，能帮我们判断“虚、实、寒、热”。', 'TCM looks beyond the stomach. Stools, temperature, sleep and mood help distinguish deficiency, excess, cold and heat.') + '</p>' +
      '</header>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('和吃饭的关系', 'Relationship to meals') + '</h3></div>' + chipGroup('meal', [
        { value: 'before', label: L('空腹 / 饭前更明显', 'Worse when hungry') },
        { value: 'after', label: L('饭后更明显', 'Worse after meals') },
        { value: 'night', label: L('夜间会痛醒', 'Wakes me at night') },
        { value: 'none', label: L('关系不大', 'Not related') },
        { value: 'unsure', label: L('说不清', 'Not sure') }
      ], 'single') + '</div>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('大便情况', 'Bowel movements') + '</h3><span>' + L('黑便 / 血便是危险信号', 'Black or bloody stools are danger signs') + '</span></div>' + chipGroup('stool', [
        { value: 'normal', label: L('正常成形', 'Normal') },
        { value: 'dry', label: L('偏干 / 便秘', 'Dry / constipated') },
        { value: 'loose', label: L('溏稀 / 不成形', 'Loose') },
        { value: 'sticky', label: L('黏滞 / 排不净', 'Sticky / incomplete') },
        { value: 'alternating', label: L('便秘腹泻交替', 'Alternating') },
        { value: 'black', label: L('黑便 / 柏油样便', 'Black / tarry'), danger: true },
        { value: 'blood', label: L('带血 / 带黏液', 'Blood / mucus'), danger: true }
      ], 'single') +
      (stoolDanger ? '<div class="inline-warning is-danger">' + icon('alert') + '<span>' + L('黑便或血便不能在家观察。请立即就医；若伴头晕、心慌、冷汗，拨打 120。', 'Black or bloody stools cannot be watched at home. Seek care now; call 120 if there is dizziness, palpitations or cold sweat.') + '</span><button type="button" class="text-link" data-action="start-emergency">' + L('进入急救', 'Emergency') + '</button></div>' : '') +
      '</div>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('你更怕冷还是怕热？', 'Do you feel cold or hot?') + '</h3></div>' + chipGroup('coldHeat', [
        { value: 'cold', label: L('怕冷 / 手脚凉', 'Cold / cold hands and feet') },
        { value: 'hot', label: L('怕热 / 容易上火', 'Hot / easily inflamed') },
        { value: 'mixed', label: L('忽冷忽热', 'Both / alternating') },
        { value: 'normal', label: L('都还好', 'Neither') }
      ], 'single') + '</div>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('最近睡得怎么样？', 'How is your sleep?') + '</h3></div>' + chipGroup('sleep', [
        { value: 'good', label: L('睡得好', 'Good') },
        { value: 'hard', label: L('入睡困难', 'Hard to fall asleep') },
        { value: 'dream', label: L('多梦易醒', 'Vivid dreams / waking') },
        { value: 'early', label: L('早醒', 'Early waking') },
        { value: 'sleepy', label: L('白天嗜睡', 'Sleepy by day') }
      ], 'single') + '</div>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('最近的情绪', 'Your mood lately') + '</h3><span>' + L('思虑多、悲伤也会影响脾胃', 'Overthinking and grief affect the Spleen') + '</span></div>' + chipGroup('mood', [
        { value: 'stable', label: L('比较平稳', 'Fairly steady') },
        { value: 'stress', label: L('压力大 / 紧张', 'Stressed / tense') },
        { value: 'irritable', label: L('易怒 / 烦躁', 'Irritable') },
        { value: 'low', label: L('低落 / 思虑多', 'Low / overthinking') },
        { value: 'grief', label: L('悲伤 / 失落', 'Grief / loss') }
      ], 'single') +
      '<div class="emotion-note">' + icon('leaf') + '<p>' + L('中医说“思伤脾”“肝气犯胃”。这不是说胃痛是“想出来的”，而是提醒：情绪会真实地改变胃酸、蠕动和疼痛敏感度。', 'TCM says overthinking injures the Spleen and Liver qi invades the Stomach. This does not mean the pain is “in your head”; mood really changes acid, motility and pain sensitivity.') + '</p></div></div>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('这些会让它加重吗？', 'What makes it worse?') + '</h3><span>' + L('可多选', 'Multi-select') + '</span></div>' + chipGroup('diet', [
        { value: 'spicy', label: L('辛辣', 'Spicy') },
        { value: 'cold', label: L('生冷 / 冰饮', 'Cold food / iced drinks') },
        { value: 'fatty', label: L('油腻', 'Fatty') },
        { value: 'alcohol', label: L('饮酒', 'Alcohol') },
        { value: 'coffee', label: L('咖啡 / 浓茶', 'Coffee / strong tea') },
        { value: 'overeat', label: L('暴饮暴食', 'Overeating') },
        { value: 'fasting', label: L('空腹太久', 'Long fasting') },
        { value: 'stress', label: L('压力 / 情绪', 'Stress / mood') },
        { value: 'nsaid', label: L('止痛药 / 阿司匹林', 'Painkillers / aspirin') },
        { value: 'none', label: L('无明显诱因', 'No clear trigger') }
      ], 'multi') + '</div>' +
      '<div class="flow-actions sticky-actions"><button type="button" class="btn btn-ghost" data-action="mild-back">' + icon('back') + L('上一步', 'Back') + '</button><button type="button" class="btn btn-primary" data-action="mild-next">' + L('下一段', 'Next') + icon('arrow') + '</button></div>' +
    '</div>';
  }

  WA.BODY_LOCATIONS = BODY_LOCATIONS;

  function photoExample(type) {
    if (type === 'tongue') {
      return '<svg viewBox="0 0 120 120" class="photo-demo" aria-hidden="true"><circle cx="60" cy="58" r="42" fill="#F3DDCB" stroke="#2F5A4A" stroke-width="2"/><path d="M42 58c0-12 8-20 18-20s18 8 18 20c0 16-7 30-18 38-11-8-18-22-18-38Z" fill="#D9786C"/><path d="M60 44v42" stroke="#B9534B" stroke-width="2"/><path d="M48 38c8-8 16-8 24 0" fill="none" stroke="#2F5A4A" stroke-width="2"/><circle cx="75" cy="22" r="8" fill="#E8B44A"/><path d="M75 8v-4M75 40v-4M61 22h-4M93 22h-4" stroke="#E8B44A" stroke-width="2" stroke-linecap="round"/></svg>';
    }
    if (type === 'face') {
      return '<svg viewBox="0 0 120 120" class="photo-demo" aria-hidden="true"><circle cx="60" cy="60" r="40" fill="#F3DDCB" stroke="#2F5A4A" stroke-width="2"/><circle cx="47" cy="54" r="3" fill="#2F5A4A"/><circle cx="73" cy="54" r="3" fill="#2F5A4A"/><path d="M48 74c7 6 17 6 24 0" fill="none" stroke="#2F5A4A" stroke-width="2" stroke-linecap="round"/><path d="M22 38c14-14 60-14 76 0" fill="none" stroke="#E8B44A" stroke-width="2.4" stroke-linecap="round"/><path d="M24 86c16 12 56 12 72 0" fill="none" stroke="#E8B44A" stroke-width="2.4" stroke-linecap="round"/></svg>';
    }
    return '<svg viewBox="0 0 120 120" class="photo-demo" aria-hidden="true"><path d="M39 58V34a5 5 0 0 1 10 0v22M49 52V27a5 5 0 0 1 10 0v25M59 52V31a5 5 0 0 1 10 0v23M69 55V38a5 5 0 0 1 10 0v25c0 20-10 32-28 32-12 0-20-7-25-17L18 61a5 5 0 0 1 8-6l10 10" fill="#F3DDCB" stroke="#2F5A4A" stroke-width="2" stroke-linejoin="round"/><path d="M32 72c10-4 18-4 26 0" fill="none" stroke="#D8A37E" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  WA.photoExample = photoExample;

  function mildPhotos() {
    const m = WA.state.mild;
    const photos = m.photos || {};
    const items = [
      { id: 'tongue', icon: 'tongue', title: L('舌象', 'Tongue'), rules: [L('自然光，不背光', 'Natural light, not backlit'), L('不美颜、不滤镜', 'No beauty filter'), L('舌尖自然伸出约 1/3', 'Tongue out about one-third')] },
      { id: 'face', icon: 'face', title: L('面部', 'Face'), rules: [L('素颜，光线均匀', 'No make-up, even light'), L('正面平视镜头', 'Face the camera straight on'), L('不要逆光', 'Avoid backlight')] },
      { id: 'hand', icon: 'hand', title: L('手掌 / 指甲', 'Palm / nails'), rules: [L('掌心朝上，自然张开', 'Palm up, relaxed'), L('自然光下拍', 'Natural light'), L('顺便看指甲颜色和纵纹', 'Check nail colour and ridges too')] }
    ];
    return '<div class="page flow-page mild-page">' +
      mildProgress(4, 5, L('第 4 / 5 段 · 舌面手诊', 'Section 4 of 5 · tongue, face, hand')) +
      '<header class="flow-title compact">' + kicker(L('可选 · 舌面手诊', 'OPTIONAL · TONGUE, FACE, HAND')) +
        '<h1>' + L('愿意的话，拍三张照片。', 'If you like, take three photos.') + '</h1>' +
        '<p>' + L('照片只保存在本机，供你自己对照和就诊时给医生看。我们不做 AI 舌象诊断，也不会自动给你下证型。', 'Photos stay on this device for you to compare and show a doctor. We do not auto-diagnose from your tongue or generate a pattern from images.') + '</p>' +
      '</header>' +
      '<div class="photo-grid">' + items.map(function (it) {
        const photo = photos[it.id];
        return '<div class="photo-card">' +
          '<div class="photo-card-head"><span class="photo-icon">' + icon(it.icon) + '</span><strong>' + it.title + '</strong><button type="button" class="text-link small" data-action="photo-guide" data-type="' + it.id + '">' + L('看示例', 'See example') + '</button></div>' +
          '<div class="photo-preview">' + (photo ? '<img src="' + photo.data + '" alt="' + it.title + '">' : '<div class="photo-placeholder">' + photoExample(it.id) + '</div>') + '</div>' +
          '<ul class="photo-rules">' + it.rules.map(function (r) { return '<li>' + icon('check') + r + '</li>'; }).join('') + '</ul>' +
          '<div class="photo-actions">' +
            (photo ? '<button type="button" class="mini-btn" data-action="delete-photo" data-type="' + it.id + '">' + icon('trash') + L('删除', 'Delete') + '</button>' : '') +
            '<button type="button" class="btn btn-ghost btn-small" data-action="open-camera" data-target="' + it.id + '">' + icon('camera') + (photo ? L('重拍', 'Retake') : L('拍照', 'Take photo')) + '</button>' +
            '<label class="btn btn-ghost btn-small upload-label"><input type="file" accept="image/*" data-photo-input="' + it.id + '" hidden>' + icon('image') + L('从相册', 'Gallery') + '</label>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>' +
      '<p class="micro-note camera-note">' + L('摄像头只在 localhost 或 HTTPS 页面可用；拒绝权限时可以从相册选择。', 'The camera only works on localhost or HTTPS; if permission is denied, choose from the gallery.') + '</p>' +
      '<div class="q-group"><div class="q-head"><h3>' + L('不会看？可以只记录你确定的部分', 'Not sure how to look? Record only what you know') + '</h3><span>' + L('可跳过', 'Optional') + '</span></div>' +
        '<div class="self-check-grid">' +
          '<div><label>' + L('舌质颜色', 'Tongue colour') + '</label><div class="mini-chips">' + [['normal', L('淡红', 'Pale red')], ['pale', L('淡白', 'Pale')], ['red', L('偏红', 'Red')], ['purple', L('紫暗', 'Purple')], ['unknown', L('不会看', 'Not sure')]].map(function (x) {
            return '<button type="button" class="mini-chip' + (m.answers.tongueColor === x[0] ? ' is-active' : '') + '" data-mild-single="tongueColor" data-value="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div></div>' +
          '<div><label>' + L('舌苔', 'Tongue coating') + '</label><div class="mini-chips">' + [['thin', L('薄白', 'Thin white')], ['thick', L('白厚 / 腻', 'Thick / greasy')], ['yellow', L('黄 / 黄腻', 'Yellow')], ['none', L('少苔 / 无苔', 'Little / none')], ['unknown', L('不会看', 'Not sure')]].map(function (x) {
            return '<button type="button" class="mini-chip' + (m.answers.tongueCoat === x[0] ? ' is-active' : '') + '" data-mild-single="tongueCoat" data-value="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div></div>' +
          '<div><label>' + L('舌边有齿痕？', 'Teeth marks on the tongue?') + '</label><div class="mini-chips">' + [['yes', L('有', 'Yes')], ['no', L('没有', 'No')], ['unknown', L('不会看', 'Not sure')]].map(function (x) {
            return '<button type="button" class="mini-chip' + (m.answers.teethMarks === x[0] ? ' is-active' : '') + '" data-mild-single="teethMarks" data-value="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div></div>' +
          '<div><label>' + L('指甲状态', 'Nails') + '</label><div class="mini-chips">' + [['normal', L('红润', 'Healthy')], ['pale', L('苍白', 'Pale')], ['brittle', L('脆薄易断', 'Brittle')], ['ridges', L('纵纹明显', 'Ridged')], ['purple', L('紫暗', 'Purple')], ['unknown', L('不会看', 'Not sure')]].map(function (x) {
            return '<button type="button" class="mini-chip' + (m.answers.nails === x[0] ? ' is-active' : '') + '" data-mild-single="nails" data-value="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="privacy-inline">' + icon('lock') + L('照片只存在当前页面内存中，刷新即清除；不会上传。', 'Photos live in memory on this page and are cleared on refresh. They are not uploaded.') + '</div>' +
      '<div class="flow-actions sticky-actions"><button type="button" class="btn btn-ghost" data-action="mild-back">' + icon('back') + L('上一步', 'Back') + '</button><button type="button" class="btn btn-primary" data-action="mild-next">' + L('确认并继续', 'Continue') + icon('arrow') + '</button><button type="button" class="text-link" data-action="skip-photos">' + L('跳过照片', 'Skip photos') + '</button></div>' +
    '</div>';
  }

  function mildReview() {
    const a = WA.state.mild.answers;
    const m = WA.state.mild;
    const chiefMap = { bloating: L('胀满', 'Bloating'), pain: L('隐痛', 'Dull ache'), burning: L('灼痛', 'Burning'), cramp: L('绞痛', 'Cramping'), fullness: L('早饱', 'Early fullness'), nausea: L('恶心', 'Nausea'), reflux: L('反酸', 'Reflux'), belch: L('打嗝', 'Belching'), shoulder: L('肩背放射痛', 'Shoulder/back pain'), unsure: L('说不清', 'Not sure') };
    const loc = BODY_LOCATIONS.find(function (x) { return x.id === a.location; });
    const durMap = { today: L('今天开始', 'Started today'), days: L('2–3 天', '2–3 days'), weeks: L('1–2 周', '1–2 weeks'), month: L('1 个月以上', 'Over a month'), recurrent: L('反复 3 个月以上', 'Recurring 3+ months') };
    const moodMap = { stable: L('平稳', 'Steady'), stress: L('压力大', 'Stressed'), irritable: L('易怒', 'Irritable'), low: L('低落 / 思虑多', 'Low / overthinking'), grief: L('悲伤', 'Grief') };
    const sleepMap = { good: L('睡得好', 'Good sleep'), hard: L('入睡困难', 'Hard to fall asleep'), dream: L('多梦易醒', 'Vivid dreams'), early: L('早醒', 'Early waking'), sleepy: L('白天嗜睡', 'Sleepy by day') };
    const photos = Object.keys(m.photos || {}).filter(function (k) { return m.photos[k]; });
    return '<div class="page flow-page mild-page">' +
      mildProgress(5, 5, L('第 5 / 5 段 · 确认', 'Section 5 of 5 · review')) +
      '<header class="flow-title compact">' + kicker(L('确认信息', 'REVIEW')) +
        '<h1>' + L('最后看一眼，再开始分析。', 'One last look, then analyse.') + '</h1>' +
        '<p>' + L('有不对的地方，点“修改”回去改。分析只基于你填的内容。', 'If something is wrong, tap “Edit”. The analysis uses only what you entered.') + '</p>' +
      '</header>' +
      '<div class="review-card">' +
        '<div class="review-row"><span>' + L('主要感觉', 'Main feelings') + '</span><strong>' + ((a.chief || []).map(function (x) { return chiefMap[x] || x; }).join('、') || L('未填写', 'Not set')) + '</strong><button type="button" class="text-link small" data-action="mild-goto" data-step="1">' + L('修改', 'Edit') + '</button></div>' +
        '<div class="review-row"><span>' + L('部位', 'Location') + '</span><strong>' + (loc ? tx(loc.label) : L('未填写', 'Not set')) + '</strong><button type="button" class="text-link small" data-action="mild-goto" data-step="1">' + L('修改', 'Edit') + '</button></div>' +
        '<div class="review-row"><span>' + L('时间 / 程度', 'Timing / severity') + '</span><strong>' + (durMap[a.duration] || L('未填写', 'Not set')) + ' · ' + (a.severity == null ? 5 : a.severity) + '/10</strong><button type="button" class="text-link small" data-action="mild-goto" data-step="1">' + L('修改', 'Edit') + '</button></div>' +
        '<div class="review-row"><span>' + L('你的描述', 'Your words') + '</span><strong class="review-text">' + (esc(a.description) || L('没有写，也可以。', 'You can leave this blank.')) + '</strong><button type="button" class="text-link small" data-action="mild-goto" data-step="2">' + L('修改', 'Edit') + '</button></div>' +
        '<div class="review-row"><span>' + L('情绪 / 睡眠', 'Mood / sleep') + '</span><strong>' + (moodMap[a.mood] || L('未填写', 'Not set')) + ' · ' + (sleepMap[a.sleep] || L('未填写', 'Not set')) + '</strong><button type="button" class="text-link small" data-action="mild-goto" data-step="3">' + L('修改', 'Edit') + '</button></div>' +
        '<div class="review-row"><span>' + L('照片', 'Photos') + '</span><strong>' + (photos.length ? L('已记录 ' + photos.length + ' 张（只存本机）', photos.length + ' photo(s) on this device') : L('未上传，不影响分析', 'None — does not affect the analysis')) + '</strong><button type="button" class="text-link small" data-action="mild-goto" data-step="4">' + L('修改', 'Edit') + '</button></div>' +
      '</div>' +
      '<div class="review-note">' + icon('info') + '<p>' + L('结果会给出“最值得关注的方向”，不是确诊。若你选过黑便、呕血、胸痛大汗或剧烈腹痛，系统会先中断并带你进入急救核对。', 'The result gives the most important direction to check — not a diagnosis. If you selected black stools, vomiting blood, chest pain with sweating or severe pain, the system will interrupt and route you to the danger check.') + '</p></div>' +
      '<div class="flow-actions sticky-actions"><button type="button" class="btn btn-ghost" data-action="mild-back">' + icon('back') + L('上一步', 'Back') + '</button><button type="button" class="btn btn-primary" data-action="analyze-mild">' + L('开始分析', 'Analyse my answers') + icon('arrow') + '</button></div>' +
    '</div>';
  }

  /* =========================================================
     结果
     ========================================================= */
  function hospitalLinks(key) {
    const spec = WA.HOSPITAL_SPECIALTIES[key] || WA.HOSPITAL_SPECIALTIES.gi;
    const loc = WA.state.location;
    const profileAddress = (WA.state.profile && WA.state.profile.address) || '';
    const address = loc.address || profileAddress;
    const comp = loc.components || {};
    const lat = loc.lat, lng = loc.lng;
    const city = comp.city || comp.province || WA.cityFromAddress(address);
    const district = comp.district || WA.districtFromAddress(address);
    const adcode = comp.adcode || '';
    const q = WA.lang() === 'en' ? 'hospital' : '医院';
    // 手动地址没有坐标时，用区名做关键词，至少把结果限制在所在区，而不是全市中心。
    const keyword = (!lat && district) ? (q + ' ' + district) : q;
    const params = [
      'keyword=' + encodeURIComponent(keyword),
      lat ? 'center=' + lng + ',' + lat : '',
      (adcode || city) ? 'city=' + encodeURIComponent(adcode || city) : '',
      'src=weian',
      lat ? 'view=map' : 'view=list',
      lat ? 'callnative=1' : 'callnative=0',
      'coordinate=wgs84',
      'radius=15000'
    ].filter(Boolean).join('&');
    const amap = 'https://uri.amap.com/search?' + params;
    const marker = lat
      ? 'https://uri.amap.com/marker?position=' + lng + ',' + lat + '&name=' + encodeURIComponent(L('我的位置', 'My location')) + '&coordinate=wgs84&callnative=1&src=weian'
      : '';
    const gq = lat ? ('hospital near ' + lat + ',' + lng) : ('hospital near ' + ([district, city].filter(Boolean).join(' ') || 'me'));
    const google = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(gq);
    return { spec: spec, amap: amap, marker: marker, google: google, hasLoc: !!(lat || address), hasCoords: !!lat, city: city, district: district };
  }

  function urgencyMeta(urgency) {
    if (urgency === 'red') return {
      label: L('需要立即处理', 'Needs immediate care'),
      short: L('不要继续自测', 'Stop self-checking'),
      tone: 'red',
      text: L('你的答案里有需要急诊评估的信号。先处理危险，再谈“像什么病”。', 'Your answers include signals that need emergency assessment. Deal with danger first, then discuss “what it might be”.')
    };
    if (urgency === 'amber') return {
      label: L('建议尽快就医', 'See a doctor soon'),
      short: L('今天到 3 天内', 'Today to 3 days'),
      tone: 'amber',
      text: L('目前没有必须立即拨打 120 的信号，但这一组线索值得尽快让医生看一眼。', 'There is no signal that requires 120 right now, but this set of clues deserves a doctor’s review soon.')
    };
    return {
      label: L('目前没有急症信号', 'No emergency signal found'),
      short: L('可以先观察，但要复查', 'Observe, but review'),
      tone: 'green',
      text: L('这套答案里没有出现必须急诊的信号。它不代表“没事”，只代表“现在不需要按急症处理”。', 'No must-go-to-emergency signal appeared. That does not mean “nothing is wrong” — only that this does not need emergency care right now.')
    };
  }

  function resultReasonChips(reasons) {
    if (!reasons || !reasons.length) return '';
    return '<div class="reason-chips">' + reasons.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
  }

  function planFor(result) {
    if (result.plan && result.plan.length) return result.plan;
    return [
      { week: L('第 1 周', 'Week 1'), title: L('记录，不急着改', 'Record, do not rush to change'), text: L('连续 7 天记下：吃了什么、几点吃、症状几分、当天情绪和睡眠。', 'For 7 days, note what you ate, when, symptom score, mood and sleep.') },
      { week: L('第 2 周', 'Week 2'), title: L('改一个最确定的诱因', 'Change one clear trigger'), text: L('只改一个：夜宵、空腹咖啡、睡前进食，或暴饮暴食。不要一次全改。', 'Change only one: late snacks, coffee on an empty stomach, eating before bed, or bingeing.') },
      { week: L('第 3 周', 'Week 3'), title: L('加一点“降警报”', 'Add a calming routine'), text: L('饭后慢走 10 分钟，或每天 2 分钟 4-6 呼吸。选你能坚持的。', 'Walk 10 minutes after meals, or do 2 minutes of 4-6 breathing daily. Pick what you can keep.') },
      { week: L('第 4 周', 'Week 4'), title: L('复盘，决定要不要就医', 'Review and decide'), text: L('如果症状没有变轻、影响吃饭睡觉，或出现危险信号，带着记录去消化内科。', 'If symptoms are not better, affect eating or sleep, or danger signs appear, take your log to Gastroenterology.') }
    ];
  }

  S.result = function () {
    const r = WA.state.result;
    if (!r) {
      return '<div class="page result-page">' + emptyState(L('还没有分析结果。先完成一次自测。', 'No result yet. Complete a check first.')) + '<div class="flow-actions"><button type="button" class="btn btn-primary" data-action="home">' + L('回首页', 'Back home') + '</button></div></div>';
    }
    const c = r.condition || WA.CONDITIONS[r.conditionId] || WA.CONDITIONS.functional;
    const pattern = r.pattern || WA.PATTERNS[r.patternId] || null;
    const u = urgencyMeta(r.urgency);
    const hosp = hospitalLinks(r.deptKey || (c === WA.CONDITIONS.cardiac ? 'cardiac' : 'gi'));
    const redFlags = (r.redFlags && r.redFlags.length ? r.redFlags : (c.watch || []));
    const isCardiac = r.conditionId === 'cardiac';
    const isMild = r.kind === 'mild';
    const learnIds = isMild ? ['seventy', 'reflux_sleep', 'emotion'] : ['painkillers', 'gastroscopy', 'reflux_sleep'];
    const doctorTip = r.deptKey === 'cardiac'
      ? L('挂号时优先选择：心内科（冠心病 / 胸痛方向）或胸痛中心医生。不要先挂消化科做胃镜。', 'When booking, choose Cardiology (coronary / chest pain) or a Chest Pain Centre. Do not start with Gastroenterology for a gastroscopy.')
      : r.deptKey === 'gallbladder'
        ? L('挂号时优先选择：肝胆外科（胆道疾病方向）或消化内科。需要空腹腹部超声时，按医院要求准备。', 'When booking, choose Hepatobiliary Surgery (biliary disease) or Gastroenterology. Follow fasting instructions for an abdominal ultrasound.')
        : r.deptKey === 'emergency'
          ? L('直接去有 24 小时急诊的综合医院；不要先挂普通门诊。', 'Go to a general hospital with 24-hour emergency care. Do not start at a routine outpatient clinic.')
          : L('挂号时优先选择：消化内科（胃食管反流 / 幽门螺杆菌 / 消化性溃疡方向）。如果是反复功能性不适，也可以咨询中医脾胃科或治未病科。', 'When booking, choose Gastroenterology (reflux / H. pylori / peptic ulcer). For recurring functional symptoms, a TCM digestive or preventive clinic can also help.');

    const head = '<header class="result-head">' +
      '<div>' + kicker(L('结果说明', 'YOUR RESULT')) +
        '<h1>' + L('你的下一步', 'Your next step') + '</h1>' +
        '<p class="result-meta">' + WA.formatDate(r.createdAt) + ' · ' + (isMild ? L('全面测评', 'Full check') : L('定向排查', 'Focused triage')) + ' · ' + L('结果不保存在服务器', 'Not stored on a server') + '</p>' +
      '</div>' +
      '<div class="result-actions">' +
        '<button type="button" class="btn btn-ghost btn-small bigtext-toggle' + (WA.state.settings.resultBig ? ' is-on' : '') + '" data-action="toggle-result-big" aria-pressed="' + !!WA.state.settings.resultBig + '">' + icon('file') + L('大字模式', 'Large text') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="print-result">' + icon('print') + L('打印 / 存 PDF', 'Print / PDF') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="download-result">' + icon('file') + L('下载文字版', 'Download text') + '</button>' +
      '</div>' +
    '</header>';

    const banner = '<div class="urgency-banner tone-' + u.tone + '">' +
      '<span class="ub-icon">' + icon(u.tone === 'red' ? 'siren' : u.tone === 'amber' ? 'alert' : 'check-circle') + '</span>' +
      '<div><strong>' + u.label + '</strong><p>' + u.text + '</p></div>' +
      '<span class="ub-time">' + u.short + '</span>' +
    '</div>';

    const emergencyAction = r.urgency === 'red' ? '<div class="result-emergency">' +
      '<div><strong>' + L('症状正在持续？立即拨打 120。', 'Symptoms ongoing? Call 120 now.') + '</strong><p>' + L('不要等结果、不要自己开车、不要先吃药。', 'Do not wait, drive, or self-medicate.') + '</p></div>' +
      '<a class="btn btn-danger" href="tel:120" data-action="call120">' + icon('phone') + L('拨打 120', 'Call 120') + '</a>' +
    '</div>' : '';

    const top = '<section class="result-top tone-' + u.tone + '">' +
      '<div class="rt-kicker"><span>' + L('最值得关注', 'MOST IMPORTANT TO CHECK') + '</span><span class="rt-match">' + (r.matchLabel || L('线索匹配', 'Clue match')) + '</span></div>' +
      '<div class="rt-main"><span class="rt-icon">' + icon(isCardiac ? 'heart' : 'stomach') + '</span><div><h2>' + tx(c.name) + '</h2><p>' + tx(c.short) + '</p></div></div>' +
      resultReasonChips(r.reasons) +
      '<p class="rt-why">' + tx(c.why) + '</p>' +
      '<div class="rt-foot"><div><small>' + L('优先科室', 'Priority clinic') + '</small><strong>' + tx(c.dept) + '</strong></div><div><small>' + L('建议节奏', 'Timing') + '</small><strong>' + u.short + '</strong></div><div><small>' + L('结果性质', 'What this is') + '</small><strong>' + L('分诊方向，不是确诊', 'Triage, not diagnosis') + '</strong></div></div>' +
    '</section>';

    const cardiacCallout = isCardiac ? '<div class="critical-route">' +
      '<span class="cr-icon">' + icon('heart') + '</span><div><strong>' + L('先心内科，不要先按胃病治。', 'Cardiology first — do not treat this as gastritis first.') + '</strong><p>' + L('上腹不适可能是心肌缺血的不典型表现。不要先做胃镜、不要自行吃胃药或止痛药，也不要在症状持续时自己开车。', 'Upper-belly discomfort can be an atypical heart attack. Do not start with gastroscopy, stomach medicine or painkillers, and do not drive while symptoms persist.') + '</p></div>' +
      '<a class="btn btn-danger btn-small" href="tel:120" data-action="call120">' + icon('phone') + L('拨打 120', 'Call 120') + '</a>' +
    '</div>' : '';

    const doNow = '<section class="result-card">' +
      '<div class="rc-head"><span class="rc-num">01</span><h2>' + L('现在做什么', 'What to do now') + '</h2></div>' +
      '<ul class="action-list">' + (c.doNow || []).map(function (x) { return '<li>' + icon('check') + '<span>' + tx(x) + '</span></li>'; }).join('') + '</ul>' +
      (isMild ? '<div class="result-inline-note">' + icon('info') + L('如果你还没有做过幽门螺杆菌检测，可以在消化内科一起问。不要自行购买“杀菌套餐”。', 'If you have never had an H. pylori test, ask about it at Gastroenterology. Do not buy a DIY “eradication kit”.') + '</div>' : '') +
    '</section>';

    const ask = '<section class="result-card">' +
      '<div class="rc-head"><span class="rc-num">02</span><h2>' + L('要问医生的问题', 'Questions for the doctor') + '</h2></div>' +
      '<ul class="ask-list">' + (c.ask || []).map(function (x) { return '<li><span class="q-dot">?</span><span>' + tx(x) + '</span></li>'; }).join('') + '</ul>' +
      '<button type="button" class="text-link small" data-action="copy-questions">' + icon('copy') + L('复制问题清单', 'Copy questions') + '</button>' +
    '</section>';

    const tests = '<section class="tests-row">' +
      '<div class="tests-head"><span>' + L('医生可能会讨论的检查', 'Tests your doctor may discuss') + '</span><small>' + L('不是让你自己去开单', 'Not a self-order list') + '</small></div>' +
      '<div class="test-chips">' + (c.tests || []).map(function (t) { return '<span>' + tx(t) + '</span>'; }).join('') + '</div>' +
    '</section>';

    const patternCard = pattern ? '<section class="tcm-card">' +
      '<div class="tcm-head"><span class="tcm-seal">' + L('证', 'TCM') + '</span><div><span class="tcm-kicker">' + L('中医视角 · 不是西医诊断', 'TCM VIEW · NOT A WESTERN DIAGNOSIS') + '</span><h2>' + tx(pattern.name) + '</h2></div></div>' +
      '<p class="tcm-desc">' + tx(pattern.desc) + '</p>' +
      '<div class="tcm-grid"><div><h3>' + L('这样看你的表现', 'How it fits') + '</h3><ul>' + (pattern.signs || []).map(function (x) { return '<li>' + tx(x) + '</li>'; }).join('') + '</ul></div><div><h3>' + L('调理方向', 'Care direction') + '</h3><ul>' + (pattern.advice || []).map(function (x) { return '<li>' + tx(x) + '</li>'; }).join('') + '</ul></div></div>' +
      '<p class="tcm-note">' + (r.photosCount ? L('已记录 ' + r.photosCount + ' 张舌面手诊照片，供面诊时参考；照片不参与自动诊断。', r.photosCount + ' tongue/face/hand photo(s) recorded for your appointment; photos are not auto-diagnosed. ') : '') + L('中医证型是传统理论下的归纳，不等于西医诊断。请勿根据结果自行购买中药或中成药；如要服用，需由中医师辨证处方。', 'A TCM pattern is a traditional framework, not a Western diagnosis. Do not buy herbs or patent medicine based on this result; a TCM practitioner must prescribe after assessment.') + '</p>' +
    '</section>' : '';

    const plan = isMild ? '<section class="plan-section">' + sectionHead(L('接下来 4 周', 'THE NEXT 4 WEEKS'), L('接下来 4 周，按这个节奏走', 'Your next 4 weeks'), L('不要一次改完。每周只做一件能坚持的事。', 'Do not change everything at once. One sustainable change per week.')) +
      '<div class="plan-grid">' + planFor(r).map(function (p) { return '<div class="plan-card"><span>' + p.week + '</span><strong>' + p.title + '</strong><p>' + p.text + '</p></div>'; }).join('') + '</div>' +
    '</section>' : '';

    const nearby = '<section class="nearby-card">' +
      '<div class="nearby-head"><span class="nearby-icon">' + icon('hospital') + '</span><div><h2>' + L('按定位找附近医院', 'Find nearby hospitals') + '</h2><p>' + L('优先科室：', 'Priority clinic: ') + tx(hosp.spec) + '</p></div>' +
        '<span class="nearby-loc">' + icon('pin') + (hosp.hasLoc ? L('位置已填写', 'Location set') : L('未定位', 'No location')) + '</span></div>' +
      '<p class="nearby-note">' + L('按你的位置搜索附近正规医院，不限定三甲：三甲、三乙、二级公立或半公立都可以。急症优先选有 24 小时急诊的医院；地图结果为实时搜索，不是广告推荐。', 'Search nearby accredited hospitals based on your location — not limited to top-tier. Tertiary, secondary, public or semi-public hospitals are all acceptable. For emergencies, choose one with a 24-hour emergency department. Results are live searches, not ads.') + ' ' +
        (hosp.hasCoords
          ? L('手机装了高德会打开 App，按当前坐标附近搜；高德网页版不支持坐标中心，只会按城市搜。', 'With the Amap app installed, it opens at your coordinates. Amap web ignores the coordinate centre and searches by city only.')
          : L('手动地址没有坐标：高德会按你填的区 / 市列出结果，不能精确到门牌；要精确附近请先开启定位。', 'A manual address has no coordinates: Amap lists results by your district / city, not by door number. Turn on location for a true nearby search.')) + '</p>' +
      '<div class="nearby-actions">' +
        '<a class="btn btn-dark btn-small" href="' + hosp.amap + '" target="_blank" rel="noopener">' + icon('search') + L('高德搜附近医院', 'Nearby hospitals') + '</a>' +
        (hosp.marker ? '<a class="btn btn-ghost btn-small" href="' + hosp.marker + '" target="_blank" rel="noopener">' + icon('pin') + L('在高德看我的位置', 'My location on Amap') + '</a>' : '') +
        '<a class="btn btn-ghost btn-small" href="' + hosp.google + '" target="_blank" rel="noopener">' + L('Google 搜附近医院', 'Google nearby') + '</a>' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="open-location">' + icon('locate') + L('管理定位', 'Manage location') + '</button>' +
      '</div>' +
      '<div class="doctor-tip">' + icon('user') + '<div><strong>' + L('医生 / 科室选择', 'Choosing a doctor / clinic') + '</strong><span>' + doctorTip + '</span></div></div>' +
      '<div class="hospital-tips"><div><strong>' + L('挂号时看这三点', 'Three things to check') + '</strong><span>' + L('① 有没有对应专科；② 有没有急诊；③ 能不能当天做必要检查。', '① Is there the right specialty? ② Is there emergency care? ③ Can the needed test be done today?') + '</span></div><div><strong>' + L('别只看“距离最近”', 'Not just the closest') + '</strong><span>' + L('胸痛、呕血、晕厥优先去有急救能力的医院，而不是最近的诊所。', 'For chest pain, vomiting blood or fainting, choose a hospital with emergency care, not the nearest clinic.') + '</span></div></div>' +
    '</section>';

    const learn = '<section class="learn-strip">' + sectionHead('', L('等候的时候，可以读这些', 'While you wait, read this'), '', '') +
      '<div class="learn-strip-grid">' + learnIds.map(function (id) {
        const a = WA.LEARN.find(function (x) { return x.id === id; });
        if (!a) return '';
        return '<button type="button" class="mini-article" data-action="open-article" data-id="' + a.id + '"><span>' + icon(a.icon) + '</span><div><strong>' + tx(a.title) + '</strong><small>' + a.time + ' min</small></div>' + icon('chevron') + '</button>';
      }).join('') + '</div>' +
    '</section>';

    const safety = '<section class="safety-card">' +
      '<div class="safety-head">' + icon('alert') + '<div><h2>' + L('出现这些情况，停止自测，立即就医', 'If these appear, stop self-checking and seek care now') + '</h2><p>' + L('它们比“像哪种胃病”更重要。', 'They matter more than “which stomach condition this looks like”.') + '</p></div></div>' +
      '<ul class="safety-list">' + redFlags.map(function (f) { return '<li><span>!</span>' + (typeof f === 'string' ? f : tx(f.title || f)) + '</li>'; }).join('') + '</ul>' +
    '</section>';

    const disclaimer = '<div class="result-disclaimer">' +
      '<p><strong>' + L('重要说明：', 'Important: ') + '</strong>' + L('本结果由你填写的信息按预设规则匹配生成，仅用于健康教育和就医方向参考，不构成诊断、处方或治疗建议。确诊需要医生问诊、查体，必要时进行胃镜、幽门螺杆菌检测、腹部超声、心电图或血液检查。', 'This result is generated from your answers by preset rules. It is for health education and care direction only. It is not a diagnosis, prescription or treatment plan. Diagnosis needs a doctor’s history, examination and, when needed, gastroscopy, H. pylori testing, abdominal ultrasound, ECG or blood tests.') + '</p>' +
      '<p>' + L('如果症状持续、加重，或你感到不安，请及时就医。相信身体，也相信医生的面诊。', 'If symptoms persist, worsen, or you feel uneasy, seek care. Trust your body — and a doctor who can see you.') + '</p>' +
    '</div>';

    const actions = '<div class="result-bottom-actions"><button type="button" class="btn btn-primary" data-action="home">' + L('回首页', 'Back home') + '</button><button type="button" class="btn btn-ghost" data-action="print-result">' + icon('print') + L('打印 / 存 PDF', 'Print / PDF') + '</button><button type="button" class="btn btn-ghost" data-action="restart-check">' + L('重新测一次', 'Start over') + '</button></div>';

    return '<div class="page result-page' + (WA.state.settings.resultBig ? ' is-big' : '') + '">' + head + banner + emergencyAction + top + cardiacCallout +
      '<div class="result-two-col">' + doNow + ask + '</div>' + tests + patternCard + plan + nearby + learn + safety + disclaimer + actions + '</div>';
  };
})();
