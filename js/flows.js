/* 胃安 / TummyBuddy — 交互、分诊规则与流程 */
(function () {
  'use strict';
  const WA = window.WA;
  const L = WA.L, tx = WA.tx, esc = WA.esc, icon = WA.icon;

  /* ---------- 小工具 ---------- */
  function scrollTop() { window.scrollTo({ top: 0, behavior: 'auto' }); }
  function refreshPreserveScroll() {
    const y = window.scrollY;
    WA.renderScreen();
    requestAnimationFrame(function () { window.scrollTo(0, y); });
  }
  function currentCondition() {
    const r = WA.state.result;
    if (!r) return null;
    return r.condition || WA.CONDITIONS[r.conditionId] || null;
  }
  function hasAge() {
    const p = WA.state.profile;
    return (p.age && Number(p.age) > 0) || !!p.ageRange;
  }
  function emptyMild() {
    return {
      step: 0,
      answers: {
        chief: [], location: '', duration: '', severity: 5,
        description: '', keywords: [],
        meal: '', stool: '', coldHeat: '', sleep: '', mood: '',
        diet: [], tongueColor: '', tongueCoat: '', teethMarks: '', nails: '',
        redFlags: []
      },
      photos: {}, result: null
    };
  }
  function emptyModerate() {
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

  function copyText(text, success) {
    const done = function () { WA.toast(success || L('已复制。', 'Copied.'), 'success'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    } catch (err) {
      WA.toast(L('复制失败，请手动选择文字。', 'Copy failed. Select the text manually.'), 'warn');
    }
  }

  function stopEmergencyTimer() {
    if (WA.emergencyTimer) {
      clearInterval(WA.emergencyTimer);
      WA.emergencyTimer = null;
    }
  }
  WA.stopEmergencyTimer = stopEmergencyTimer;
  WA.startEmergencyTimer = startEmergencyTimer;

  function startEmergencyTimer() {
    stopEmergencyTimer();
    const tick = function () {
      const el = document.getElementById('emergency-timer');
      if (!el) { stopEmergencyTimer(); return; }
      const start = WA.state.emergencyStart || Date.now();
      const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const m = Math.floor(s / 60);
      el.textContent = String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    };
    tick();
    WA.emergencyTimer = setInterval(tick, 1000);
  }

  function speakEmergency() {
    const p = WA.state.profile;
    const loc = WA.state.location;
    const parts = [
      L('我可能需要急救。', 'I may need emergency help.'),
      L('我的位置是：', 'My location is: ') + (WA.locationText() || L('地址未填写', 'address not set')),
      WA.regionText(loc) ? L('省市区街道：', 'Province / city / district / street: ') + WA.regionText(loc) : '',
      loc.lat ? L('坐标 ', 'Coordinates ') + WA.coordText(loc) : '',
      L('请派救护车。', 'Please send an ambulance.'),
      L('如果还能动，打开门，打开楼道灯，把钥匙留给邻居。坐下或侧卧，不要勉强平躺。', 'If you can still move, unlock the door, turn on the corridor light and leave a key with a neighbour. Sit or lie on your side; do not force yourself to lie flat.'),
      L('不要吃东西、喝水或自行吃药。不要自己开车。', 'Do not eat, drink or take medicine on your own. Do not drive yourself.'),
      L('如果我在门内无法开门，请告诉调度员联系我的紧急联系人。', 'If I cannot open the door, please ask the dispatcher to call my emergency contact.'),
      p.contactName ? L('我的紧急联系人是', 'My emergency contact is ') + p.contactName + '，' + p.contactPhone : '',
      p.allergies ? L('我对', 'I am allergic to ') + p.allergies + L('过敏。', '.') : '',
      WA.isPregnant() ? L('我怀孕了。', 'I am pregnant.') : ''
    ].filter(Boolean);
    WA.speak(parts.join(' '), { rate: 0.78 });
  }

  function speakLocation() {
    const loc = WA.state.location;
    if (!loc.lat && !loc.address) {
      WA.toast(L('还没有定位。请先开启定位或填写地址。', 'No location yet. Turn it on or enter an address.'), 'warn');
      return;
    }
    WA.speak(L('我的位置是：', 'My location is: ') + WA.locationText() + '。' +
      (WA.regionText(loc) ? L('省市区街道：', 'Province / city / district / street: ') + WA.regionText(loc) + '。' : '') +
      (loc.lat ? L('坐标 ', 'Coordinates ') + WA.coordText(loc) + '。' : '') +
      L('请派救护车。', 'Please send an ambulance.'), { rate: 0.8 });
  }

  /* ---------- 弹窗 ---------- */
  function openArticle(id) {
    const a = WA.LEARN.find(function (x) { return x.id === id; });
    if (!a) return;
    const body = '<div class="article-modal">' +
      '<div class="article-modal-meta"><span>' + icon(a.icon) + '</span><span>' + a.time + ' min</span><span>' + L('健康教育', 'Health education') + '</span></div>' +
      a.body.map(function (p) { return '<p>' + tx(p) + '</p>'; }).join('') +
      '<div class="article-source">' + icon('book') + '<span>' + tx(a.source) + '</span></div>' +
      '<div class="article-disclaimer">' + L('本文用于健康教育，不能替代医生诊断或处方。症状持续、加重或出现危险信号，请就医。', 'This article is health education, not diagnosis or prescription. If symptoms persist, worsen or danger signs appear, seek care.') + '</div>' +
    '</div>';
    WA.openModal({ title: tx(a.title), kicker: L('养胃小课', 'STOMACH SCHOOL'), body: body, wide: true, actions: [{ label: L('知道了', 'Got it'), style: 'btn-primary' }] });
  }

  function openPhotoGuide(type) {
    const data = {
      tongue: { title: L('舌象拍摄示例', 'Tongue photo example'), rules: [L('自然光下，脸和舌头都不要背光。', 'Natural light; neither face nor tongue backlit.'), L('舌尖自然伸出约 1/3，不要用力卷或咬。', 'Tongue out about one-third; do not curl or bite it.'), L('不美颜、不滤镜、不喝咖啡后立刻拍。', 'No beauty filter; avoid shooting right after coffee.')] },
      face: { title: L('面部拍摄示例', 'Face photo example'), rules: [L('素颜，正面平视镜头。', 'No make-up; face the camera straight on.'), L('光线均匀，不要只照亮半边脸。', 'Even light; do not light only one side.'), L('不背光，不站在窗户正前方。', 'No backlight; do not stand directly in front of a window.')] },
      hand: { title: L('手掌拍摄示例', 'Palm photo example'), rules: [L('掌心朝上，手指自然张开。', 'Palm up, fingers relaxed.'), L('自然光下拍，不要开美颜。', 'Natural light, no beauty filter.'), L('不要用力按压到发红。', 'Do not press until the palm turns red.')] }
    }[type] || {};
    WA.openModal({
      title: data.title || L('拍摄示例', 'Photo example'), kicker: L('PHOTO GUIDE', 'PHOTO GUIDE'), wide: true,
      body: '<div class="photo-guide">' + (WA.photoExample ? WA.photoExample(type) : '') + '<ul>' + (data.rules || []).map(function (r) { return '<li>' + icon('check') + '<span>' + r + '</span></li>'; }).join('') + '</ul><p class="micro-note">' + L('照片只存在本机，不会上传，也不会自动诊断。它只是给医生看的辅助记录。', 'Photos stay on this device, are not uploaded and are not auto-diagnosed. They are a visual note for a doctor.') + '</p></div>',
      actions: [{ label: L('知道了', 'Got it'), style: 'btn-primary' }]
    });
  }

  /* ---------- 摄像头 ---------- */
  WA.camera = { stream: null, target: null, facing: 'environment' };

  function cameraMeta(target) {
    if (target === 'tongue') return { title: L('拍摄舌象', 'Take a tongue photo'), guide: L('自然光，不背光；舌尖自然伸出约 1/3', 'Natural light, not backlit; tongue out about one-third'), frame: 'oval', facing: 'user' };
    if (target === 'face') return { title: L('拍摄面部', 'Take a face photo'), guide: L('素颜，正面平视，光线均匀', 'No make-up; face the camera; even light'), frame: 'oval', facing: 'user' };
    if (target === 'hand') return { title: L('拍摄手掌 / 指甲', 'Take a palm / nail photo'), guide: L('掌心朝上，手指自然张开，指甲也入镜', 'Palm up, fingers relaxed; include the nails'), frame: 'rect', facing: 'environment' };
    return { title: L('拍摄病历 / 报告', 'Take a record / report photo'), guide: L('让文字占满画面，避免反光和阴影', 'Fill the frame with text; avoid glare and shadow'), frame: 'doc', facing: 'environment' };
  }


  /* 取景参考线：让舌 / 面 / 手对准固定位置，拍出来可比、可复核。 */
  function cameraGuide(target) {
    if (target === 'tongue') {
      return '<div class="cam-guide" aria-hidden="true"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">' +
        '<text class="g-text" x="200" y="30">' + esc(L('舌尖自然伸出约 1/3', 'Tongue out about one-third')) + '</text>' +
        '<ellipse class="g-line" cx="200" cy="158" rx="118" ry="64"/>' +
        '<ellipse class="g-soft" cx="200" cy="158" rx="94" ry="46"/>' +
        '<path class="g-line" d="M200 132c-27 0-45 13-45 31 0 20 20 35 45 35s45-15 45-35c0-18-18-31-45-31Z"/>' +
        '<path class="g-dash" d="M200 96v18M200 200v20"/>' +
        '<path class="g-thin" d="M120 258h160"/>' +
        '<text class="g-sub" x="200" y="278">' + esc(L('自然光 · 不背光 · 不美颜', 'Natural light · no backlight · no filter')) + '</text>' +
      '</svg></div>';
    }
    if (target === 'face') {
      return '<div class="cam-guide" aria-hidden="true"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">' +
        '<text class="g-text" x="200" y="28">' + esc(L('正面平视 · 面部居中', 'Face forward · centred')) + '</text>' +
        '<ellipse class="g-line" cx="200" cy="158" rx="86" ry="112"/>' +
        '<path class="g-dash" d="M126 136h148"/>' +
        '<path class="g-thin" d="M172 138c6 5 12 5 18 0M210 138c6 5 12 5 18 0"/>' +
        '<path class="g-thin" d="M200 140v28M200 168c4 3 8 3 12 0"/>' +
        '<path class="g-dash" d="M166 208c10 12 24 18 34 18s24-6 34-18"/>' +
        '<text class="g-sub" x="200" y="292">' + esc(L('眼睛对准虚线 · 不低头 · 不仰头', 'Eyes on the dashed line · level head')) + '</text>' +
      '</svg></div>';
    }
    if (target === 'hand') {
      return '<div class="cam-guide" aria-hidden="true"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">' +
        '<text class="g-text" x="200" y="26">' + esc(L('掌心朝上 · 五指自然张开', 'Palm up · fingers relaxed')) + '</text>' +
        '<path class="g-line" d="M150 128V70a13 13 0 0 1 26 0v52M176 118V56a13 13 0 0 1 26 0v62M202 120V62a13 13 0 0 1 26 0v58M228 128V78a12 12 0 0 1 24 0v50"/>' +
        '<path class="g-line" d="M150 122c-16-8-32-6-40 6-5 8-3 18 5 24l30 22"/>' +
        '<path class="g-line" d="M146 128c8 12 18 20 30 24 22 7 46 7 70 0 12-4 20-12 22-24v-22"/>' +
        '<path class="g-line" d="M156 152c-4 20-2 40 6 58l6 22h78l6-22c8-18 10-38 6-58"/>' +
        '<path class="g-dash" d="M164 262h84"/>' +
        '<rect class="g-soft" x="159" y="66" width="17" height="12" rx="4"/>' +
        '<rect class="g-soft" x="185" y="52" width="17" height="12" rx="4"/>' +
        '<rect class="g-soft" x="211" y="58" width="17" height="12" rx="4"/>' +
        '<rect class="g-soft" x="237" y="74" width="17" height="12" rx="4"/>' +
        '<text class="g-sub" x="200" y="284">' + esc(L('虚线处露出手腕 · 指甲要入镜', 'Wrist at the dashed line · include the nails')) + '</text>' +
      '</svg></div>';
    }
    return '<div class="cam-guide" aria-hidden="true"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">' +
      '<text class="g-text" x="200" y="28">' + esc(L('让文字占满画面', 'Fill the frame with text')) + '</text>' +
      '<rect class="g-line" x="52" y="44" width="296" height="212" rx="10"/>' +
      '<path class="g-thin" d="M76 88h248M76 116h248M76 144h200M76 172h248M76 200h160"/>' +
      '<text class="g-sub" x="200" y="282">' + esc(L('避免反光、阴影和手指遮挡', 'Avoid glare, shadow and fingers')) + '</text>' +
    '</svg></div>';
  }

  function stopCameraStream() {
    if (WA.camera && WA.camera.stream) {
      try { WA.camera.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (err) { /* ignore */ }
    }
    WA.camera.stream = null;
    const video = document.getElementById('camera-video');
    if (video) {
      try { video.pause(); } catch (err) { /* ignore */ }
      video.srcObject = null;
    }
  }

  function cameraErrorText(err) {
    const name = (err && err.name) || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return L('摄像头权限被拒绝。你可以点“从相册选择”，或在浏览器设置里允许摄像头。', 'Camera permission was denied. Choose “From gallery”, or allow camera access in browser settings.');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return L('没有找到可用的摄像头。请用“从相册选择”。', 'No usable camera was found. Please use “From gallery”.');
    if (name === 'NotReadableError') return L('摄像头被其他应用占用，或系统不允许访问。请关闭其他相机应用后重试。', 'The camera is busy or blocked by the system. Close other camera apps and try again.');
    return L('无法打开摄像头。你可以用“从相册选择”继续。', 'Could not open the camera. You can continue with “From gallery”.');
  }

  function startCamera(facing) {
    const video = document.getElementById('camera-video');
    const loading = document.getElementById('camera-loading');
    const status = document.getElementById('camera-status');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (loading) loading.style.display = 'none';
      if (status) status.textContent = L('这个浏览器不支持摄像头。请用“从相册选择”。', 'This browser does not support the camera. Please use “From gallery”.');
      return;
    }
    stopCameraStream();
    WA.camera.facing = facing;
    if (video) {
      video.classList.toggle('is-mirrored', facing === 'user');
      video.classList.add('is-loading');
    }
    if (loading) loading.style.display = 'grid';
    if (status) status.textContent = L('正在打开摄像头…', 'Opening camera…');
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 960 }
      }
    }).then(function (stream) {
      WA.camera.stream = stream;
      if (video) {
        video.srcObject = stream;
        video.classList.remove('is-loading');
        const play = video.play();
        if (play && play.catch) play.catch(function () { /* autoplay hint */ });
      }
      if (loading) loading.style.display = 'none';
      if (status) status.textContent = '';
    }).catch(function (err) {
      if (loading) loading.style.display = 'none';
      if (video) video.classList.remove('is-loading');
      if (status) status.textContent = cameraErrorText(err);
    });
  }

  function openCamera(target) {
    if (target === 'record') {
      if (!WA.state.profile.recordsConsent) {
        WA.toast(L('请先勾选“我同意把照片保存在本机”，再拍照。', 'Please tick “I agree to keep the photos on this device” before taking a photo.'), 'warn', 3600);
        return;
      }
      if ((WA.state.profile.records || []).length >= 3) {
        WA.toast(L('最多保存 3 张病历照片。', 'You can keep up to 3 record photos.'), 'warn');
        return;
      }
    }
    WA.closeModal();
    const meta = cameraMeta(target);
    WA.camera.target = target;
    WA.camera.facing = meta.facing;
    const body = '<div class="camera-modal">' +
      '<div class="camera-stage">' +
        '<video id="camera-video" autoplay playsinline muted></video>' +
        '<div class="camera-overlay"><div class="camera-frame ' + meta.frame + '"></div>' +
        cameraGuide(target) +
        '<p>' + meta.guide + '</p></div>' +
        '<div class="camera-loading" id="camera-loading"><span class="camera-spinner"></span><span>' + L('正在打开摄像头…', 'Opening camera…') + '</span></div>' +
      '</div>' +
      '<div class="camera-status" id="camera-status" role="status"></div>' +
      '<div class="camera-controls">' +
        '<button type="button" class="btn btn-primary" data-action="camera-capture">' + icon('camera') + L('拍照', 'Take photo') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="camera-switch">' + icon('switch') + L('切换镜头', 'Switch camera') + '</button>' +
        '<button type="button" class="btn btn-ghost btn-small" data-action="camera-retry">' + icon('refresh') + L('重试', 'Retry') + '</button>' +
        '<label class="btn btn-ghost btn-small camera-upload"><input type="file" accept="image/*" data-camera-file hidden>' + icon('image') + L('从相册选择', 'From gallery') + '</label>' +
      '</div>' +
      '<p class="micro-note">' + L('摄像头只在 localhost 或 HTTPS 页面可用。照片只保存在本机，不会上传。', 'The camera only works on localhost or HTTPS. Photos stay on this device and are not uploaded.') + '</p>' +
    '</div>';
    WA.openModal({
      title: meta.title, kicker: L('CAMERA', 'CAMERA'), body: body, wide: true,
      dismissible: true,
      onClose: stopCameraStream,
      onMount: function () { startCamera(meta.facing); },
      actions: [{ label: L('取消', 'Cancel'), style: 'btn-ghost' }]
    });
  }

  WA.openCamera = openCamera;

  function applyCameraImage(dataUrl, target) {
    if (target === 'record') {
      if (!WA.state.profile.recordsConsent) {
        WA.toast(L('请先勾选“我同意把照片保存在本机”。', 'Please tick the consent box first.'), 'warn');
        return;
      }
      if ((WA.state.profile.records || []).length >= 3) {
        WA.toast(L('最多保存 3 张病历照片。', 'You can keep up to 3 record photos.'), 'warn');
        WA.closeModal();
        return;
      }
      WA.state.profile.records = (WA.state.profile.records || []).concat({
        id: Date.now(), name: L('病历照片', 'Record photo') + ' ' + ((WA.state.profile.records || []).length + 1), data: dataUrl, ts: Date.now()
      });
      WA.save();
      WA.closeModal();
      refreshPreserveScroll();
      WA.toast(L('病历照片已保存在本机。', 'Record photo saved on this device.'), 'success');
      return;
    }
    if (!WA.state.mild.photos) WA.state.mild.photos = {};
    WA.state.mild.photos[target] = { data: dataUrl, name: target + '-' + Date.now() + '.jpg', ts: Date.now() };
    WA.closeModal();
    refreshPreserveScroll();
    WA.toast(L('照片已保存在本机。', 'Photo saved on this device.'), 'success');
  }

  function captureCamera() {
    const target = WA.camera.target;
    const video = document.getElementById('camera-video');
    if (!WA.camera.stream || !video || !video.videoWidth || !video.videoHeight) {
      WA.toast(L('摄像头还没准备好，请等一秒再拍。', 'The camera is not ready yet. Wait a second and try again.'), 'warn');
      return;
    }
    const max = target === 'record' ? 900 : 1000;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.84);
    applyCameraImage(data, target);
  }

  function handleCameraFile(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;
    const target = WA.camera.target;
    compressImage(file, target === 'record' ? 760 : 900, 0.72).then(function (data) {
      input.value = '';
      applyCameraImage(data, target);
    }).catch(function () {
      input.value = '';
      WA.toast(L('这张图片无法读取，换一张试试。', 'Could not read this image. Try another one.'), 'error');
    });
  }

  function openLocationModal() {
    const loc = WA.state.location;
    const has = !!(loc.lat || loc.address);
    const region = WA.regionText(loc);
    const body = '<div class="loc-modal">' +
      '<div class="loc-modal-map"><span class="live-dot"></span><div><strong>' + (has ? L('实时定位已开启', 'Live location is on') : L('实时定位未开启', 'Live location is off')) + '</strong><small>' + esc(region || (loc.geocoding ? L('正在解析省 / 市 / 区 / 街道…', 'Resolving region…') : L('急救时无法自动播报位置。', 'We cannot read your location in an emergency.'))) + '</small></div></div>' +
      '<div class="loc-modal-address">' + esc(has ? WA.fullAddress(loc) || WA.locationText() : L('尚未定位', 'No location yet')) + '</div>' +
      '<div class="loc-modal-meta"><span>' + icon('locate') + WA.coordText(loc) + '</span><span>±' + (loc.accuracy ? Math.round(loc.accuracy) : '—') + ' m</span><span>' + WA.timeAgo(loc.updatedAt) + '</span></div>' +
      '<p>' + L('急救播报会包含省 / 市 / 区 / 街道。为解析行政区划，坐标会发送给 OpenStreetMap；不会发送个人资料。', 'Emergency read-out includes province / city / district / street. Coordinates are sent to OpenStreetMap to resolve the region; no personal data is sent.') + '</p>' +
      '<div class="loc-modal-actions"><button type="button" class="btn btn-primary btn-small" data-action="modal-request-location">' + icon('locate') + L('重新定位', 'Refresh location') + '</button><button type="button" class="btn btn-ghost btn-small" data-action="lookup-address">' + icon('search') + L('解析省市区', 'Resolve region') + '</button><button type="button" class="btn btn-ghost btn-small" data-action="modal-manual-location">' + L('手动填写', 'Enter manually') + '</button></div>' +
    '</div>';
    WA.openModal({ title: L('定位与急救地址', 'Location & emergency address'), kicker: L('LOCATION', 'LOCATION'), body: body, actions: [{ label: L('关闭', 'Close'), style: 'btn-ghost' }] });
  }

  function openManualRegionModal() {
    const c = WA.state.location.components || {};
    const body = '<div class="manual-region-modal">' +
      '<p class="micro-note">' + L('急救时，调度员需要听到省 / 市 / 区 / 街道。至少填写前四项。', 'In an emergency, the dispatcher needs province / city / district / street. Fill at least the first four.') + '</p>' +
      '<div class="manual-grid">' +
        '<label class="manual-field"><span>' + L('省 / 直辖市', 'Province / municipality') + '</span><input class="input" data-region-field="province" value="' + esc(c.province || '') + '" placeholder="' + L('例如：上海市', 'e.g. Shanghai') + '"></label>' +
        '<label class="manual-field"><span>' + L('市 / 地区', 'City / prefecture') + '</span><input class="input" data-region-field="city" value="' + esc(c.city || '') + '" placeholder="' + L('例如：上海市', 'e.g. Shanghai') + '"></label>' +
        '<label class="manual-field"><span>' + L('区 / 县', 'District / county') + '</span><input class="input" data-region-field="district" value="' + esc(c.district || '') + '" placeholder="' + L('例如：黄浦区', 'e.g. Huangpu District') + '"></label>' +
        '<label class="manual-field"><span>' + L('街道 / 乡镇', 'Subdistrict / town') + '</span><input class="input" data-region-field="subdistrict" value="' + esc(c.subdistrict || '') + '" placeholder="' + L('例如：南京东路街道', 'e.g. Nanjing East Road Subdistrict') + '"></label>' +
      '</div>' +
      '<label class="manual-field"><span>' + L('道路 / 门牌 / 楼栋 / 单元 / 门牌号', 'Road / building / unit / door number') + '</span><input class="input" data-region-field="road" value="' + esc([c.road, c.houseNumber].filter(Boolean).join(' ')) + '" placeholder="' + L('例如：南京东路 00 号 3 楼 302', 'e.g. 3F, No. 00 Nanjing East Road') + '"></label>' +
    '</div>';
    WA.openModal({
      title: L('手动填写省 / 市 / 区 / 街道', 'Enter region manually'), kicker: L('LOCATION', 'LOCATION'), body: body, wide: true,
      actions: [
        { label: L('取消', 'Cancel'), style: 'btn-ghost' },
        { label: L('保存', 'Save'), style: 'btn-primary', close: false, onClick: saveManualRegionFromModal }
      ]
    });
  }

  function saveManualRegionFromModal() {
    const values = {};
    document.querySelectorAll('[data-region-field]').forEach(function (el) { values[el.dataset.regionField] = (el.value || '').trim(); });
    if (!values.province || !values.city || !values.district || !values.subdistrict) {
      WA.toast(L('请至少填写省、市、区、街道。', 'Please fill in province, city, district and street.'), 'error');
      return;
    }
    WA.state.location.components = {
      province: values.province, city: values.city, district: values.district,
      subdistrict: values.subdistrict, road: values.road || '', houseNumber: '',
      postcode: '', country: '', displayName: ''
    };
    WA.state.location.region = WA.regionText(WA.state.location);
    WA.state.location.address = WA.fullAddress(WA.state.location);
    WA.state.location.source = 'manual';
    WA.state.location.status = 'ok';
    WA.state.location.updatedAt = Date.now();
    WA.state.location.lat = null;
    WA.state.location.lng = null;
    WA.state.location.accuracy = null;
    WA.state.location.geocodeError = false;
    WA.state.location.geocoding = false;
    WA.state.location.geocodeProvider = 'manual';
    WA.state.location.geocodePartial = false;
    WA.state.profile.address = WA.state.location.address;
    WA.save();
    WA.closeModal();
    if (WA.state.phase === 'setup') WA.renderAll();
    else WA.renderScreen();
    WA.toast(L('省市区街道已保存。', 'Region saved.'), 'success');
  }

  function openEmergencyCard() {
    const p = WA.state.profile;
    const comp = WA.profileCompletion();
    const medText = [WA.medLabels().join('、'), p.medsOther].filter(Boolean).join('；') || L('未填写', 'Not set');
    const body = '<div class="ec-modal">' +
      '<div class="ec-head"><span class="ec-badge">' + icon('shield') + L('急救信息卡', 'Emergency card') + '</span><span class="ec-pct">' + comp.score + '%</span></div>' +
      '<div class="ec-name">' + esc(p.name || L('未填写姓名', 'No name')) + '<span>' + WA.ageLabel() + ' · ' + WA.sexLabel() + (WA.isPregnant() ? ' · ' + WA.pregnancyLabel() : '') + '</span></div>' +
      '<div class="ec-rows">' +
        '<div><small>' + L('慢病', 'Conditions') + '</small><span>' + (WA.conditionLabels().join('、') || L('未填写', 'Not set')) + '</span></div>' +
        '<div><small>' + L('用药', 'Medicines') + '</small><span>' + esc(medText) + '</span></div>' +
        '<div><small>' + L('过敏', 'Allergies') + '</small><span>' + (p.allergies ? esc(p.allergies) : (p.noAllergies ? L('无已知过敏', 'No known allergies') : L('未填写', 'Not set'))) + '</span></div>' +
        '<div><small>' + L('紧急联系人', 'Contact') + '</small><span>' + (p.contactName ? esc(p.contactName) + ' ' + esc(p.contactPhone) : L('未填写', 'Not set')) + '</span></div>' +
        '<div><small>' + L('位置', 'Location') + '</small><span>' + esc(WA.locationText()) + '</span></div>' +
      '</div>' +
      '<div class="ec-actions"><button type="button" class="btn btn-dark btn-small" data-action="copy-info">' + icon('copy') + L('复制急救信息', 'Copy emergency info') + '</button><button type="button" class="btn btn-ghost btn-small" data-action="nav" data-nav="profile">' + L('编辑档案', 'Edit file') + '</button></div>' +
      '<p class="micro-note">' + L('网页版不能在昏迷时自动发送。请把紧急联系人设成手机锁屏急救联系人。', 'A web page cannot auto-send if you are unconscious. Set an emergency contact in your phone’s lock-screen medical ID.') + '</p>' +
    '</div>';
    WA.openModal({ title: L('急救信息卡', 'Emergency card'), kicker: L('SHOW THIS TO MEDICS', 'SHOW THIS TO MEDICS'), body: body, wide: true, actions: [{ label: L('关闭', 'Close'), style: 'btn-ghost' }] });
  }

  function openClearDataModal() {
    WA.openModal({
      title: L('清除全部资料？', 'Clear all data?'), kicker: L('THIS CANNOT BE UNDONE', 'THIS CANNOT BE UNDONE'), danger: true,
      body: '<p>' + L('档案、病历照片、定位、语言和设置都会从本机删除。这个动作不能撤销。', 'Your file, record photos, location, language and settings will be deleted from this device. This cannot be undone.') + '</p>',
      actions: [
        { label: L('取消', 'Cancel'), style: 'btn-ghost' },
        { label: L('清除', 'Clear everything'), style: 'btn-danger', onClick: function () { WA.clearAll(); } }
      ]
    });
  }

  function openSkipProfileModal() {
    WA.openModal({
      title: L('先完成急救档案', 'Finish your emergency file first'), kicker: L('ONE MORE STEP', 'ONE MORE STEP'), danger: true,
      body: '<p>' + L('这一步还没结束。现在离开，急救卡可能缺少年龄、病史、用药、过敏或联系人。至少填年龄、性别和一个紧急联系人；病历照片可以不上传。', 'This step is not finished. If you leave now, your emergency card may be missing age, history, medicines, allergies or a contact. Fill at least age, sex and one emergency contact. Record photos are optional.') + '</p>',
      actions: [
        { label: L('继续填写', 'Keep filling it in'), style: 'btn-primary' },
        { label: L('仍然跳过', 'Skip anyway'), style: 'btn-ghost', onClick: function () { WA.finishOnboarding(true); } }
      ]
    });
  }

  function showAnalyzing(callback) {
    WA.openModal({
      title: L('正在把线索放在一起看', 'Putting the clues together'),
      kicker: L('A FEW SECONDS', 'A FEW SECONDS'),
      dismissible: false,
      body: '<div class="analyzing"><div class="analyzing-orb"><span></span><i></i></div><p>' + L('不只看“哪里痛”，也看时间、吃饭、用药、情绪和危险信号。', 'Not just where it hurts — timing, meals, medicines, mood and danger signs.') + '</p><div class="analyzing-bar"><span></span></div></div>'
    });
    setTimeout(function () {
      WA.closeModal();
      if (typeof callback === 'function') callback();
    }, 1200);
  }

  /* ---------- 图片压缩 ---------- */
  function compressImage(file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      if (!file.type || file.type.indexOf('image/') !== 0) { reject(new Error('not image')); return; }
      if (file.size > 12 * 1024 * 1024) { reject(new Error('too large')); return; }
      const reader = new FileReader();
      reader.onload = function () {
        const img = new Image();
        img.onload = function () {
          let w = img.width, h = img.height;
          const scale = Math.min(1, (maxSize || 900) / Math.max(w, h));
          w = Math.round(w * scale); h = Math.round(h * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality || 0.68));
        };
        img.onerror = function () { reject(new Error('decode')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('read')); };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- 危险词 ---------- */
  const DANGER_WORDS = [
    { zh: '胸闷', en: 'Chest tightness', words: ['胸闷', '胸痛', '胸口压', '压着', 'chest pain', 'chest tight', 'pressure in chest'] },
    { zh: '大汗', en: 'Heavy sweating', words: ['大汗', '冷汗', 'sweating', 'cold sweat'] },
    { zh: '黑便', en: 'Black stools', words: ['黑便', '柏油', 'black stool', 'tarry'] },
    { zh: '呕血', en: 'Vomiting blood', words: ['呕血', '吐血', '咖啡渣', 'vomit blood', 'vomiting blood', 'coffee ground'] },
    { zh: '晕厥', en: 'Fainting', words: ['晕厥', '晕倒', '昏倒', '眼前发黑', 'faint', 'passed out'] },
    { zh: '剧烈腹痛', en: 'Severe abdominal pain', words: ['剧烈腹痛', '剧痛', '痛到直不起腰', '刀割', 'severe pain', 'unbearable'] },
    { zh: '反酸', en: 'Reflux', words: ['反酸', '烧心', 'reflux', 'heartburn'] },
    { zh: '打嗝', en: 'Belching', words: ['打嗝', '嗳气', 'belch'] },
    { zh: '饭后加重', en: 'Worse after meals', words: ['饭后', '吃完', 'after meal', 'after eating'] },
    { zh: '空腹痛', en: 'Pain when hungry', words: ['空腹', '饭前', '饿的时候', 'hungry'] },
    { zh: '夜间', en: 'At night', words: ['夜间', '晚上躺下', '半夜', 'at night', 'lying down'] },
    { zh: '右肩背', en: 'Right shoulder/back', words: ['右肩', '右背', 'right shoulder'] },
    { zh: '肩背', en: 'Shoulder/back', words: ['肩背', '后背', 'shoulder', 'back'] },
    { zh: '压力', en: 'Stress', words: ['压力', '紧张', '焦虑', 'stress', 'anxious'] }
  ];

  function extractKeywords(text) {
    const t = String(text || '').toLowerCase();
    const out = [];
    DANGER_WORDS.forEach(function (d) {
      if (d.words.some(function (w) { return t.indexOf(String(w).toLowerCase()) >= 0; })) out.push(L(d.zh, d.en));
    });
    return out.filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  function dangerFromText(text) {
    const t = String(text || '').toLowerCase();
    const hits = [];
    if (/(胸闷|胸痛|胸口压|chest pain|chest tight|pressure in chest)/.test(t)) hits.push('chest');
    if (/(黑便|柏油|black stool|tarry|呕血|吐血|咖啡渣|vomit blood|coffee ground)/.test(t)) hits.push('bleeding');
    if (/(晕厥|晕倒|昏倒|眼前发黑|faint|passed out)/.test(t)) hits.push('faint');
    if (/(剧烈腹痛|剧痛|痛到直不起腰|刀割|severe pain|unbearable)/.test(t)) hits.push('severe');
    return hits;
  }

  /* ---------- 通用急救结果 ---------- */
  function genericEmergency() {
    return {
      name: { zh: '需要急诊评估的急腹症', en: 'Acute abdomen needing emergency assessment' },
      short: { zh: '剧烈腹痛 / 晕厥 / 腹部板硬', en: 'Severe pain / fainting / rigid belly' },
      dept: { zh: '急诊', en: 'Emergency' },
      urgency: 'emergency',
      why: { zh: '突然剧烈腹痛、腹部板硬、晕厥或冷汗，可能提示穿孔、胰腺炎、出血、宫外孕等急症。不能在家观察，也不能靠止痛药掩盖。', en: 'Sudden severe pain, a rigid belly, fainting or cold sweats can signal perforation, pancreatitis, bleeding or an ectopic pregnancy. Do not watch at home or mask it with painkillers.' },
      doNow: [
        { zh: '立即拨打 120 或去最近医院急诊。不要自己开车。', en: 'Call 120 or go to the nearest emergency department now. Do not drive yourself.' },
        { zh: '停止进食进水，不要自行吃止痛药、胃药或热敷腹部。', en: 'Stop eating and drinking. Do not take painkillers, stomach medicine or apply heat.' },
        { zh: '侧卧或半坐，保持呼吸道通畅；呕吐时头偏向一侧。', en: 'Lie on your side or sit propped up. Turn your head to one side if you vomit.' },
        { zh: '带上用药清单、过敏史和既往病历。', en: 'Bring your medicine list, allergies and records.' }
      ],
      ask: [
        { zh: '需要紧急做哪些检查？', en: 'Which urgent tests do I need?' },
        { zh: '需要禁食、补液或手术吗？', en: 'Do I need fasting, fluids or surgery?' }
      ],
      tests: [
        { zh: '血常规、淀粉酶/脂肪酶', en: 'Blood count, amylase/lipase' },
        { zh: '腹部超声 / CT', en: 'Abdominal ultrasound / CT' },
        { zh: '心电图（排除心脏）', en: 'ECG to rule out a cardiac cause' }
      ],
      watch: [
        { zh: '疼痛持续加重', en: 'Pain that keeps worsening' },
        { zh: '晕厥、冷汗、呼吸急促', en: 'Fainting, cold sweats or fast breathing' },
        { zh: '呕血、黑便', en: 'Vomiting blood or black stools' }
      ]
    };
  }

  /* ---------- 结果构造 ---------- */
  const CHIEF_LABEL = {
    bloating: { zh: '胀满', en: 'Bloating' }, pain: { zh: '隐痛', en: 'Dull ache' }, burning: { zh: '灼痛', en: 'Burning' },
    cramp: { zh: '绞痛', en: 'Cramping' }, fullness: { zh: '早饱', en: 'Early fullness' }, nausea: { zh: '恶心', en: 'Nausea' },
    reflux: { zh: '反酸', en: 'Reflux' }, belch: { zh: '打嗝', en: 'Belching' }, shoulder: { zh: '肩背放射痛', en: 'Shoulder/back pain' },
    unsure: { zh: '说不清', en: 'Not sure' }
  };
  const MEAL_LABEL = {
    before: { zh: '空腹 / 饭前加重', en: 'Worse when hungry' }, after: { zh: '饭后加重', en: 'Worse after meals' },
    night: { zh: '夜间痛醒', en: 'Wakes at night' }, none: { zh: '与吃饭关系不大', en: 'Not meal-related' }, unsure: { zh: '吃饭关系说不清', en: 'Meal link unclear' }
  };
  const DUR_LABEL = {
    today: { zh: '今天开始', en: 'Started today' }, days: { zh: '2–3 天', en: '2–3 days' }, weeks: { zh: '1–2 周', en: '1–2 weeks' },
    month: { zh: '1 个月以上', en: 'Over a month' }, recurrent: { zh: '反复 3 个月以上', en: 'Recurring 3+ months' }
  };
  const MOOD_LABEL = {
    stable: { zh: '情绪平稳', en: 'Steady mood' }, stress: { zh: '压力大', en: 'Stressed' }, irritable: { zh: '易怒', en: 'Irritable' },
    low: { zh: '低落 / 思虑多', en: 'Low / overthinking' }, grief: { zh: '悲伤 / 失落', en: 'Grief' }
  };
  const SYMPTOM_LABEL = {
    reflux: { zh: '反酸 / 烧心', en: 'Reflux' }, belch: { zh: '打嗝', en: 'Belching' }, nausea: { zh: '恶心', en: 'Nausea' },
    vomit: { zh: '呕吐', en: 'Vomiting' }, bloat: { zh: '胀满 / 早饱', en: 'Fullness' }, diarrhea: { zh: '腹泻', en: 'Diarrhoea' },
    constipation: { zh: '便秘', en: 'Constipation' }, weight_loss: { zh: '体重下降', en: 'Weight loss' },
    dysphagia: { zh: '吞咽困难', en: 'Trouble swallowing' }, black: { zh: '黑便 / 呕血', en: 'Black stools / vomiting blood' },
    none: { zh: '无其他症状', en: 'No other symptoms' }
  };

  function reasonsModerate(m, c) {
    const a = m.answers;
    const out = [];
    out.push(tx(c.title));
    (a.symptoms || []).forEach(function (s) { if (s !== 'none' && SYMPTOM_LABEL[s]) out.push(tx(SYMPTOM_LABEL[s])); });
    if (a.duration && DUR_LABEL[a.duration]) out.push(tx(DUR_LABEL[a.duration]));
    if (a.meal && MEAL_LABEL[a.meal]) out.push(tx(MEAL_LABEL[a.meal]));
    if (a.fatty === 'yes') out.push(L('油腻后加重', 'Worse after fatty food'));
    if (a.shoulder === 'yes') out.push(L('向右肩背放射', 'Spreads to the right shoulder'));
    if (a.night === 'yes') out.push(L('躺下 / 夜间加重', 'Worse lying down / at night'));
    return out.filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }).slice(0, 5);
  }

  function buildModerateResult() {
    const m = WA.state.moderate;
    const a = m.answers;
    const c = WA.CLUSTERS.find(function (x) { return x.id === m.cluster; }) || WA.CLUSTERS[5];
    const flags = a.redFlags || [];
    const symptoms = a.symptoms || [];
    let id, urgency, deptKey;
    if (flags.includes('chest') || m.cluster === 'cardiac') {
      id = 'cardiac'; urgency = 'red'; deptKey = 'cardiac';
    } else if (flags.includes('bleeding') || symptoms.includes('black')) {
      id = 'gi_bleed'; urgency = 'red'; deptKey = 'emergency';
    } else if (flags.includes('pregnancy')) {
      id = 'ectopic'; urgency = 'red'; deptKey = 'emergency';
    } else if (flags.includes('severe') || flags.includes('faint')) {
      id = '_emergency'; urgency = 'red'; deptKey = 'emergency';
    } else if (m.cluster === 'gallbladder') {
      id = 'gallbladder';
      urgency = (a.biliary || []).some(function (x) { return x === 'fever' || x === 'jaundice'; }) ? 'red' : 'amber';
      deptKey = 'gallbladder';
    } else if (m.cluster === 'nausea') {
      id = 'gastroenteritis';
      urgency = (a.dehydration === 'yes' || (a.infection || []).length) ? 'amber' : 'amber';
      deptKey = 'gi';
    } else if (m.cluster === 'reflux') {
      id = 'reflux'; urgency = 'amber'; deptKey = 'gi';
    } else if (m.cluster === 'dyspepsia') {
      const alarm = (a.alarm || []).some(function (x) { return x !== 'none'; });
      id = alarm ? 'gastritis' : 'functional';
      urgency = alarm ? 'amber' : 'green';
      deptKey = 'gi';
    } else {
      id = 'gastritis'; urgency = 'amber'; deptKey = 'gi';
    }
    if ((a.severity || 5) >= 9 && urgency === 'green') urgency = 'amber';
    const condition = id === '_emergency' ? genericEmergency() : WA.CONDITIONS[id];
    return {
      kind: 'moderate', conditionId: id, condition: condition, deptKey: deptKey,
      urgency: urgency, reasons: reasonsModerate(m, c),
      redFlags: condition.watch || [],
      matchLabel: urgency === 'red' ? L('高度提示需急诊', 'High-risk pattern') : (urgency === 'amber' ? L('优先排查', 'Priority to check') : L('线索较吻合', 'Clue match')),
      createdAt: Date.now()
    };
  }

  function scoreMild() {
    const a = WA.state.mild.answers;
    const t = String(a.description || '').toLowerCase();
    const s = { reflux: 0, functional: 0, gastritis: 0, ulcer: 0, gallbladder: 0, ibs: 0, gastroenteritis: 0, cardiac: 0 };
    const chief = a.chief || [];
    if (chief.includes('reflux')) { s.reflux += 3; s.gastritis += 1; }
    if (chief.includes('burning')) { s.reflux += 2; s.gastritis += 2; }
    if (chief.includes('bloating')) { s.functional += 2; s.gastritis += 1; }
    if (chief.includes('fullness')) { s.functional += 3; }
    if (chief.includes('belch')) { s.functional += 2; s.reflux += 1; }
    if (chief.includes('pain')) { s.gastritis += 2; s.ulcer += 1; }
    if (chief.includes('cramp')) { s.gastroenteritis += 1; s.ibs += 1; }
    if (chief.includes('nausea')) { s.gastroenteritis += 2; s.gastritis += 1; }
    if (chief.includes('shoulder')) { s.gallbladder += 2; s.cardiac += 1; }
    if (a.location === 'right_upper') { s.gallbladder += 3; }
    if (a.location === 'lower') { s.ibs += 3; }
    if (a.location === 'epigastric') { s.gastritis += 1; s.reflux += 1; }
    if (a.meal === 'after') { s.functional += 2; s.reflux += 1; }
    if (a.meal === 'before' || a.meal === 'night') { s.ulcer += 3; s.reflux += 1; }
    if (a.duration === 'month' || a.duration === 'recurrent') { s.gastritis += 1; s.functional += 1; }
    if ((a.diet || []).includes('fatty')) { s.gallbladder += 2; s.reflux += 1; }
    if ((a.diet || []).includes('spicy')) { s.gastritis += 2; }
    if ((a.diet || []).includes('alcohol') || (a.diet || []).includes('coffee')) { s.reflux += 2; }
    if ((a.diet || []).includes('nsaid')) { s.gastritis += 3; s.ulcer += 2; }
    if (a.stool === 'loose') { s.ibs += 1; }
    if (a.stool === 'alternating') { s.ibs += 3; }
    if (a.mood === 'stress' || a.mood === 'irritable') { s.functional += 1; }
    if (t.indexOf('反酸') >= 0 || t.indexOf('烧心') >= 0 || t.indexOf('reflux') >= 0) s.reflux += 2;
    if (t.indexOf('右上') >= 0 || t.indexOf('右肩') >= 0) s.gallbladder += 3;
    if (t.indexOf('胸') >= 0 || t.indexOf('胸闷') >= 0 || t.indexOf('chest') >= 0) s.cardiac += 4;
    if (t.indexOf('饭后') >= 0 || t.indexOf('吃完') >= 0) s.functional += 2;
    if (t.indexOf('空') >= 0 || t.indexOf('饿') >= 0) s.ulcer += 2;
    return s;
  }

  function pickMildCondition() {
    const a = WA.state.mild.answers;
    const s = scoreMild();
    const top = Object.keys(s).sort(function (x, y) { return s[y] - s[x]; })[0];
    if (s[top] < 2) {
      return (a.chief || []).some(function (x) { return ['bloating', 'fullness', 'belch'].includes(x); }) ? 'functional' : 'gastritis';
    }
    if (top === 'cardiac' && s.cardiac < 4) return s.gallbladder >= 3 ? 'gallbladder' : 'reflux';
    return top;
  }

  function pickPattern() {
    const a = WA.state.mild.answers;
    const p = { liver_qi: 0, spleen_def: 0, damp_heat: 0, stomach_cold: 0, yin_def: 0, food_stag: 0, blood_stasis: 0 };
    if (['stress', 'irritable', 'low', 'grief'].includes(a.mood)) p.liver_qi += 3;
    if (a.mood === 'low' || a.mood === 'grief') p.spleen_def += 1;
    if (a.stool === 'loose') { p.spleen_def += 2; p.stomach_cold += 1; }
    if (a.stool === 'sticky') { p.damp_heat += 2; p.spleen_def += 1; }
    if (a.stool === 'dry') { p.yin_def += 1; }
    if (a.coldHeat === 'cold') { p.stomach_cold += 3; p.spleen_def += 1; }
    if (a.coldHeat === 'hot') { p.damp_heat += 2; p.yin_def += 1; }
    if (a.tongueColor === 'pale') { p.spleen_def += 2; p.stomach_cold += 1; }
    if (a.tongueColor === 'red') { p.damp_heat += 2; p.yin_def += 2; }
    if (a.tongueColor === 'purple') { p.blood_stasis += 3; }
    if (a.tongueCoat === 'yellow') p.damp_heat += 3;
    if (a.tongueCoat === 'thick') { p.food_stag += 2; p.damp_heat += 1; }
    if (a.tongueCoat === 'none') p.yin_def += 2;
    if (a.teethMarks === 'yes') { p.spleen_def += 3; p.stomach_cold += 1; }
    if (['pale', 'brittle'].includes(a.nails)) { p.spleen_def += 2; p.yin_def += 1; }
    if (a.nails === 'ridges') p.yin_def += 1;
    if (a.nails === 'purple') p.blood_stasis += 2;
    if ((a.diet || []).includes('cold')) { p.stomach_cold += 2; p.spleen_def += 1; }
    if ((a.diet || []).includes('spicy') || (a.diet || []).includes('fatty')) p.damp_heat += 2;
    if ((a.diet || []).includes('overeat')) p.food_stag += 3;
    if ((a.chief || []).includes('reflux') && a.tongueCoat === 'thick') p.food_stag += 1;
    if (a.sleep === 'hard' || a.sleep === 'dream') { p.liver_qi += 1; p.yin_def += 1; }
    const top = Object.keys(p).sort(function (x, y) { return p[y] - p[x]; })[0];
    return p[top] >= 2 ? top : 'balanced';
  }

  function mildRedFlags() {
    const a = WA.state.mild.answers;
    const ids = [];
    if (a.stool === 'black' || a.stool === 'blood') ids.push('bleeding');
    dangerFromText(a.description).forEach(function (id) { if (!ids.includes(id)) ids.push(id); });
    if (WA.isPregnant() && /(出血|见红|bleeding)/.test(String(a.description || ''))) ids.push('pregnancy');
    return ids;
  }

  function buildMildResult() {
    const a = WA.state.mild.answers;
    const flags = mildRedFlags();
    let id, urgency, deptKey;
    if (flags.includes('chest')) { id = 'cardiac'; urgency = 'red'; deptKey = 'cardiac'; }
    else if (flags.includes('bleeding')) { id = 'gi_bleed'; urgency = 'red'; deptKey = 'emergency'; }
    else if (flags.includes('pregnancy')) { id = 'ectopic'; urgency = 'red'; deptKey = 'emergency'; }
    else if (flags.includes('faint') || flags.includes('severe')) { id = '_emergency'; urgency = 'red'; deptKey = 'emergency'; }
    else {
      id = pickMildCondition();
      const map = { cardiac: 'red', gi_bleed: 'red', pancreatitis: 'red', ectopic: 'red', gallbladder: 'amber', ulcer: 'amber', reflux: 'amber', gastritis: 'amber', gastroenteritis: 'amber', functional: 'green', ibs: 'green' };
      urgency = map[id] || 'amber';
      deptKey = id === 'gallbladder' ? 'gallbladder' : 'gi';
      if ((a.severity || 5) >= 8 && urgency === 'green') urgency = 'amber';
      if (a.duration === 'today' && (a.severity || 5) >= 8 && urgency === 'green') urgency = 'amber';
    }
    const condition = id === '_emergency' ? genericEmergency() : WA.CONDITIONS[id];
    const reasons = [];
    (a.chief || []).forEach(function (x) { if (x !== 'unsure' && CHIEF_LABEL[x]) reasons.push(tx(CHIEF_LABEL[x])); });
    const loc = (WA.BODY_LOCATIONS || []).find(function (x) { return x.id === a.location; });
    if (loc) reasons.push(tx(loc.short));
    if (DUR_LABEL[a.duration]) reasons.push(tx(DUR_LABEL[a.duration]));
    if (MEAL_LABEL[a.meal]) reasons.push(tx(MEAL_LABEL[a.meal]));
    if (MOOD_LABEL[a.mood]) reasons.push(tx(MOOD_LABEL[a.mood]));
    return {
      kind: 'mild', conditionId: id, condition: condition, patternId: pickPattern(),
      deptKey: deptKey, urgency: urgency,
      reasons: reasons.filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }).slice(0, 6),
      redFlags: condition.watch || [],
      matchLabel: urgency === 'red' ? L('需要先排危险', 'Danger first') : (urgency === 'amber' ? L('值得优先看', 'Worth checking') : L('线索较吻合', 'Clue match')),
      createdAt: Date.now(),
      photosCount: Object.keys(WA.state.mild.photos || {}).filter(function (k) { return !!WA.state.mild.photos[k]; }).length
    };
  }

  /* ---------- 分析动作 ---------- */
  function analyzeModerate() {
    const a = WA.state.moderate.answers;
    if (!a.duration) {
      WA.toast(L('至少选一下“不舒服多久了”。', 'Please choose how long this has lasted.'), 'warn');
      const el = document.querySelector('[data-mod-single="duration"]');
      if (el) el.closest('.q-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!a.meal) {
      WA.toast(L('再选一下“和吃饭的关系”。', 'Please choose the relationship to meals.'), 'warn');
      const el = document.querySelector('[data-mod-single="meal"]');
      if (el) el.closest('.q-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const result = buildModerateResult();
    WA.state.result = result;
    showAnalyzing(function () { WA.go('result'); });
  }

  function analyzeMild() {
    const a = WA.state.mild.answers;
    a.keywords = extractKeywords(a.description);
    const result = buildMildResult();
    WA.state.result = result;
    showAnalyzing(function () { WA.go('result'); });
  }

  /* ---------- 语言/设置 ---------- */
  function requestLocationFlow() {
    const onSetup = WA.state.phase === 'setup';
    WA.state.setupManual = false;
    if (onSetup) { WA.state.location.status = 'requesting'; WA.renderAll(); }
    WA.requestLocation({
      onSuccess: function () {
        if (WA.state.phase === 'setup') { WA.renderAll(); WA.toast(L('坐标已获取，正在解析省 / 市 / 区 / 街道…', 'Coordinates found — resolving province / city / district / street…'), 'info', 3000); }
        else if (WA.state.screen === 'emergency') { WA.renderScreen(); WA.toast(L('定位已更新。', 'Location updated.'), 'success'); }
        else { WA.paintLocation(); WA.toast(L('定位已更新。', 'Location updated.'), 'success'); }
      },
      onError: function () {
        WA.state.setupManual = true;
        if (WA.state.phase === 'setup') WA.renderAll();
        WA.toast(L('定位失败。请手动填写一个能找到你的地址。', 'Location failed. Enter an address that can find you.'), 'error', 4200);
      }
    }).catch(function () { /* 已在 onError 中处理 */ });
  }

  function saveManualLocation() {
    const values = {};
    document.querySelectorAll('[data-manual-field]').forEach(function (el) {
      values[el.dataset.manualField] = (el.value || '').trim();
    });
    if (!values.province || !values.city || !values.district || !values.subdistrict) {
      WA.toast(L('请至少填写省 / 直辖市、市 / 地区、区 / 县、街道 / 乡镇。急救时，区划就是生命线。', 'Please fill in province / municipality, city / prefecture, district / county and subdistrict / town. In an emergency, this is a lifeline.'), 'error', 4600);
      const missing = document.querySelector('[data-manual-field="' + (!values.province ? 'province' : !values.city ? 'city' : !values.district ? 'district' : 'subdistrict') + '"]');
      if (missing) missing.focus();
      return;
    }
    const components = {
      province: values.province,
      city: values.city,
      district: values.district,
      subdistrict: values.subdistrict,
      road: values.road || '',
      houseNumber: '',
      postcode: '',
      country: '',
      displayName: ''
    };
    WA.state.location.components = components;
    WA.state.location.region = WA.regionText(WA.state.location);
    WA.state.location.address = WA.fullAddress(WA.state.location);
    WA.state.location.source = 'manual';
    WA.state.location.status = 'ok';
    WA.state.location.updatedAt = Date.now();
    WA.state.location.lat = null;
    WA.state.location.lng = null;
    WA.state.location.accuracy = null;
    WA.state.location.geocoding = false;
    WA.state.location.geocodeError = false;
    WA.state.location.geocodeProvider = 'manual';
    WA.state.location.geocodePartial = false;
    WA.state.profile.address = WA.state.location.address;
    WA.state.setupManual = false;
    WA.save();
    WA.renderAll();
    WA.toast(L('省市区街道已保存。', 'Province / city / district / street saved.'), 'success');
  }

  function saveProfile() {
    const p = WA.state.profile;
    const err = document.getElementById('profile-error');
    const showError = function (msg) {
      if (err) { err.textContent = msg; err.hidden = false; }
      WA.toast(msg, 'error');
      const basic = document.getElementById('profile-basic');
      if (basic) basic.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (err) { err.hidden = true; err.textContent = ''; }
    if (!hasAge()) { showError(L('年龄是必填项。记不清可以选年龄段。', 'Age is required. Choose a range if you are not sure.')); return; }
    if (!p.sex) { showError(L('生理性别是必填项，会影响孕期和部分风险判断。', 'Sex at birth is required — it affects pregnancy and risk checks.')); return; }
    if (p.sex === 'male') p.pregnant = 'na';
    if (p.sex === 'female' && !p.pregnant) p.pregnant = 'no';
    WA.save();
    if (WA.state.profileOnboarding) {
      WA.finishOnboarding(false);
    } else {
      WA.toast(L('档案已保存到本机。', 'Your file is saved on this device.'), 'success');
      refreshPreserveScroll();
    }
  }

  /* ---------- 事件 ---------- */
  function handleModalAction(index) {
    const modal = WA.modalState;
    if (!modal || !modal.actions || !modal.actions[index]) return;
    const action = modal.actions[index];
    if (action.onClick) action.onClick();
    if (action.close !== false) WA.closeModal();
  }

  function handleClick(event) {
    const modalAction = event.target.closest('[data-modal-action]');
    if (modalAction) {
      event.preventDefault();
      handleModalAction(Number(modalAction.dataset.modalAction));
      return;
    }
    const learnFilter = event.target.closest('[data-learn-filter]');
    if (learnFilter) {
      WA.learnFilter = learnFilter.dataset.learnFilter;
      WA.renderScreen();
      return;
    }
    const profileSingle = event.target.closest('[data-profile-single]');
    if (profileSingle) {
      const key = profileSingle.dataset.profileSingle;
      WA.state.profile[key] = profileSingle.dataset.value;
      if (key === 'sex' && profileSingle.dataset.value === 'male') WA.state.profile.pregnant = 'na';
      if (key === 'sex' && profileSingle.dataset.value !== 'male' && !WA.state.profile.pregnant) WA.state.profile.pregnant = 'no';
      WA.save();
      refreshPreserveScroll();
      return;
    }
    const profileRange = event.target.closest('[data-profile-range]');
    if (profileRange) {
      const r = profileRange.dataset.profileRange;
      WA.state.profile.ageRange = WA.state.profile.ageRange === r ? '' : r;
      if (WA.state.profile.ageRange) WA.state.profile.age = '';
      WA.save();
      refreshPreserveScroll();
      return;
    }
    const profileMulti = event.target.closest('[data-profile-multi]');
    if (profileMulti) {
      const key = profileMulti.dataset.profileMulti;
      const val = profileMulti.dataset.value;
      const arr = WA.state.profile[key] || [];
      if (val === 'none' || val === 'unsure') {
        WA.state.profile[key] = arr.includes(val) ? [] : [val];
      } else {
        const filtered = arr.filter(function (x) { return x !== 'none' && x !== 'unsure'; });
        WA.state.profile[key] = filtered.includes(val) ? filtered.filter(function (x) { return x !== val; }) : filtered.concat(val);
      }
      WA.save();
      refreshPreserveScroll();
      return;
    }
    const profileMed = event.target.closest('[data-profile-med]');
    if (profileMed) {
      const id = profileMed.dataset.profileMed;
      if (id === 'none') {
        WA.state.profile.medsAnswered = !WA.state.profile.medsAnswered;
        if (WA.state.profile.medsAnswered) WA.state.profile.meds = [];
      } else {
        const arr = WA.state.profile.meds || [];
        WA.state.profile.meds = arr.includes(id) ? arr.filter(function (x) { return x !== id; }) : arr.concat(id);
        WA.state.profile.medsAnswered = true;
      }
      WA.save();
      refreshPreserveScroll();
      return;
    }
    const profileToggle = event.target.closest('[data-profile-toggle]');
    if (profileToggle) {
      const key = profileToggle.dataset.profileToggle;
      WA.state.profile[key] = !WA.state.profile[key];
      if (key === 'noAllergies' && WA.state.profile[key]) {
        WA.state.profile.unsureAllergies = false;
        WA.state.profile.allergies = '';
      }
      if (key === 'unsureAllergies' && WA.state.profile[key]) {
        WA.state.profile.noAllergies = false;
        WA.state.profile.allergies = '';
      }
      WA.save();
      refreshPreserveScroll();
      return;
    }
    const mildSingle = event.target.closest('[data-mild-single]');
    if (mildSingle) {
      WA.state.mild.answers[mildSingle.dataset.mildSingle] = mildSingle.dataset.value;
      refreshPreserveScroll();
      return;
    }
    const mildMulti = event.target.closest('[data-mild-multi]');
    if (mildMulti) {
      const key = mildMulti.dataset.mildMulti;
      const val = mildMulti.dataset.value;
      const arr = WA.state.mild.answers[key] || [];
      WA.state.mild.answers[key] = arr.includes(val) ? arr.filter(function (x) { return x !== val; }) : arr.concat(val);
      refreshPreserveScroll();
      return;
    }
    const modSingle = event.target.closest('[data-mod-single]');
    if (modSingle) {
      WA.state.moderate.answers[modSingle.dataset.modSingle] = modSingle.dataset.value;
      refreshPreserveScroll();
      return;
    }
    const modMulti = event.target.closest('[data-mod-multi]');
    if (modMulti) {
      const key = modMulti.dataset.modMulti;
      const val = modMulti.dataset.value;
      const arr = WA.state.moderate.answers[key] || [];
      WA.state.moderate.answers[key] = arr.includes(val) ? arr.filter(function (x) { return x !== val; }) : arr.concat(val);
      refreshPreserveScroll();
      return;
    }

    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;
    if (action === 'overlay-backdrop' && event.target !== trigger) return;

    switch (action) {
      case 'close-modal':
        WA.closeModal();
        return;
      case 'overlay-backdrop':
        if (WA.modalState && WA.modalState.dismissible !== false) WA.closeModal();
        return;
      case 'set-lang':
        WA.setLanguage(trigger.dataset.lang);
        return;
      case 'toggle-lang':
        WA.toggleLanguage();
        return;
      case 'nav':
        navTo(trigger.dataset.nav);
        return;
      case 'triage':
        navTo('triage');
        return;
      case 'profile':
        if (WA.state.profileOnboarding) { WA.renderAll(); return; }
        WA.go('profile', { profileOnboarding: false });
        return;
      case 'learn':
        if (WA.state.profileOnboarding) { openSkipProfileModal(); return; }
        WA.go('learn');
        return;
      case 'home':
      case 'setup-home':
        if (action === 'setup-home') {
          WA.stopSpeak();
          WA.state.lang = null;
          WA.state.phase = 'language';
          WA.renderAll();
          return;
        }
        if (WA.state.profileOnboarding) { openSkipProfileModal(); return; }
        WA.go('home');
        return;
      case 'back':
        WA.back();
        return;
      case 'scroll-entries': {
        const entries = document.getElementById('entries');
        if (entries) entries.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      case 'open-camera':
        openCamera(trigger.dataset.target);
        return;
      case 'camera-capture':
        captureCamera();
        return;
      case 'camera-switch':
        startCamera(WA.camera.facing === 'user' ? 'environment' : 'user');
        return;
      case 'camera-retry':
        startCamera(WA.camera.facing);
        return;
      case 'open-location':
        openLocationModal();
        return;
      case 'modal-request-location':
        WA.closeModal();
        requestLocationFlow();
        return;
      case 'modal-manual-location':
        WA.closeModal();
        openManualRegionModal();
        return;
      case 'open-emergency-card':
        openEmergencyCard();
        return;
      case 'open-article':
        openArticle(trigger.dataset.id);
        return;
      case 'toggle-result-big': {
        WA.state.settings.resultBig = !WA.state.settings.resultBig;
        WA.save();
        WA.renderScreen();
        WA.toast(WA.state.settings.resultBig
          ? L('已切换到大字模式，正文和按钮都会放大。', 'Large-text mode is on — text and buttons are bigger.')
          : L('已恢复常规字号。', 'Back to normal text size.'), 'success', 2200);
        return;
      }
      case 'toggle-bigtext': {
        const enabling = !WA.state.settings.bigText;
        WA.state.settings.bigText = enabling;
        WA.save();
        if (WA.state.screen === 'emergency') {
          WA.renderScreen();
          if (enabling) {
            setTimeout(function () { WA.speak(L('大字急救模式。请先拨打急救电话。', 'Large-text emergency mode. Call emergency services first.'), { rate: 0.78 }); }, 180);
          } else {
            WA.stopSpeak();
          }
        } else {
          document.body.classList.toggle('big-text', enabling);
          document.querySelectorAll('.bigtext-btn').forEach(function (el) { el.classList.toggle('is-on', enabling); });
          if (WA.state.screen === 'profile') refreshPreserveScroll();
          if (!enabling) WA.stopSpeak();
        }
        WA.toast(enabling ? L('大字急救模式已开启。', 'Large-text emergency mode is on.') : L('大字模式已关闭。', 'Large text is off.'));
        return;
      }
      case 'toggle-music':
        if (WA.state.ui.music) WA.stopMusic(); else WA.startMusic();
        return;
      case 'toggle-breath':
        if (WA.breath.running) WA.stopBreathing(); else WA.startBreathing();
        return;
      case 'speak-emergency':
        speakEmergency();
        return;
      case 'speak-location':
        speakLocation();
        return;
      case 'copy-location':
        copyText(WA.locationText() + ' · ' + WA.coordText(WA.state.location), L('地址已复制。', 'Location copied.'));
        return;
      case 'copy-info':
        copyText(WA.emergencyMessage(), L('急救信息已复制。', 'Emergency info copied.'));
        return;
      case 'copy-questions': {
        const c = currentCondition();
        if (!c) return;
        copyText((c.ask || []).map(function (x) { return '· ' + tx(x); }).join('\n'), L('问题清单已复制。', 'Questions copied.'));
        return;
      }
      case 'refresh-location':
        requestLocationFlow();
        return;
      case 'lookup-address':
        WA.lookupAddress();
        return;
      case 'toggle-autosend': {
        WA.state.settings.autoSend = !WA.state.settings.autoSend;
        WA.save();
        trigger.classList.toggle('is-on', WA.state.settings.autoSend);
        WA.toast(WA.state.settings.autoSend ? L('已开启演示自动发送。网页版仍需你手动点短信。', 'Demo auto-send is on. The web version still needs you to send the SMS.') : L('已关闭自动发送。', 'Auto-send off.'));
        return;
      }
      case 'mark-pregnant':
        WA.state.profile.pregnant = 'yes';
        if (!WA.state.profile.sex || WA.state.profile.sex === 'male') WA.state.profile.sex = 'female';
        WA.save(); WA.renderScreen();
        WA.toast(L('已开启孕妇关怀。急救页会给出专门提示。', 'Pregnancy care is on. The emergency page will show specific guidance.'), 'success');
        return;
      case 'unmark-pregnant':
        WA.state.profile.pregnant = 'no';
        WA.save(); WA.renderScreen();
        return;
      case 'call120':
        WA.toast(L('正在呼叫 120。手机将直接拨号；请打开免提，把屏幕上的地址读给调度员。网页不能自动把定位传给急救中心。', 'Calling 120. Your phone will dial; use speakerphone and read the address on screen to the dispatcher. A web page cannot send your location automatically.'), 'error', 6000);
        return; // 保留 tel: 默认行为
      case 'call-contact':
        WA.toast(L('正在拨打紧急联系人。请告诉对方你的位置和现在的情况。', 'Calling your emergency contact. Tell them your location and what is happening.'), 'info', 4500);
        return; // 保留 tel: 默认行为
      case 'emergency-uncertain':
        WA.state.moderate = emptyModerate();
        WA.state.moderate.cluster = 'unsure';
        WA.state.moderate.step = 1;
        WA.go('moderate');
        return;
      case 'start-emergency':
        startEmergency();
        return;
      case 'start-moderate':
        WA.state.moderate = emptyModerate();
        WA.go('moderate');
        return;
      case 'start-mild':
        WA.state.mild = emptyMild();
        WA.state.mild.answers.chief = (WA.state.profile.symptoms || []).filter(function (x) { return x !== 'none'; });
        WA.state.result = null;
        WA.go('mild');
        return;
      case 'setup-next':
        WA.state.setupStep = 1;
        WA.save();
        WA.renderAll();
        scrollTop();
        return;
      case 'request-location':
        requestLocationFlow();
        return;
      case 'toggle-manual-location':
        WA.state.setupManual = !WA.state.setupManual;
        WA.renderAll();
        return;
      case 'save-manual-location':
        saveManualLocation();
        return;
      case 'accept-consent':
        if (!WA.state.consent) { WA.toast(L('请先勾选“我已阅读并理解”。', 'Please tick “I have read and understood”.'), 'warn'); return; }
        WA.state.phase = 'app';
        WA.state.profileOnboarding = true;
        WA.state.onboarded = false;
        WA.save();
        WA.go('profile', { profileOnboarding: true, replace: true });
        return;
      case 'choose-cluster': {
        const id = trigger.dataset.id;
        WA.state.moderate.cluster = id;
        WA.state.moderate.answers.redFlags = [];
        WA.state.moderate.step = 1;
        WA.renderScreen();
        scrollTop();
        if (id === 'cardiac') {
          WA.openModal({
            title: L('这可能是心脏问题。', 'This could be a heart problem.'),
            kicker: L('STOP AND CHECK', 'STOP AND CHECK'), danger: true,
            body: '<p>' + L('胸闷、压迫感、大汗或放射到左肩 / 下颌，不能先按胃病处理。若症状正在持续，<strong>现在拨打 120（测试）</strong>，不要自己开车，不要先做胃镜。', 'Chest pressure, sweating or pain spreading to the left shoulder or jaw cannot be treated as gastritis first. If symptoms are ongoing, <strong>call 120 (test) now</strong>. Do not drive. Do not start with gastroscopy.') + '</p><a class="btn btn-danger btn-block" href="tel:120" data-action="call120">' + icon('phone') + L('拨打 120（测试）', 'Call 120 (test)') + '</a>',
            actions: [{ label: L('症状不是心脏，继续胃部核对', 'It is not cardiac — continue the stomach check'), style: 'btn-ghost' }]
          });
        }
        return;
      }
      case 'toggle-mod-flag': {
        const id = trigger.dataset.id;
        const arr = WA.state.moderate.answers.redFlags || [];
        WA.state.moderate.answers.redFlags = arr.includes(id) ? arr.filter(function (x) { return x !== id; }) : arr.concat(id);
        WA.renderScreen();
        scrollTop();
        return;
      }
      case 'moderate-next':
        WA.state.moderate.step = 2;
        WA.renderScreen();
        scrollTop();
        return;
      case 'moderate-back':
        if (WA.state.moderate.step > 0) { WA.state.moderate.step -= 1; WA.renderScreen(); scrollTop(); }
        else WA.go('home');
        return;
      case 'analyze-moderate':
        analyzeModerate();
        return;
      case 'mild-start':
        WA.state.mild.step = 1;
        WA.renderScreen();
        scrollTop();
        return;
      case 'mild-next':
        if (!validateMildStep()) return;
        WA.state.mild.step = Math.min(5, (WA.state.mild.step || 0) + 1);
        WA.renderScreen();
        scrollTop();
        return;
      case 'mild-back':
        if (WA.state.mild.step > 0) { WA.state.mild.step -= 1; WA.renderScreen(); scrollTop(); }
        else WA.go('home');
        return;
      case 'mild-loc':
        WA.state.mild.answers.location = trigger.dataset.id;
        refreshPreserveScroll();
        return;
      case 'mild-goto':
        WA.state.mild.step = Number(trigger.dataset.step) || 1;
        WA.renderScreen();
        scrollTop();
        return;
      case 'skip-photos':
        WA.state.mild.step = 5;
        WA.renderScreen();
        scrollTop();
        return;
      case 'photo-guide':
        openPhotoGuide(trigger.dataset.type);
        return;
      case 'delete-photo':
        delete WA.state.mild.photos[trigger.dataset.type];
        refreshPreserveScroll();
        return;
      case 'dictation':
        toggleDictation();
        return;
      case 'remove-keyword': {
        const k = trigger.dataset.keyword;
        WA.state.mild.answers.keywords = (WA.state.mild.answers.keywords || []).filter(function (x) { return x !== k; });
        refreshPreserveScroll();
        return;
      }
      case 'use-example': {
        const text = trigger.dataset.text || '';
        const a = WA.state.mild.answers;
        a.description = a.description ? a.description + '；' + text : text;
        a.keywords = extractKeywords(a.description);
        refreshPreserveScroll();
        return;
      }
      case 'analyze-mild':
        analyzeMild();
        return;
      case 'use-location-address': {
        const loc = WA.state.location;
        if (!WA.regionText(loc) && !loc.address) { WA.toast(L('还没有解析出省 / 市 / 区 / 街道。请先定位或手动填写区划。', 'Province / city / district / street is not resolved yet. Locate first or enter the region manually.'), 'warn'); return; }
        WA.state.profile.address = WA.locationText();
        WA.save();
        refreshPreserveScroll();
        WA.toast(L('已把当前定位地址填入档案。', 'Current location address filled in.'), 'success');
        return;
      }
      case 'save-profile':
        saveProfile();
        return;
      case 'skip-profile':
        openSkipProfileModal();
        return;
      case 'delete-record':
        WA.state.profile.records.splice(Number(trigger.dataset.index), 1);
        WA.save();
        refreshPreserveScroll();
        return;
      case 'demo-ocr':
        openOcrDemo();
        return;
      case 'ocr-extract':
        runOcrDemo();
        return;
      case 'ocr-apply':
        applyOcrDemo();
        return;
      case 'clear-data':
        openClearDataModal();
        return;
      case 'print-result':
        window.print();
        return;
      case 'download-result':
        downloadResult();
        return;
      case 'restart-check':
        WA.state.mild = emptyMild();
        WA.state.moderate = emptyModerate();
        WA.state.result = null;
        WA.go('home');
        return;
      default:
        return;
    }
  }

  function navTo(id) {
    if (WA.state.profileOnboarding && id !== 'profile') { openSkipProfileModal(); return; }
    if (id === 'profile') {
      if (WA.state.profileOnboarding) { WA.renderAll(); return; }
      WA.go('profile', { profileOnboarding: false });
    }
    else if (id === 'learn') WA.go('learn');
    else if (id === 'about') WA.go('about');
    else if (id === 'triage') {
      WA.go('home');
      setTimeout(function () { const el = document.getElementById('entries'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    } else WA.go('home');
  }

  function validateMildStep() {
    const s = WA.state.mild.step;
    const a = WA.state.mild.answers;
    if (s === 1) {
      if (!(a.chief || []).length) { WA.toast(L('至少选一个最主要的感觉。', 'Choose at least one main feeling.'), 'warn'); return false; }
      if (!a.location) { WA.toast(L('点一下人体图，选最不舒服的位置。', 'Tap the body map to choose where it hurts most.'), 'warn'); return false; }
      if (!a.duration) { WA.toast(L('选一下不舒服多久了。', 'Choose how long this has lasted.'), 'warn'); return false; }
    }
    if (s === 2) {
      a.keywords = extractKeywords(a.description);
      if (!a.description.trim() && !(a.keywords || []).length) {
        WA.toast(L('可以写一句，或点下面的示例。实在不想写，也可以直接继续。', 'You can write one line or tap an example — or continue without it.'), 'info');
      }
    }
    if (s === 3) {
      if (a.stool === 'black' || a.stool === 'blood') {
        WA.toast(L('黑便或血便是危险信号。请先进入急救核对。', 'Black or bloody stools are danger signs. Run the emergency check first.'), 'error', 4200);
        return false;
      }
    }
    return true;
  }

  function startEmergency() {
    WA.state.emergencyStart = Date.now();
    WA.go('emergency');
    startEmergencyTimer();
    const loc = WA.state.location;
    if ((!loc.lat && !loc.address) || (loc.lat && (!loc.updatedAt || Date.now() - loc.updatedAt > 120000))) requestLocationFlow();
    WA.watchLocation();
    WA.save();
  }

  /* ---------- 语音输入 ---------- */
  WA.dictation = { active: false, supported: null, recognition: null };

  function toggleDictation() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      WA.dictation.supported = false;
      WA.toast(L('这个浏览器不支持语音输入。请直接打字。', 'This browser does not support voice input. Please type.'), 'warn');
      const status = document.getElementById('dictation-status');
      if (status) status.textContent = L('这个浏览器不支持语音输入，请直接打字。', 'This browser does not support voice input. Please type.');
      return;
    }
    if (WA.dictation.active && WA.dictation.recognition) {
      try { WA.dictation.recognition.stop(); } catch (err) { /* ignore */ }
      return;
    }
    if (!navigator.onLine) {
      // Web Speech may still work with on-device support; do not block.
    }
    const rec = new SR();
    rec.lang = WA.lang() === 'en' ? 'en-US' : 'zh-CN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    WA.dictation.recognition = rec;
    WA.dictation.active = true;
    WA.dictation.supported = true;
    const status = document.getElementById('dictation-status');
    if (status) status.textContent = L('正在听…说完会自动停。', 'Listening… it stops automatically.');
    const btn = document.querySelector('[data-action="dictation"]');
    if (btn) { btn.classList.add('is-recording'); const span = btn.querySelector('span'); if (span) span.textContent = L('正在听…点一下停止', 'Listening… tap to stop'); }
    // 只在开始录音时取一次底稿：后面所有中间结果都从这份底稿重算，
    // 不再把上一轮的文本反复拼进去（这就是之前“说一句、重复一屏”的原因）。
    const taAtStart = document.querySelector('[data-mild-input="description"]');
    const baseText = ((taAtStart && taAtStart.value) || WA.state.mild.answers.description || '').trim();
    let finalText = '';
    let lastInterim = '';
    rec.onresult = function (event) {
      let interim = '';
      let fresh = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) { finalText += transcript; fresh = true; }
        else interim += transcript;
      }
      lastInterim = interim;
      const ta = document.querySelector('[data-mild-input="description"]');
      if (ta) {
        const merged = (baseText ? baseText + ' ' : '') + finalText + interim;
        ta.value = merged.replace(/\s+/g, ' ').trim();
      }
      const status = document.getElementById('dictation-status');
      if (status) status.textContent = L('正在听…', 'Listening…') + (finalText ? L('已识别：', 'Heard: ') + finalText.trim() : '');
    };
    rec.onerror = function (e) {
      WA.dictation.active = false;
      WA.toast(L('语音识别没有成功：', 'Voice recognition failed: ') + (e.error || ''), 'warn');
      WA.renderScreen();
    };
    rec.onend = function () {
      WA.dictation.active = false;
      const a = WA.state.mild.answers;
      const said = (baseText ? baseText + ' ' : '') + finalText;
      a.description = said.replace(/\s+/g, ' ').trim();
      a.keywords = extractKeywords(a.description);
      WA.renderScreen();
      if (a.description) {
        WA.toast(L('已写入你的描述，可以继续改。', 'Added to your description — you can edit it.'), 'success', 2600);
      } else if (lastInterim) {
        WA.toast(L('没有听清，再试一次或直接打字。', 'Did not catch that. Try again or type.'), 'warn');
      }
    };
    try { rec.start(); } catch (err) {
      WA.dictation.active = false;
      WA.toast(L('无法启动语音输入，请直接打字。', 'Could not start voice input. Please type.'), 'warn');
    }
  }

  /* ---------- 文件上传 ---------- */
  function handlePhotoInput(event) {
    const input = event.target;
    const type = input.dataset.photoInput;
    const file = input.files && input.files[0];
    if (!file || !type) return;
    compressImage(file, 900, 0.72).then(function (data) {
      WA.state.mild.photos[type] = { data: data, name: file.name, ts: Date.now() };
      input.value = '';
      refreshPreserveScroll();
      WA.toast(L('照片已保存在本机。', 'Photo saved on this device.'), 'success');
    }).catch(function () {
      WA.toast(L('这张图片无法读取，换一张试试。', 'Could not read this image. Try another one.'), 'error');
    });
  }

  function handleRecordInput(event) {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;
    if (!WA.state.profile.recordsConsent) {
      WA.toast(L('请先勾选“我同意把照片保存在本机”，再上传病历照片。', 'Please tick “I agree to keep the photos on this device” before uploading.'), 'warn', 3600);
      input.value = '';
      return;
    }
    if ((WA.state.profile.records || []).length >= 3) {
      WA.toast(L('最多保存 3 张病历照片。', 'You can keep up to 3 record photos.'), 'warn');
      input.value = '';
      return;
    }
    compressImage(file, 760, 0.62).then(function (data) {
      WA.state.profile.records = (WA.state.profile.records || []).concat({ id: Date.now(), name: file.name || L('病历照片', 'Record photo'), data: data, ts: Date.now() });
      input.value = '';
      WA.save();
      refreshPreserveScroll();
      WA.toast(L('照片已保存在本机。上传病历是自愿的，可随时删除。', 'Photo saved on this device. Uploading is optional and you can delete it anytime.'), 'success');
    }).catch(function () {
      WA.toast(L('图片读取失败，或文件太大。换一张试试。', 'Could not read the image, or it is too large. Try another.'), 'error');
    });
  }

  function openOcrDemo() {
    const body = '<div class="ocr-demo">' +
      '<div class="ocr-paper">' +
        '<div class="ocr-paper-head"><strong>' + L('示例：门诊病历 / 检查报告', 'Sample: clinic note / report') + '</strong><span>' + L('演示数据', 'DEMO DATA') + '</span></div>' +
        '<div class="ocr-line"><span>' + L('主诉', 'Complaint') + '</span><strong>' + L('反复上腹胀痛 3 个月，饭后明显', 'Recurrent upper fullness 3 months, worse after meals') + '</strong></div>' +
        '<div class="ocr-line"><span>' + L('诊断', 'Diagnosis') + '</span><strong>' + L('慢性胃炎；幽门螺杆菌阳性', 'Chronic gastritis; H. pylori positive') + '</strong></div>' +
        '<div class="ocr-line"><span>' + L('用药', 'Medicines') + '</span><strong>' + L('奥美拉唑 20 mg 每日一次；阿司匹林 100 mg', 'Omeprazole 20 mg daily; aspirin 100 mg') + '</strong></div>' +
        '<div class="ocr-stamp">' + L('示例', 'SAMPLE') + '</div>' +
      '</div>' +
      '<p class="micro-note">' + L('这是演示。真实照片不会上传，也不会被自动识别或诊断。正式版接入 OCR 后，必须由你确认才能写入档案。', 'This is a demo. Real photos are not uploaded or auto-read. In a production OCR version, nothing is written without your confirmation.') + '</p>' +
      '<div id="ocr-result"></div>' +
      '<div class="ocr-actions"><button type="button" class="btn btn-primary btn-small" data-action="ocr-extract">' + icon('search') + L('识别这张示例', 'Read this sample') + '</button></div>' +
    '</div>';
    WA.openModal({ title: L('智能识图填表（演示）', 'Smart form filling (demo)'), kicker: L('OCR DEMO', 'OCR DEMO'), body: body, wide: true, actions: [{ label: L('关闭', 'Close'), style: 'btn-ghost' }] });
  }

  function runOcrDemo() {
    const el = document.getElementById('ocr-result');
    if (!el) return;
    el.innerHTML = '<div class="ocr-loading"><span></span>' + L('正在识别（演示）…', 'Reading the sample…') + '</div>';
    setTimeout(function () {
      el.innerHTML = '<div class="ocr-extracted"><strong>' + L('识别结果 · 请先确认', 'Recognised — please confirm') + '</strong>' +
        '<div class="ocr-extract-row"><span>' + L('慢病', 'Conditions') + '</span><span>' + L('慢性胃炎', 'Chronic gastritis') + '</span></div>' +
        '<div class="ocr-extract-row"><span>' + L('用药', 'Medicines') + '</span><span>' + L('奥美拉唑（抑酸药）、阿司匹林（可能伤胃）', 'Omeprazole (acid suppressant), aspirin (stomach risk)') + '</span></div>' +
        '<div class="ocr-extract-row"><span>' + L('提示', 'Flag') + '</span><span>' + L('阿司匹林可能增加胃出血风险，就诊时告诉医生。', 'Aspirin can increase bleeding risk — tell your doctor.') + '</span></div>' +
        '<button type="button" class="btn btn-dark btn-small" data-action="ocr-apply">' + icon('check') + L('确认并填入档案', 'Confirm and fill my file') + '</button></div>';
      const actions = document.querySelector('.ocr-actions');
      if (actions) actions.style.display = 'none';
    }, 1100);
  }

  function applyOcrDemo() {
    const p = WA.state.profile;
    p.conditions = Array.from(new Set((p.conditions || []).filter(function (x) { return x !== 'none' && x !== 'unsure'; }).concat(['gastritis'])));
    p.meds = Array.from(new Set((p.meds || []).concat(['ppi', 'aspirin'])));
    p.medsAnswered = true;
    WA.save();
    WA.closeModal();
    refreshPreserveScroll();
    WA.toast(L('示例识别结果已填入。请核对，尤其是阿司匹林和胃药。', 'Sample results filled in. Please check them, especially aspirin and stomach medicine.'), 'success', 4200);
  }

  /* ---------- 结果下载 ---------- */
  function downloadResult() {
    const r = WA.state.result;
    if (!r) return;
    const c = r.condition || WA.CONDITIONS[r.conditionId];
    const pattern = WA.PATTERNS[r.patternId];
    const lines = [
      L('胃安 / TummyBuddy · 自测结果', 'TummyBuddy · Check result'),
      WA.formatDate(r.createdAt),
      '',
      L('优先科室：', 'Priority clinic: ') + tx(c.dept),
      L('建议节奏：', 'Timing: ') + (r.urgency === 'red' ? L('立即处理', 'Immediate') : r.urgency === 'amber' ? L('尽快就医', 'Soon') : L('观察并复查', 'Observe and review')),
      '',
      L('最值得关注：', 'Most important to check: ') + tx(c.name),
      tx(c.short),
      '',
      L('为什么：', 'Why: '),
      tx(c.why),
      '',
      L('现在做什么：', 'What to do now:'),
      (c.doNow || []).map(function (x) { return '· ' + tx(x); }).join('\n'),
      '',
      L('要问医生：', 'Questions for the doctor:'),
      (c.ask || []).map(function (x) { return '· ' + tx(x); }).join('\n'),
      '',
      L('可能讨论的检查：', 'Tests to discuss: ') + (c.tests || []).map(function (x) { return tx(x); }).join('、'),
      pattern ? L('\n中医视角（不是诊断）：', '\nTCM view (not a diagnosis): ') + tx(pattern.name) : '',
      '',
      L('重要说明：本结果仅用于健康教育和就医方向参考，不构成诊断、处方或治疗建议。', 'Important: this result is for health education and care direction only. It is not a diagnosis, prescription or treatment plan.'),
      L('出现剧烈腹痛、呕血黑便、胸痛大汗、晕厥，请立即拨打 120。', 'For severe pain, vomiting blood or black stools, chest pain with sweating, or fainting, call 120.')
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (WA.lang() === 'en' ? 'tummybuddy-result-' : '胃安-结果-') + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 全局事件 ---------- */
  document.addEventListener('click', handleClick);
  document.addEventListener('change', function (event) {
    const t = event.target;
    if (t.matches('[data-action="toggle-consent"]')) {
      WA.state.consent = t.checked;
      WA.save();
      const btn = document.querySelector('[data-action="accept-consent"]');
      if (btn) btn.disabled = !t.checked;
      return;
    }
    if (t.matches('[data-profile-check]')) {
      WA.state.profile[t.dataset.profileCheck] = t.checked;
      WA.save();
      return;
    }
    if (t.matches('[data-photo-input]')) { handlePhotoInput(event); return; }
    if (t.matches('[data-record-input]')) { handleRecordInput(event); return; }
    if (t.matches('[data-camera-file]')) { handleCameraFile(event); return; }
  });
  document.addEventListener('input', function (event) {
    const t = event.target;
    if (t.matches('[data-profile-input]')) {
      const key = t.dataset.profileInput;
      WA.state.profile[key] = t.value;
      if (key === 'age' && t.value) WA.state.profile.ageRange = '';
      if (key === 'allergies' && t.value.trim()) {
        WA.state.profile.noAllergies = false;
        WA.state.profile.unsureAllergies = false;
      }
      return;
    }
    if (t.matches('[data-mild-input]')) {
      WA.state.mild.answers[t.dataset.mildInput] = t.value;
      return;
    }
    if (t.matches('[data-mild-range]')) {
      WA.state.mild.answers[t.dataset.mildRange] = Number(t.value);
      const out = document.getElementById('mild-severity-value');
      if (out) out.textContent = t.value;
      return;
    }
    if (t.matches('[data-mod-range]')) {
      WA.state.moderate.answers[t.dataset.modRange] = Number(t.value);
      const out = document.getElementById('mod-severity-value');
      if (out) out.textContent = t.value;
      return;
    }
    if (t.matches('[data-manual-address]')) {
      WA.state.setupManualAddress = t.value;
      return;
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && WA.modalState && WA.modalState.dismissible !== false) WA.closeModal();
  });

  window.addEventListener('popstate', function () {
    if (WA.state.phase !== 'app') return;
    const hash = (location.hash || '').replace('#', '');
    if (WA.appScreens.includes(hash) && hash !== WA.state.screen) {
      WA.state.screen = hash;
      if (hash !== 'emergency') {
        stopEmergencyTimer();
        WA.stopLocationWatch();
        WA.stopMusic();
        WA.stopSpeak();
        WA.stopBreathing();
      }
      WA.renderAll();
    }
  });

  // 暴露给模板
  WA.analysis = { buildMildResult: buildMildResult, buildModerateResult: buildModerateResult, extractKeywords: extractKeywords, dangerFromText: dangerFromText };
})();
