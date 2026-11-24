/* 胃安 / TummyBuddy — 小安陪伴智能体
   一个纯本地的对话助手：不训练模型、不调外部接口，答案来自项目内整理的健康教育内容与分诊规则。
   边界：不做诊断、不开处方、不给剂量；出现危险信号立即引导拨打 120。 */
(function () {
  'use strict';
  const WA = window.WA;
  if (!WA) return;
  const L = WA.L;
  const esc = WA.esc;

  const EMERGENCY = ['呕血', '吐血', '黑便', '柏油', '晕厥', '昏倒', '昏迷', '胸痛', '胸闷大汗', '剧烈腹痛', '疼得直不起腰', '宫外孕', '孕期出血', '怀孕出血', '大出血'];
  const REFUSE = ['开药', '吃什么药', '吃啥药', '剂量', '几片', '处方', '偏方', '中药方', '消炎药', '抗生素', '止疼药推荐'];

  const KB = [
    {
      id: 'dept',
      tags: ['挂什么科', '什么科', '科室', '挂号', '看哪个科', '去医院', '就诊'],
      q: { zh: '我该挂什么科？', en: 'Which clinic should I book?' },
      a: {
        zh: '胃胀、反酸、上腹痛、早饱这类情况，先挂消化内科。\n右上腹痛、吃油腻后加重、向右肩背放射，优先肝胆外科或消化内科。\n胸闷、压迫感、大汗、放射到左肩或下颌，先去心内科或急诊，不要先按胃病查。',
        en: 'For bloating, reflux, upper-belly pain or early fullness, start with Gastroenterology.\nRight-upper pain after fatty food, spreading to the right shoulder: Hepatobiliary Surgery or Gastroenterology.\nChest pressure, sweating, pain spreading to the left shoulder or jaw: Cardiology or the emergency department first — do not start with a stomach work-up.'
      },
      chips: ['dept-cardiac', 'test', 'gastroscopy']
    },
    {
      id: 'dept-cardiac',
      tags: ['心内科', '心脏', '胸闷', '胸痛', '大汗'],
      q: { zh: '胸闷也要看胃吗？', en: 'Can chest tightness be stomach-related?' },
      a: {
        zh: '上腹不适有可能是心肌缺血的不典型表现，尤其是活动后加重、伴大汗、放射到左肩或下颌时。\n这类情况先做心电图、去心内科或急诊，不要先做胃镜，也不要自己吃胃药把症状压下去。',
        en: 'Upper-belly discomfort can be an atypical sign of cardiac ischaemia — especially if it worsens with exertion, comes with sweating, or spreads to the left shoulder or jaw.\nGet an ECG and go to Cardiology or the emergency department first. Do not start with gastroscopy, and do not mask it with stomach medicine.'
      },
      chips: ['emergency-help', 'dept']
    },
    {
      id: 'cancer',
      tags: ['胃癌', '癌症', '癌', '肿瘤', '是不是很严重', '会不会死'],
      q: { zh: '会不会是胃癌？', en: 'Could this be stomach cancer?' },
      a: {
        zh: '只看症状没法判断是不是胃癌，谁都不能靠“像不像”下结论。\n真正有用的是风险信号：年龄偏大、消瘦、黑便或呕血、吞咽困难、贫血、家族史、幽门螺杆菌阳性。有这些，尽快去消化内科做胃镜。\n你现在能做的：把症状、持续时间、体重变化记下来，带着去门诊——比在网上反复搜更有用。',
        en: 'Symptoms alone cannot tell whether this is cancer — nobody can judge that from “what it feels like”.\nWhat matters are risk signs: older age, weight loss, black stools or vomiting blood, trouble swallowing, anaemia, family history, H. pylori positive. If any apply, see Gastroenterology for a gastroscopy soon.\nWhat you can do now: write down symptoms, duration and weight change, and take that to the clinic. It helps far more than searching repeatedly online.'
      },
      chips: ['gastroscopy', 'test', 'dept']
    },
    {
      id: 'reflux',
      tags: ['反酸', '烧心', '反流', '胸口烧', '酸水'],
      q: { zh: '反酸、烧心怎么办？', en: 'What helps reflux?' },
      a: {
        zh: '先改三件事：睡前 3 小时不进食；床头整体抬高 10–15 cm（垫枕头没用）；少碰空腹咖啡、浓茶、酒和夜宵。\n每周反酸超过 2 次、影响睡眠，或伴吞咽困难、黑便、体重下降，去消化内科评估，必要时做胃镜。\n不要长期自己买抑酸药顶着，尤其超过 8 周。',
        en: 'Start with three things: no food 3 hours before bed; raise the head of the bed 10–15 cm (extra pillows do not work); cut late meals, coffee on an empty stomach, strong tea and alcohol.\nIf reflux happens more than twice a week, disturbs sleep, or comes with trouble swallowing, black stools or weight loss, see Gastroenterology — a gastroscopy may be needed.\nDo not stay on over-the-counter acid suppressants for months, especially beyond 8 weeks.'
      },
      chips: ['sleep', 'diet', 'dept']
    },
    {
      id: 'bloat',
      tags: ['胃胀', '胀气', '腹胀', '早饱', '吃一点就饱', '堵'],
      q: { zh: '总是胃胀、吃一点就饱', en: 'Bloating and early fullness' },
      a: {
        zh: '先看两件事：是不是吃得太快、边吃边说话；有没有明显的诱因（豆类、奶、碳酸饮料、夜宵）。\n试试两周“七分饱 + 细嚼 + 饭后走 10 分钟”，记录哪天最胀。\n如果胀满持续加重、体重下降、呕吐或黑便，别只当消化不良，去消化内科。',
        en: 'Check two things first: eating too fast or talking while eating, and obvious triggers (beans, milk, fizzy drinks, late meals).\nTry two weeks of “stop at 70% full, chew well, walk 10 minutes after meals”, and note which days are worst.\nIf fullness keeps worsening, or comes with weight loss, vomiting or black stools, do not treat it as simple indigestion — see Gastroenterology.'
      },
      chips: ['diet', 'test', 'dept']
    },
    {
      id: 'pain',
      tags: ['胃痛', '肚子痛', '上腹痛', '隐痛', '绞痛', '疼'],
      q: { zh: '胃痛怎么判断严不严重？', en: 'Is this stomach pain serious?' },
      a: {
        zh: '先排除“不能等”的：突然刀割样剧痛、肚子硬得像木板、呕血或黑便、晕厥冷汗、胸痛大汗——有任意一条，直接 120。\n没有这些，再看规律：饿的时候痛、吃了缓解，更像十二指肠溃疡；饭后痛、躺下加重，更像反流或胃炎。\n痛超过 1 周、夜间痛醒、体重下降，去消化内科；不要靠止痛药硬扛。',
        en: 'Rule out the “cannot wait” ones first: sudden knife-like pain, a board-hard belly, vomiting blood or black stools, fainting with cold sweat, chest pain with sweating — any one means call 120.\nIf none apply, look at the pattern: pain when hungry that eases with food suggests a duodenal ulcer; pain after meals or lying down suggests reflux or gastritis.\nPain lasting over a week, waking you at night, or with weight loss needs Gastroenterology. Do not just push through with painkillers.'
      },
      chips: ['painkiller', 'emergency-help', 'test']
    },
    {
      id: 'painkiller',
      tags: ['止痛药', '布洛芬', '阿司匹林', '芬必得', '能不能吃止痛'],
      q: { zh: '胃痛能吃止痛药吗？', en: 'Can I take painkillers for stomach pain?' },
      a: {
        zh: '不建议。布洛芬、阿司匹林这类非甾体抗炎药本身就可能伤胃，甚至引起出血，还会把真实的疼痛盖住。\n如果医生给你开了阿司匹林或抗凝药，不要自行停；但要把胃痛、黑便、反酸告诉医生，讨论要不要加胃保护。\n止痛药不能替代就诊。',
        en: 'Not advisable. NSAIDs such as ibuprofen and aspirin can injure the stomach and even cause bleeding, and they hide the real pain.\nIf a doctor prescribed aspirin or an anticoagulant, do not stop it yourself — but tell them about stomach pain, black stools or reflux and ask about gastric protection.\nPainkillers are not a substitute for being seen.'
      },
      chips: ['pain', 'dept', 'emergency-help']
    },
    {
      id: 'hp',
      tags: ['幽门螺杆菌', 'hp', '吹气', '呼气试验', '杀菌'],
      q: { zh: '幽门螺杆菌阳性要治吗？', en: 'Is H. pylori positive serious?' },
      a: {
        zh: '阳性不等于一定会得胃病，但它是胃炎、溃疡和胃癌的明确危险因素，通常建议在医生指导下根除。\n检查和治疗都要在消化内科做：先确认没在用抑酸药和抗生素，按疗程吃药，停药后复查。\n家里人不用一律查，但共用筷子、口对口喂孩子这些习惯要改。',
        en: 'A positive result does not mean you will get ulcers, but it is a clear risk factor for gastritis, ulcers and stomach cancer, and eradication is usually advised under medical guidance.\nTesting and treatment belong to Gastroenterology: confirm you are off acid suppressants and antibiotics, complete the course, and re-test afterwards.\nNot every family member needs testing, but sharing chopsticks and pre-chewing food for children should stop.'
      },
      chips: ['gastroscopy', 'dept', 'diet']
    },
    {
      id: 'gastroscopy',
      tags: ['胃镜', '做胃镜', '胃镜难受', '无痛胃镜', '插管'],
      q: { zh: '胃镜是不是很可怕？', en: 'Is gastroscopy scary?' },
      a: {
        zh: '普通胃镜大概 5–10 分钟，主要难受是恶心、流口水，大部分人能忍；怕的话可以选无痛胃镜（静脉麻醉，睡一觉）。\n检查前要空腹 6–8 小时、禁水 2 小时；有高血压药、抗凝药要提前问医生怎么吃。\n该做的时候别拖：吞咽困难、黑便、呕血、消瘦、40 岁后新发症状，都值得查一次。',
        en: 'A standard gastroscopy takes about 5–10 minutes; the main discomfort is retching and drooling, and most people tolerate it. If you are anxious, sedation (“painless” gastroscopy) is an option.\nFast for 6–8 hours and stop clear fluids 2 hours before; ask your doctor about blood-pressure and anticoagulant medicines.\nDo not delay when it is indicated: trouble swallowing, black stools, vomiting blood, weight loss, or new symptoms after 40.'
      },
      chips: ['hp', 'dept', 'test']
    },
    {
      id: 'diet',
      tags: ['吃什么', '忌口', '能吃辣', '辣椒', '咖啡', '喝酒', '养胃', '粥', '牛奶', '水果'],
      q: { zh: '胃不好，能吃辣 / 喝咖啡吗？', en: 'Spicy food or coffee — allowed?' },
      a: {
        zh: '没有一种食物对所有人都“养胃”或“伤胃”，关键是你的反应。用两周记录法：吃了什么、多久后不舒服。\n常见诱因：空腹咖啡、浓茶、酒、夜宵、暴饮暴食、超辣。能耐受的不用一概戒掉，吃了就难受的先停两周。\n白粥、苏打饼干只能短期缓解，不治病因；长期只喝粥反而可能营养不够。',
        en: 'No single food heals or harms every stomach — your own response matters. Keep a two-week log: what you ate and when symptoms started.\nCommon triggers: coffee on an empty stomach, strong tea, alcohol, late meals, binge eating, very spicy food. Do not ban everything you tolerate; drop what clearly hurts for two weeks.\nCongee and soda crackers give short-term relief, not a cure; living on congee alone can leave you undernourished.'
      },
      chips: ['reflux', 'bloat', 'sleep']
    },
    {
      id: 'sleep',
      tags: ['睡不着', '失眠', '怎么睡', '夜里', '夜间', '早醒'],
      q: { zh: '晚上反酸、睡不好怎么办？', en: 'Reflux at night, poor sleep' },
      a: {
        zh: '睡前三小时不进食，晚餐少油少辣；床头整体抬高 10–15 cm，左侧卧通常比右侧卧舒服。\n如果夜里被酸水呛醒、咳嗽、声音嘶哑，说明反流已经影响到咽喉，去消化内科评估。\n别用酒助眠——它会让反流更重，也会让后半夜更容易醒。',
        en: 'No food 3 hours before bed, and keep dinner low in fat and spice. Raise the head of the bed 10–15 cm; lying on your left side is usually more comfortable than the right.\nIf acid wakes you at night with coughing or a hoarse voice, reflux is affecting your throat — see Gastroenterology.\nDo not use alcohol to fall asleep: it worsens reflux and fragments the second half of the night.'
      },
      chips: ['reflux', 'stress', 'diet']
    },
    {
      id: 'stress',
      tags: ['压力', '焦虑', '情绪', '紧张', '心情', '生气', '抑郁'],
      q: { zh: '压力大真的会影响胃吗？', en: 'Does stress really affect the stomach?' },
      a: {
        zh: '会。情绪通过脑-肠轴影响胃酸分泌、胃肠蠕动和内脏敏感性，压力大时更容易胀、痛、反酸。\n这不是“想出来的病”，但也不是靠“想开点”就能好。规律吃饭、每天 10 分钟慢走或 4-6 呼吸，比硬扛有用。\n如果情绪低落、兴趣减退持续两周以上，建议同时看心理 / 精神科，不必觉得丢人。',
        en: 'Yes. Emotion affects acid secretion, gut motility and visceral sensitivity through the brain–gut axis, so stress can worsen bloating, pain and reflux.\nIt is not “all in your head”, but it will not fix itself by “thinking positive”. Regular meals and 10 minutes of walking or 4-6 breathing daily help more than pushing through.\nIf low mood or loss of interest lasts more than two weeks, see a mental-health professional too — there is no shame in it.'
      },
      chips: ['sleep', 'reflux', 'test']
    },
    {
      id: 'pregnant',
      tags: ['怀孕', '孕妇', '备孕', '孕期'],
      q: { zh: '怀孕期间胃不舒服怎么办？', en: 'Stomach trouble during pregnancy' },
      a: {
        zh: '孕期腹痛、出血要先排除妇科急症：下腹痛 + 出血 + 头晕，立即去急诊，警惕宫外孕。\n普通的反酸、胀气很常见：少量多餐、饭后别立刻躺下、睡时抬高床头。\n任何用药都要先问产科医生，包括“养胃”的中成药和保健品。',
        en: 'Belly pain with bleeding in pregnancy needs urgent assessment: lower pain + bleeding + dizziness means go to the emergency department and rule out an ectopic pregnancy.\nOrdinary reflux and bloating are common: eat small meals, do not lie down right after eating, and raise the head of the bed.\nAsk your obstetrician before any medicine, including herbal “stomach” products and supplements.'
      },
      chips: ['emergency-help', 'dept', 'diet']
    },
    {
      id: 'test',
      tags: ['要不要做自测', '自测', '测一下', '怎么测', '测评'],
      q: { zh: '我该先做自测吗？', en: 'Should I do the self-check?' },
      a: {
        zh: '如果现在有剧烈腹痛、呕血黑便、胸痛大汗、晕厥，别做自测，直接 120。\n没有这些，可以做一次“缓”测评（6–8 分钟），它会帮你把症状、部位、饮食睡眠整理成一页，看医生时直接照着说。\n结果只是分诊方向，不是诊断。',
        en: 'If you have severe pain, vomiting blood or black stools, chest pain with sweating, or fainting right now, skip the check and call 120.\nOtherwise the full check (6–8 minutes) organises your symptoms, location, food and sleep into one page you can read out at the clinic.\nThe result is a triage direction, not a diagnosis.'
      },
      chips: ['dept', 'gastroscopy', 'cancer']
    },
    {
      id: 'hospital',
      tags: ['医院', '附近', '去哪家', '急诊', '三甲'],
      q: { zh: '附近去哪家医院？', en: 'Which hospital nearby?' },
      a: {
        zh: '急症（胸痛、呕血、晕厥、剧烈腹痛）优先选有 24 小时急诊的综合医院，不要先去只有门诊的诊所。\n普通胃病选有消化内科的二级及以上医院即可，不必都挤三甲；关键是能当天做必要检查。\n你可以在结果页点“高德搜附近医院”，按定位搜，不限定三甲。',
        en: 'For emergencies (chest pain, vomiting blood, fainting, severe pain) choose a general hospital with 24-hour emergency care — not a clinic with outpatients only.\nFor ordinary stomach problems, a secondary hospital with Gastroenterology is enough; you do not need a top-tier hospital for everything. What matters is getting the needed test the same day.\nOn the result page, tap “Nearby hospitals” to search by your location.'
      },
      chips: ['dept', 'emergency-help', 'test']
    },
    {
      id: 'report',
      tags: ['报告', '化验单', '结果怎么看', '指标', '体检'],
      q: { zh: '报告上的指标怎么看？', en: 'How do I read my report?' },
      a: {
        zh: '我可以帮你理解名词，但不能替你读片、读病理、下结论——那需要医生结合你的情况。\n常见几项：幽门螺杆菌呼气试验看阴阳性；胃镜报告看“部位 + 描述 + 病理”；血常规看血红蛋白有没有贫血。\n把报告拍下来带去门诊，比自己对着指标搜索更靠谱。',
        en: 'I can explain the terms, but I cannot interpret your imaging, pathology or make a conclusion — that needs a doctor who knows your case.\nCommon ones: the H. pylori breath test is positive or negative; a gastroscopy report has site + description + pathology; a blood count shows whether you are anaemic.\nTake photos of the report to your appointment — far better than matching numbers online.'
      },
      chips: ['gastroscopy', 'hp', 'dept']
    },
    {
      id: 'tcm',
      tags: ['中医', '舌苔', '体质', '证型', '上火', '湿气', '脾胃'],
      q: { zh: '中医说的脾胃虚、湿气是什么？', en: 'What does TCM “spleen deficiency” mean?' },
      a: {
        zh: '中医的“脾胃”不完全等于解剖上的胃，更多是一组功能：吃进去能不能化、水湿能不能运。\n舌苔、脉象要当面看才准，手机拍的舌象只能做记录，不能拿来定证型。\n想走中医这条路，去正规医院的中医脾胃科或治未病科，让医生辨证；不要照着自己的“证型”买中成药。',
        en: 'In TCM, “spleen and stomach” is not exactly the anatomical stomach — it is a set of functions: how well food is transformed and fluids are moved.\nTongue and pulse need to be assessed in person; a phone photo is a record, not a basis for a pattern diagnosis.\nIf you want TCM care, see a proper TCM digestive or preventive clinic and let the practitioner differentiate. Do not buy patent medicine based on a pattern you found online.'
      },
      chips: ['dept', 'diet', 'test']
    },
    {
      id: 'weight',
      tags: ['减肥', '瘦', '体重', '节食', '不吃晚饭'],
      q: { zh: '减肥会不会把胃饿坏？', en: 'Can dieting hurt my stomach?' },
      a: {
        zh: '极端节食、长期不吃主食，容易出现胃酸刺激、胆结石风险上升、反弹和情绪问题。\n更稳的做法：三餐规律、每餐七分饱、蛋白质够、每周减 0.5–1 kg，配合力量训练。\n如果出现持续胃痛、黑便、晕厥，别再硬扛，先就医。',
        en: 'Extreme dieting and long-term carb restriction can increase acid irritation, gallstone risk, rebound weight gain and mood problems.\nA steadier approach: regular meals, stop at 70% full, enough protein, 0.5–1 kg per week, plus resistance training.\nIf you develop persistent pain, black stools or fainting, stop dieting and get medical care.'
      },
      chips: ['diet', 'stress', 'dept']
    },
    {
      id: 'emergency-help',
      tags: ['危险', '急救', '120', '急诊', '严重', '大出血'],
      q: { zh: '哪些情况要立刻去急诊？', en: 'When is it an emergency?' },
      a: {
        zh: '这几条任意一条都按急症处理：呕血或咖啡渣样呕吐物、黑便 / 柏油便、突然剧烈腹痛且肚子发硬、胸痛胸闷伴大汗、晕厥冷汗、孕期腹痛出血。\n不要等结果、不要自己开车、不要先吃止痛药。\n现在就打 120，或让身边的人送你去最近的有急诊的医院。',
        en: 'Any one of these is an emergency: vomiting blood or coffee-ground material, black/tarry stools, sudden severe pain with a hard belly, chest pain or pressure with sweating, fainting with cold sweat, belly pain or bleeding in pregnancy.\nDo not wait for a result, do not drive yourself, do not take painkillers first.\nCall 120 now, or have someone take you to the nearest hospital with emergency care.'
      },
      chips: ['pain', 'dept-cardiac', 'dept']
    },
    {
      id: 'who',
      tags: ['你是谁', 'ai', '机器人', '人工智能', '小安'],
      q: { zh: '你是医生吗？', en: 'Are you a doctor?' },
      a: {
        zh: '我是小安，一个陪你整理思路的电子胃——不是医生，也不做诊断。\n我能做的是：把症状问清楚、告诉你该挂哪科、哪些情况要立刻就医、检查和用药的常见误区。\n拿不准的时候，我会让你去做自测，或者直接去看医生。',
        en: 'I am An, a little digital stomach who helps you organise your thoughts — not a doctor, and I do not diagnose.\nWhat I can do: help you describe symptoms, point you to the right clinic, flag when to seek care immediately, and clear up common myths about tests and medicines.\nWhen I am unsure, I will send you to the self-check or to a real doctor.'
      },
      chips: ['test', 'dept', 'gastroscopy']
    }
  ];

  const QUICK = [
    { label: { zh: '挂什么科', en: 'Which clinic' }, id: 'dept' },
    { label: { zh: '反酸怎么睡', en: 'Reflux at night' }, id: 'reflux' },
    { label: { zh: '胃镜可怕吗', en: 'Gastroscopy' }, id: 'gastroscopy' },
    { label: { zh: '能吃辣吗', en: 'Spicy food' }, id: 'diet' },
    { label: { zh: '会不会是胃癌', en: 'Cancer worry' }, id: 'cancer' },
    { label: { zh: '什么时候要急诊', en: 'Emergency signs' }, id: 'emergency-help' }
  ];

  function norm(str) {
    return String(str || '').toLowerCase().replace(/[\s，。？！、；：,.?!;:"'“”‘’（）()《》<>~·-]/g, '');
  }

  function match(text) {
    const t = norm(text);
    if (!t) return null;
    let best = null;
    let bestScore = 0;
    KB.forEach(function (item) {
      let score = 0;
      item.tags.forEach(function (tag) {
        const n = norm(tag);
        if (n && t.indexOf(n) >= 0) score += n.length + 1;
      });
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return bestScore >= 2 ? best : null;
  }

  function hitEmergency(text) {
    const t = norm(text);
    return EMERGENCY.some(function (k) { return t.indexOf(norm(k)) >= 0; });
  }
  function hitRefuse(text) {
    const t = norm(text);
    return REFUSE.some(function (k) { return t.indexOf(norm(k)) >= 0; });
  }

  const state = { open: false, messages: [], greeted: false, busy: false };

  let root, panel, logEl, inputEl, quickEl, fabEl, statusEl;

  function msg(role, text, extra) {
    state.messages.push({ role: role, text: text, extra: extra || null });
    if (state.messages.length > 40) state.messages.shift();
    paint();
  }

  function paint() {
    if (!logEl) return;
    logEl.innerHTML = state.messages.map(function (m) {
      if (m.role === 'bot') {
        return '<div class="anp-msg bot">' + esc(m.text).replace(/\n/g, '<br>') + (m.extra ? m.extra : '') + '</div>';
      }
      if (m.role === 'me') return '<div class="anp-msg me">' + esc(m.text) + '</div>';
      if (m.role === 'alert') return '<div class="anp-msg alert">' + m.text + '</div>';
      return '<div class="anp-msg bot">' + m.text + '</div>';
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setChips(list) {
    if (!quickEl) return;
    quickEl.innerHTML = list.map(function (c) {
      if (c.id) return '<button type="button" class="anp-chip" data-anp-ask="' + c.id + '">' + esc(tx(c.label)) + '</button>';
      return '<button type="button" class="anp-chip" data-anp-text="' + esc(c.text) + '">' + esc(tx(c.label)) + '</button>';
    }).join('');
  }

  function tx(obj) {
    if (typeof obj === 'string') return obj;
    return WA.lang() === 'en' ? (obj.en || obj.zh) : (obj.zh || obj.en);
  }

  function emergencyCard() {
    return '<strong>' + esc(L('这可能是需要急诊的情况。', 'This may need emergency care.')) + '</strong>' +
      esc(L('不要等结果，也不要自己开车。先拨打 120，或让人送你去最近有急诊的医院。', 'Do not wait for a result and do not drive yourself. Call 120, or have someone take you to the nearest emergency department.')) +
      '<br><a class="anp-link" href="tel:120" data-anp-close>' + esc(L('拨打 120', 'Call 120')) + '</a>' +
      '<button type="button" class="anp-link" data-action="start-emergency" style="background:#8b281a;margin-left:6px">' + esc(L('进入急救页', 'Open emergency page')) + '</button>';
  }

  function reply(item) {
    const text = tx(item.a);
    msg('bot', text);
    const chips = (item.chips || []).slice(0, 2).map(function (id) {
      const it = KB.find(function (x) { return x.id === id; });
      return it ? { label: it.q, id: id } : null;
    }).filter(Boolean);
    setChips(chips.length ? chips.concat([{ label: { zh: '换个问题', en: 'Something else' }, text: 'help' }]) : QUICK);
  }

  function answer(raw) {
    if (state.busy) return;
    const text = String(raw || '').trim();
    if (!text) return;
    msg('me', text);
    inputEl.value = '';
    state.busy = true;
    statusEl.textContent = L('小安正在想…', 'An is thinking…');
    const typing = document.createElement('div');
    typing.className = 'anp-msg bot';
    typing.innerHTML = '<span class="anp-typing"><i></i><i></i><i></i></span>';
    logEl.appendChild(typing);
    logEl.scrollTop = logEl.scrollHeight;

    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      state.busy = false;
      statusEl.textContent = L('随时可以问', 'Ask me anything');

      if (hitEmergency(text)) {
        msg('alert', emergencyCard());
        setChips([
          { label: { zh: '什么时候要急诊', en: 'Emergency signs' }, id: 'emergency-help' },
          { label: { zh: '胃痛怎么判断', en: 'Is my pain serious' }, id: 'pain' }
        ]);
        return;
      }
      if (hitRefuse(text)) {
        msg('bot', L('我不能给你推荐药名、剂量或处方——这必须由医生根据你的情况决定。\n我可以帮你判断该挂哪科、要不要尽快就医，以及就诊时该问医生什么。',
          'I cannot recommend a specific medicine, dose or prescription — that has to come from a doctor who knows your case.\nI can help with which clinic to book, how urgent it is, and what to ask at the appointment.'));
        setChips([
          { label: { zh: '我该挂什么科', en: 'Which clinic' }, id: 'dept' },
          { label: { zh: '胃痛能吃止痛药吗', en: 'Painkillers' }, id: 'painkiller' }
        ]);
        return;
      }
      const item = match(text);
      if (item) { reply(item); return; }

      msg('bot', L('这个问题我还答不好。你可以换个说法，或者点下面的问题。\n如果是具体的症状，做一次自测会更清楚；拿不准要不要就医时，也可以直接问我“什么时候要急诊”。',
        'I am not sure about that one. Try rephrasing, or tap a question below.\nFor specific symptoms, the self-check gives a clearer picture; if you are unsure whether to seek care, ask me “when is it an emergency”.'));
      setChips(QUICK);
    }, 420 + Math.min(500, text.length * 18));
  }

  function greet() {
    const h = new Date().getHours();
    const timeWord = h < 6 ? L('这么晚还没睡', 'Still up') : h < 11 ? L('早上好', 'Good morning') : h < 14 ? L('中午好', 'Good afternoon') : h < 19 ? L('下午好', 'Good afternoon') : L('晚上好', 'Good evening');
    const p = WA.state.profile || {};
    let extra = '';
    if (!p.contactPhone) extra = L('\n顺手提醒：急救卡里还没有紧急联系人，补上只要 30 秒。', '\nOne thing: your emergency card has no contact yet — adding one takes 30 seconds.');
    else if (!WA.state.location || !WA.state.location.lat) extra = L('\n如果要找附近医院，记得先开定位，我可以带你过去。', '\nIf you want nearby hospitals, turn on location and I will take you there.');
    msg('bot', timeWord + L('，我是小安。\n胃胀、反酸、胃痛，或者只是想知道该不该去医院，都可以问我。', ', I am An.\nBloating, reflux, stomach pain — or just wondering whether to see a doctor — ask me anything.') + extra);
    setChips(QUICK);
  }

  function open() {
    state.open = true;
    panel.hidden = false;
    fabEl.classList.remove('has-news');
    if (!state.greeted) { state.greeted = true; greet(); }
    setTimeout(function () { if (inputEl) inputEl.focus(); }, 120);
  }
  function close() {
    state.open = false;
    panel.hidden = true;
  }

  function bind() {
    document.addEventListener('click', function (e) {
      const ask = e.target.closest('[data-anp-ask]');
      if (ask) {
        const item = KB.find(function (x) { return x.id === ask.dataset.anpAsk; });
        if (item) { msg('me', tx(item.q)); setTimeout(function () { reply(item); }, 260); }
        return;
      }
      const txt = e.target.closest('[data-anp-text]');
      if (txt) {
        const v = txt.dataset.anpText;
        if (v === 'help') {
          msg('me', L('换个问题', 'Something else'));
          setChips(QUICK);
        } else { answer(v); }
        return;
      }
      if (e.target.closest('[data-action="start-emergency"], [data-action="triage"], [data-action="start-mild"], [data-action="learn"], [data-action="home"]')) {
        close();
      }
      if (e.target.closest('[data-anp-close]')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) close();
    });
  }

  function mount() {
    const wrap = document.createElement('div');
    wrap.className = 'anp';
    wrap.innerHTML =
      '<button type="button" class="anp-fab" data-anp-open aria-label="' + esc(L('打开小安，随时问问题', 'Open An and ask a question')) + '" data-label="' + esc(L('问我', 'Ask me')) + '">' +
        WA.mascot(46) + '<span class="anp-dot"></span>' +
      '</button>' +
      '<section class="anp-panel" hidden aria-label="' + esc(L('小安对话', 'Chat with An')) + '">' +
        '<header class="anp-head">' +
          '<span class="anp-ava">' + WA.mascot(40) + '</span>' +
          '<div><strong>' + esc(L('小安', 'An')) + '</strong><small class="anp-status"><i></i><span id="anp-status">' + esc(L('随时可以问', 'Ask me anything')) + '</span></small></div>' +
          '<button type="button" class="anp-close" data-anp-close aria-label="' + esc(L('关闭', 'Close')) + '">' + WA.icon('close') + '</button>' +
        '</header>' +
        '<div class="anp-log" id="anp-log" role="log" aria-live="polite"></div>' +
        '<div class="anp-quick" id="anp-quick"></div>' +
        '<form class="anp-compose" id="anp-form">' +
          '<input id="anp-input" type="text" autocomplete="off" placeholder="' + esc(L('说说哪里不舒服…', 'Tell me what is wrong…')) + '" aria-label="' + esc(L('输入问题', 'Type a question')) + '">' +
          '<button type="submit" class="anp-send" aria-label="' + esc(L('发送', 'Send')) + '">' + WA.icon('send') + '</button>' +
        '</form>' +
        '<p class="anp-note">' + esc(L('小安不是医生，不做诊断、不开药。对话只在本页内存中，刷新即清除。', 'An is not a doctor and cannot diagnose or prescribe. This chat stays in memory and is cleared on refresh.')) + ' <button type="button" class="anp-clear" data-anp-clear>' + esc(L('清空对话', 'Clear')) + '</button></p>' +
      '</section>';
    document.body.appendChild(wrap);

    root = wrap;
    panel = wrap.querySelector('.anp-panel');
    logEl = wrap.querySelector('#anp-log');
    inputEl = wrap.querySelector('#anp-input');
    quickEl = wrap.querySelector('#anp-quick');
    fabEl = wrap.querySelector('.anp-fab');
    statusEl = wrap.querySelector('#anp-status');

    fabEl.addEventListener('click', function () { state.open ? close() : open(); });
    wrap.querySelector('#anp-form').addEventListener('submit', function (e) {
      e.preventDefault();
      answer(inputEl.value);
    });
    wrap.querySelector('[data-anp-clear]').addEventListener('click', function () {
      state.messages = [];
      state.greeted = false;
      paint();
      greet();
    });
    bind();
  }

  WA.companion = { open: open, close: close, ask: answer, kb: KB };

  const autoOpen = (function () { try { return new URLSearchParams(location.search).get('anp') === '1'; } catch (e) { return false; } })();
  if (autoOpen) setTimeout(open, 600);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
