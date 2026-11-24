/* 胃安 / TummyBuddy — 启动 */
(function () {
  'use strict';
  const WA = window.WA;

  WA.load();
  const demo = WA.parseDemoQuery();

  if (!demo) {
    const hash = (location.hash || '').replace('#', '');
    if (WA.state.profileOnboarding) WA.state.screen = 'profile';
    else if (WA.appScreens.includes(hash)) WA.state.screen = hash;
  }

  if (!WA.state.lang) {
    WA.state.phase = 'language';
  } else if (WA.state.phase !== 'setup' && WA.state.phase !== 'app') {
    WA.state.phase = WA.state.onboarded || WA.state.profileOnboarding ? 'app' : 'setup';
  }

  if (WA.state.phase === 'setup' && !WA.state.lang) {
    WA.state.phase = 'language';
  }

  if (WA.state.phase === 'app' && !WA.appScreens.includes(WA.state.screen)) {
    WA.state.screen = 'home';
  }

  // 演示：构造结果页，便于截屏和走查。
  const q = new URLSearchParams(location.search);
  if (demo && WA.state.screen === 'result' && !WA.state.result) {
    const kind = q.get('kind') === 'mild' ? 'mild' : 'moderate';
    const c = q.get('case') || 'reflux';
    if (kind === 'moderate') {
      WA.state.moderate = {
        cluster: c === 'cardiac' ? 'cardiac' : c === 'gallbladder' ? 'gallbladder' : c === 'nausea' ? 'nausea' : c === 'dyspepsia' ? 'dyspepsia' : 'reflux',
        step: 2,
        answers: {
          redFlags: c === 'gi_bleed' ? ['bleeding'] : [],
          duration: 'weeks', severity: c === 'gi_bleed' ? 8 : 6,
          meal: c === 'dyspepsia' ? 'after' : 'after',
          symptoms: c === 'gi_bleed' ? ['black'] : c === 'gallbladder' ? ['nausea'] : ['reflux', 'belch'],
          fever: '', jaundice: '', weightLoss: '', blackStool: '', nightPain: '',
          fatty: c === 'gallbladder' ? 'yes' : '', shoulder: c === 'gallbladder' ? 'yes' : '',
          dehydration: '', age: '', biliary: c === 'gallbladder' ? ['fever'] : []
        },
        result: null
      };
      WA.state.result = WA.analysis.buildModerateResult();
    } else {
      const isEn = WA.lang() === 'en';
      const desc = c === 'functional'
        ? (isEn ? 'I feel bloated after every meal, worse in the afternoon and under stress.' : '一吃完饭就胀，下午更明显，压力大的时候会加重。')
        : (isEn ? 'I reflux when I lie down at night, with burning behind my breastbone and a sour taste.' : '晚上躺下会反酸，胸口烧，嘴里发酸。');
      WA.state.mild = {
        step: 5,
        answers: {
          chief: c === 'functional' ? ['bloating', 'fullness', 'belch'] : ['reflux', 'burning', 'belch'],
          location: c === 'gallbladder' ? 'right_upper' : 'epigastric',
          duration: 'recurrent', severity: 6,
          description: desc,
          keywords: WA.analysis.extractKeywords(desc),
          meal: c === 'functional' ? 'after' : 'night',
          stool: 'normal', coldHeat: 'normal', sleep: 'hard', mood: 'stress',
          diet: ['coffee', 'fatty'], tongueColor: 'normal', tongueCoat: 'thin', teethMarks: 'no',
          redFlags: []
        },
        photos: {},
        result: null
      };
      WA.state.result = WA.analysis.buildMildResult();
    }
  }

  if (demo && WA.state.screen === 'emergency') {
    WA.state.emergencyStart = Date.now() - 74000;
  }

  WA.renderAll();

  // demo hook: /?demo=1&cam=tongue|face|hand|record opens the camera with guide lines
  if (demo && q.get('cam') && WA.openCamera) {
    setTimeout(function () { try { WA.openCamera(q.get('cam')); } catch (e) { /* ignore */ } }, 500);
  }
})();
