/* 胃安 / TummyBuddy — 内容与医学分诊数据
   本文件只提供健康教育与就医方向参考，不构成诊断或处方。 */
(function () {
  'use strict';
  window.WA = window.WA || {};

  const zh = (s) => ({ zh: s, en: s });

  /* ---------- 危险信号 ---------- */
  WA.RED_FLAGS = [
    {
      id: 'chest', icon: 'heart', route: 'cardiac',
      title: { zh: '胸痛、胸闷或压迫感，伴大汗、气短', en: 'Chest pain, tightness or pressure, with sweating or breathlessness' },
      desc: { zh: '尤其放射到左肩、下颌、左臂或后背；活动后加重、休息缓解。', en: 'Especially if it spreads to the left shoulder, jaw, arm or back; worse with exertion and better with rest.' }
    },
    {
      id: 'bleeding', icon: 'drop', route: 'gi_bleed',
      title: { zh: '呕血、咖啡渣样呕吐物，或黑便 / 柏油样便', en: 'Vomiting blood or coffee-ground material, or black / tarry stools' },
      desc: { zh: '呕吐物带血或呈咖啡色；大便发黑、发亮、黏稠。', en: 'Blood or dark coffee-like vomit; black, shiny, sticky stools.' }
    },
    {
      id: 'severe', icon: 'bolt', route: 'emergency',
      title: { zh: '突然剧烈腹痛，或疼痛持续加重', en: 'Sudden severe abdominal pain, or pain that keeps getting worse' },
      desc: { zh: '刀割样、撕裂样、痛到直不起腰，或整个肚子都痛。', en: 'Knife-like or tearing pain, pain that doubles you over, or pain all over the belly.' }
    },
    {
      id: 'rigid', icon: 'shield', route: 'emergency',
      title: { zh: '腹部板硬、拒按，或外伤后腹痛', en: 'A rigid belly, cannot bear touch, or pain after an injury' },
      desc: { zh: '肚子摸起来像木板一样硬，一按就剧痛。', en: 'The belly feels board-like and even light touch is agonising.' }
    },
    {
      id: 'faint', icon: 'pulse', route: 'emergency',
      title: { zh: '晕厥、意识模糊、面色苍白、冷汗', en: 'Fainting, confusion, pale skin or cold sweats' },
      desc: { zh: '眼前发黑、站不住、叫不醒，或突然出很多冷汗。', en: 'Vision going black, unable to stand, hard to wake, or sudden heavy sweating.' }
    },
    {
      id: 'fever_jaundice', icon: 'temp', route: 'today',
      title: { zh: '高热寒战伴腹痛，或皮肤眼白发黄', en: 'High fever with chills and belly pain, or yellow skin / eyes' },
      desc: { zh: '发热打寒战，同时右上腹/上腹痛；或出现黄疸。', en: 'Fever and shivering with upper or right-upper belly pain; or yellowing of skin and eyes.' }
    },
    {
      id: 'dehydration', icon: 'water', route: 'today',
      title: { zh: '持续呕吐无法进水，尿量明显减少', en: 'Cannot keep fluids down, or passing very little urine' },
      desc: { zh: '喝什么都吐、口干、头晕、尿少或超过 8 小时没有小便。', en: 'Vomiting everything, dry mouth, dizziness, or no urine for over 8 hours.' }
    },
    {
      id: 'pregnancy', icon: 'pregnant', route: 'ectopic',
      title: { zh: '怀孕 / 可能怀孕，伴腹痛或阴道出血', en: 'Pregnant or possibly pregnant, with belly pain or vaginal bleeding' },
      desc: { zh: '育龄女性下腹痛、停经后出血，需要排除妇科急症。', en: 'Lower belly pain or bleeding after a missed period needs urgent pregnancy assessment.' }
    }
  ];

  /* ---------- “重”入口的症状分簇 ---------- */
  WA.CLUSTERS = [
    {
      id: 'reflux', icon: 'flame', tone: 'warm',
      title: { zh: '烧心 / 反酸 / 上腹灼痛', en: 'Heartburn, reflux or burning upper belly' },
      desc: { zh: '胸口烧、嘴里发酸，躺下或饭后更明显。', en: 'Burning behind the breastbone, sour taste, worse lying down or after meals.' },
      dept: { zh: '消化内科', en: 'Gastroenterology' }
    },
    {
      id: 'gallbladder', icon: 'drop', tone: 'warm',
      title: { zh: '右上腹痛 / 右肩背放射', en: 'Right-upper pain, spreading to the right shoulder' },
      desc: { zh: '吃油腻后加重，伴恶心、胀痛或发热。', en: 'Worse after fatty food, with nausea, ache or fever.' },
      dept: { zh: '肝胆外科 / 消化内科', en: 'Hepatobiliary surgery / Gastroenterology' }
    },
    {
      id: 'cardiac', icon: 'heart', tone: 'danger', priority: true,
      title: { zh: '胸闷 / 压迫 / 大汗', en: 'Chest pressure, tightness or heavy sweating' },
      desc: { zh: '放射到左肩、下颌、手臂；活动后加重。', en: 'Spreads to the left shoulder, jaw or arm; worse with activity.' },
      dept: { zh: '心内科 / 急诊', en: 'Cardiology / Emergency' }
    },
    {
      id: 'nausea', icon: 'wave', tone: 'warm',
      title: { zh: '恶心 / 呕吐 / 腹泻', en: 'Nausea, vomiting or diarrhoea' },
      desc: { zh: '吃坏东西、发热、水样便，或吐得停不下来。', en: 'After suspect food, with fever, watery stools, or unable to stop vomiting.' },
      dept: { zh: '消化内科 / 急诊', en: 'Gastroenterology / Emergency' }
    },
    {
      id: 'dyspepsia', icon: 'bloat', tone: 'calm',
      title: { zh: '上腹胀 / 早饱 / 打嗝', en: 'Upper-belly fullness, early fullness or belching' },
      desc: { zh: '吃一点就饱、饭后堵得慌、反复嗳气。', en: 'Full after a few bites, blocked after meals, repeated belching.' },
      dept: { zh: '消化内科 / 中医脾胃科', en: 'Gastroenterology / TCM digestive clinic' }
    },
    {
      id: 'unsure', icon: 'question', tone: 'calm',
      title: { zh: '说不清 / 其他', en: 'Not sure / something else' },
      desc: { zh: '位置模糊、感觉复杂，或以上都不太像。', en: 'Hard to locate, mixed feelings, or none of the above fits.' },
      dept: { zh: '消化内科', en: 'Gastroenterology' }
    }
  ];

  /* ---------- 常见情况与下一步 ---------- */
  WA.CONDITIONS = {
    cardiac: {
      name: { zh: '心源性上腹不适 / 心肌缺血', en: 'Cardiac cause / myocardial ischaemia' },
      short: { zh: '必须优先排除的心脏问题', en: 'A heart problem that must be ruled out first' },
      dept: { zh: '心内科 / 急诊 / 胸痛中心', en: 'Cardiology / Emergency / Chest Pain Centre' },
      urgency: 'emergency',
      why: { zh: '上腹不适有时是心肌缺血的不典型表现，尤其伴大汗、气短、恶心，或放射到左肩、下颌、手臂时。把它当“胃病”先吃胃药，可能耽误救命时间。', en: 'Upper-belly discomfort can be an atypical heart attack, especially with sweating, breathlessness, nausea, or pain spreading to the left shoulder, jaw or arm. Treating it as “gastritis” can delay life-saving care.' },
      doNow: [
        { zh: '症状正在持续：立即拨打 120。不要自己开车，不要等胃药起效。', en: 'If symptoms are ongoing, call 120 now. Do not drive yourself. Do not wait to see if stomach medicine helps.' },
        { zh: '停止活动，坐下或半卧，解开衣领，保持安静。', en: 'Stop activity. Sit or lie propped up. Loosen tight clothing. Stay calm.' },
        { zh: '不要自行服用阿司匹林、硝酸甘油或止痛药，除非急救调度员或医生明确让你用。', en: 'Do not take aspirin, nitroglycerin or painkillers unless the dispatcher or a doctor tells you to.' },
        { zh: '告诉急救人员：上腹不适、出汗、放射痛、活动后加重，以及心脏病史。', en: 'Tell the dispatcher: upper-belly discomfort, sweating, radiation, worse with activity, and any heart history.' }
      ],
      ask: [
        { zh: '需要马上做心电图和心肌损伤标志物（肌钙蛋白）吗？', en: 'Do I need an ECG and troponin now?' },
        { zh: '在排除心脏问题前，是否先不要做胃镜？', en: 'Should a gastroscopy wait until a cardiac cause is ruled out?' },
        { zh: '我的哪些药可能影响心脏或出血风险？', en: 'Which of my medicines affect heart risk or bleeding?' }
      ],
      tests: [
        { zh: '心电图', en: 'ECG' },
        { zh: '肌钙蛋白', en: 'Troponin' },
        { zh: '心脏超声（按医生判断）', en: 'Echocardiogram if advised' }
      ],
      watch: [
        { zh: '胸痛超过 15 分钟不缓解', en: 'Chest pain lasting more than 15 minutes' },
        { zh: '大汗、气短、恶心、晕厥', en: 'Heavy sweating, breathlessness, nausea or fainting' },
        { zh: '疼痛放射到左臂、下颌或后背', en: 'Pain spreading to the left arm, jaw or back' }
      ]
    },
    gi_bleed: {
      name: { zh: '上消化道出血', en: 'Upper gastrointestinal bleeding' },
      short: { zh: '呕血或黑便，需要急诊评估', en: 'Vomiting blood or black stools needs emergency assessment' },
      dept: { zh: '急诊 / 消化内科', en: 'Emergency / Gastroenterology' },
      urgency: 'emergency',
      why: { zh: '呕血、咖啡渣样呕吐物或黑便提示上消化道可能正在出血。出血量可能突然增大，不能在家观察。', en: 'Vomiting blood, coffee-ground material or black stools suggests active upper-GI bleeding. Bleeding can worsen suddenly; do not watch it at home.' },
      doNow: [
        { zh: '立即拨打 120 或去最近医院急诊。不要自己开车。', en: 'Call 120 or go to the nearest emergency department now. Do not drive yourself.' },
        { zh: '停止进食进水，保持侧卧或半坐位，避免呕吐误吸。', en: 'Stop eating and drinking. Lie on your side or sit propped up to avoid choking on vomit.' },
        { zh: '不要服用止痛药、阿司匹林、抗凝药或“止血”偏方，除非医生明确指示。', en: 'Do not take painkillers, aspirin, blood thinners or home “stop-bleeding” remedies unless a doctor tells you to.' },
        { zh: '带上正在服用的药物、既往胃病史和过敏史。', en: 'Bring your medicines, stomach history and allergy list.' }
      ],
      ask: [
        { zh: '需要紧急胃镜吗？什么时候做？', en: 'Do I need an urgent gastroscopy? When?' },
        { zh: '需要查血常规、凝血和输血吗？', en: 'Do I need a blood count, clotting tests or a transfusion?' },
        { zh: '哪些药物必须停，哪些不能停？', en: 'Which medicines must stop, and which must not?' }
      ],
      tests: [
        { zh: '血常规', en: 'Full blood count' },
        { zh: '凝血功能', en: 'Clotting tests' },
        { zh: '急诊胃镜（按病情）', en: 'Urgent gastroscopy if indicated' }
      ],
      watch: [
        { zh: '头晕、心慌、面色苍白', en: 'Dizziness, palpitations or pallor' },
        { zh: '再次呕血或黑便增多', en: 'More vomiting of blood or more black stools' },
        { zh: '意识模糊、出冷汗', en: 'Confusion or cold sweats' }
      ]
    },
    pancreatitis: {
      name: { zh: '急性胰腺炎（需要排除）', en: 'Acute pancreatitis (to be ruled out)' },
      short: { zh: '持续剧烈上腹痛，放射到后背', en: 'Severe persistent upper pain spreading to the back' },
      dept: { zh: '急诊', en: 'Emergency' },
      urgency: 'emergency',
      why: { zh: '持续剧烈上腹痛、放射到后背，伴恶心呕吐，酒后或暴饮暴食后出现，需要急诊排除胰腺炎。', en: 'Severe persistent upper-belly pain radiating to the back, with vomiting, after alcohol or a heavy meal, needs emergency assessment for pancreatitis.' },
      doNow: [
        { zh: '不要进食进水，立即去急诊。', en: 'Do not eat or drink. Go to emergency now.' },
        { zh: '不要自行吃止痛药，以免掩盖病情。', en: 'Do not take painkillers; they can hide the severity.' },
        { zh: '告诉医生是否有胆结石、高甘油三酯、饮酒史。', en: 'Tell the doctor about gallstones, high triglycerides or alcohol use.' }
      ],
      ask: [
        { zh: '需要查血淀粉酶/脂肪酶和腹部 CT 吗？', en: 'Do I need lipase/amylase and an abdominal CT?' },
        { zh: '需要禁食、补液或住院吗？', en: 'Do I need fasting, fluids or admission?' }
      ],
      tests: [
        { zh: '血淀粉酶 / 脂肪酶', en: 'Amylase / lipase' },
        { zh: '腹部超声 / CT', en: 'Abdominal ultrasound / CT' },
        { zh: '肝功能、血脂', en: 'Liver and lipid tests' }
      ],
      watch: [
        { zh: '疼痛持续加重', en: 'Pain that keeps worsening' },
        { zh: '呼吸急促、发热', en: 'Fast breathing or fever' },
        { zh: '无法进水、尿量减少', en: 'Cannot drink or passing little urine' }
      ]
    },
    ectopic: {
      name: { zh: '妇科急症（需排除宫外孕）', en: 'Gynaecological emergency (ectopic pregnancy to be ruled out)' },
      short: { zh: '怀孕 / 可能怀孕 + 腹痛或出血', en: 'Pregnancy or possible pregnancy + pain or bleeding' },
      dept: { zh: '急诊 / 妇产科', en: 'Emergency / Obstetrics & Gynaecology' },
      urgency: 'emergency',
      why: { zh: '育龄女性出现下腹痛、停经后阴道出血，需要急诊排除宫外孕等妇科急症。', en: 'Lower-belly pain or bleeding after a missed period needs emergency assessment for ectopic pregnancy and other gynaecological emergencies.' },
      doNow: [
        { zh: '立即去急诊；若晕厥、肩痛、冷汗，拨打 120。', en: 'Go to emergency now; call 120 if you faint, have shoulder pain or cold sweats.' },
        { zh: '不要自行吃止痛药或调经药。', en: 'Do not take painkillers or period-regulating remedies.' },
        { zh: '告诉医生：末次月经、是否可能怀孕、有无出血。', en: 'Tell the doctor your last period, pregnancy possibility and any bleeding.' }
      ],
      ask: [
        { zh: '需要查血 HCG 和妇科超声吗？', en: 'Do I need a pregnancy test and pelvic ultrasound?' },
        { zh: '需要留观或手术吗？', en: 'Do I need observation or surgery?' }
      ],
      tests: [
        { zh: '血 HCG', en: 'Beta-hCG' },
        { zh: '妇科超声', en: 'Pelvic ultrasound' },
        { zh: '血常规', en: 'Full blood count' }
      ],
      watch: [
        { zh: '晕厥、肩痛、冷汗', en: 'Fainting, shoulder pain or cold sweats' },
        { zh: '出血增多', en: 'Heavier bleeding' },
        { zh: '剧烈下腹痛', en: 'Severe lower-belly pain' }
      ]
    },
    gallbladder: {
      name: { zh: '胆结石 / 胆囊炎 / 胆道问题', en: 'Gallstones, cholecystitis or bile-duct problem' },
      short: { zh: '右上腹痛，向右肩背放射', en: 'Right-upper pain spreading to the right shoulder' },
      dept: { zh: '肝胆外科 / 消化内科', en: 'Hepatobiliary surgery / Gastroenterology' },
      urgency: 'today',
      why: { zh: '右上腹痛、吃油腻后加重、向右肩背放射，比“胃炎”更像胆囊/胆道问题。持续疼痛、发热寒战或黄疸需要今天就医。', en: 'Right-upper pain after fatty food, spreading to the right shoulder, is more typical of a gallbladder or bile-duct problem than gastritis. Persistent pain, fever/chills or jaundice needs same-day care.' },
      doNow: [
        { zh: '暂停油腻食物和酒精；疼痛持续或发热时今天就去医院。', en: 'Stop fatty food and alcohol. Go to hospital today if pain persists or you have fever.' },
        { zh: '不要自行“排石”或大量喝水；不要用力按摩右上腹。', en: 'Do not try home “stone flushing” or force large amounts of water. Do not massage the right upper belly.' },
        { zh: '就诊时要求评估腹部超声和肝功能。', en: 'Ask for an abdominal ultrasound and liver tests.' }
      ],
      ask: [
        { zh: '需要空腹腹部超声吗？', en: 'Do I need a fasting abdominal ultrasound?' },
        { zh: '肝功能、胆红素和炎症指标要查吗？', en: 'Should we check liver enzymes, bilirubin and inflammation markers?' },
        { zh: '需要外科评估或手术吗？', en: 'Do I need a surgical review or operation?' }
      ],
      tests: [
        { zh: '腹部超声', en: 'Abdominal ultrasound' },
        { zh: '肝功能 / 胆红素', en: 'Liver tests / bilirubin' },
        { zh: '血常规、CRP', en: 'Full blood count, CRP' }
      ],
      watch: [
        { zh: '发热寒战', en: 'Fever and shivering' },
        { zh: '皮肤眼白发黄', en: 'Yellow skin or eyes' },
        { zh: '疼痛持续超过 6 小时', en: 'Pain lasting more than 6 hours' }
      ]
    },
    reflux: {
      name: { zh: '胃食管反流病', en: 'Gastro-oesophageal reflux disease (GERD)' },
      short: { zh: '烧心、反酸、胸骨后灼热', en: 'Heartburn, sour taste, burning behind the breastbone' },
      dept: { zh: '消化内科', en: 'Gastroenterology' },
      urgency: 'soon',
      why: { zh: '烧心、反酸、躺下或饭后加重，是胃食管反流的典型线索。若伴吞咽困难、黑便、体重下降，需要尽快胃镜。', en: 'Heartburn, sour taste and worsening when lying down or after meals are typical of reflux. Trouble swallowing, black stools or weight loss need prompt gastroscopy.' },
      doNow: [
        { zh: '睡前 3 小时不进食；床头整体抬高 10–15 厘米，而不是只垫高枕头。', en: 'No food 3 hours before bed. Raise the head of the bed 10–15 cm, not just the pillow.' },
        { zh: '暂时减少酒精、咖啡、浓茶、油腻和过甜食物；少量多餐。', en: 'Cut back on alcohol, coffee, strong tea, fatty and very sweet food. Eat smaller meals.' },
        { zh: '不要自行长期吃抑酸药；先让医生评估疗程和原因。', en: 'Do not self-start long-term acid suppressants. Let a doctor assess the cause and duration.' }
      ],
      ask: [
        { zh: '需要胃镜吗？有没有报警症状？', en: 'Do I need a gastroscopy? Are there alarm features?' },
        { zh: '要检测幽门螺杆菌吗？', en: 'Should I be tested for H. pylori?' },
        { zh: '抑酸药要吃多久，怎么减停？', en: 'How long should acid suppression last, and how do I stop it?' }
      ],
      tests: [
        { zh: '胃镜（按报警症状）', en: 'Gastroscopy if alarm features' },
        { zh: '幽门螺杆菌检测', en: 'H. pylori test' },
        { zh: '必要时食管 pH 监测', en: 'Oesophageal pH study if needed' }
      ],
      watch: [
        { zh: '吞咽困难或进食哽噎', en: 'Trouble swallowing or food sticking' },
        { zh: '黑便、呕血', en: 'Black stools or vomiting blood' },
        { zh: '不明原因体重下降', en: 'Unexplained weight loss' }
      ]
    },
    gastritis: {
      name: { zh: '慢性胃炎 / 幽门螺杆菌相关', en: 'Chronic gastritis / H. pylori-related' },
      short: { zh: '上腹隐痛、胀满、嗳气、反酸', en: 'Upper-belly ache, fullness, belching or reflux' },
      dept: { zh: '消化内科 / 中医脾胃科', en: 'Gastroenterology / TCM digestive clinic' },
      urgency: 'soon',
      why: { zh: '上腹隐痛、胀满、嗳气、口臭或反酸，可能与慢性胃炎或幽门螺杆菌有关，但这些症状并不特异，需要医生结合检查判断。', en: 'Upper-belly ache, fullness, belching, bad breath or reflux may relate to chronic gastritis or H. pylori, but these symptoms are not specific. A doctor needs to assess you.' },
      doNow: [
        { zh: '规律三餐，减少辛辣、酒精、浓茶和长期空腹。', en: 'Eat regular meals. Reduce spicy food, alcohol, strong tea and long fasting.' },
        { zh: '不要自行长期吃止痛药 / 阿司匹林；需要时先和医生讨论胃保护。', en: 'Do not take painkillers or aspirin long-term on your own. Discuss stomach protection with a doctor.' },
        { zh: '若从未测过幽门螺杆菌，可在消化内科评估呼气试验。', en: 'If never tested, ask about a H. pylori breath test.' }
      ],
      ask: [
        { zh: '需要检测幽门螺杆菌吗？家人要一起查吗？', en: 'Should I test for H. pylori? Should my family be tested?' },
        { zh: '需要胃镜吗？', en: 'Do I need a gastroscopy?' },
        { zh: '我的止痛药 / 心血管药需要调整吗？', en: 'Do my painkillers or heart medicines need adjusting?' }
      ],
      tests: [
        { zh: '幽门螺杆菌呼气试验', en: 'H. pylori breath test' },
        { zh: '胃镜（按年龄和报警症状）', en: 'Gastroscopy depending on age and alarm features' },
        { zh: '血常规（查贫血）', en: 'Blood count for anaemia' }
      ],
      watch: [
        { zh: '黑便、呕血', en: 'Black stools or vomiting blood' },
        { zh: '体重下降、贫血', en: 'Weight loss or anaemia' },
        { zh: '40 岁后新发、持续加重', en: 'New or worsening symptoms after age 40' }
      ]
    },
    ulcer: {
      name: { zh: '消化性溃疡（需要排查）', en: 'Peptic ulcer (to be ruled out)' },
      short: { zh: '空腹痛、夜间痛，进食后缓解', en: 'Pain when hungry or at night, relieved by food' },
      dept: { zh: '消化内科', en: 'Gastroenterology' },
      urgency: 'today',
      why: { zh: '空腹或夜间上腹痛、进食后缓解，是十二指肠溃疡的常见线索。若伴黑便、呕血或突发剧痛，可能是出血或穿孔，必须急诊。', en: 'Upper pain when hungry or at night, relieved by food, is typical of a duodenal ulcer. Black stools, vomiting blood or sudden severe pain may mean bleeding or perforation — emergency care.' },
      doNow: [
        { zh: '规律进食，避免空腹太久；暂时戒烟酒、浓茶和辛辣。', en: 'Eat regularly and avoid long fasting. Stop smoking, alcohol, strong tea and spicy food for now.' },
        { zh: '不要自行停心血管药；先问医生。不要自行长期吃止痛药。', en: 'Do not stop heart medicines on your own. Ask a doctor. Avoid long-term painkillers.' },
        { zh: '尽快消化内科就诊，评估幽门螺杆菌和胃镜。', en: 'See Gastroenterology soon for H. pylori testing and gastroscopy.' }
      ],
      ask: [
        { zh: '需要胃镜和幽门螺杆菌检测吗？', en: 'Do I need a gastroscopy and H. pylori test?' },
        { zh: '需要停用阿司匹林 / 止痛药吗？', en: 'Should I stop aspirin or painkillers?' },
        { zh: '有没有出血或穿孔的危险信号？', en: 'Are there signs of bleeding or perforation?' }
      ],
      tests: [
        { zh: '胃镜', en: 'Gastroscopy' },
        { zh: '幽门螺杆菌检测', en: 'H. pylori test' },
        { zh: '血常规、便潜血', en: 'Blood count, stool occult blood' }
      ],
      watch: [
        { zh: '黑便、呕血', en: 'Black stools or vomiting blood' },
        { zh: '突发刀割样剧痛', en: 'Sudden knife-like pain' },
        { zh: '头晕、心慌、冷汗', en: 'Dizziness, palpitations or cold sweats' }
      ]
    },
    functional: {
      name: { zh: '功能性消化不良', en: 'Functional dyspepsia' },
      short: { zh: '反复餐后饱胀、早饱、上腹胀痛', en: 'Recurring fullness, early satiety or upper-belly ache' },
      dept: { zh: '消化内科 / 中医脾胃科 / 治未病科', en: 'Gastroenterology / TCM digestive / preventive clinic' },
      urgency: 'routine',
      why: { zh: '胃镜无明显器质性病变，但反复餐后饱胀、早饱、上腹胀痛或嗳气，常与进食节律、压力和睡眠有关。', en: 'The stomach may look normal on gastroscopy, yet fullness, early satiety, upper-belly ache or belching recur. Meal rhythm, stress and sleep often matter.' },
      doNow: [
        { zh: '三餐定时，七分饱，细嚼慢咽，避免一边工作一边吃。', en: 'Eat at regular times, stop at about 70% full, chew slowly, and avoid eating while working.' },
        { zh: '记录 3 天“症状—饮食—情绪”日记，找出反复加重的时间点。', en: 'Keep a 3-day symptom–food–mood diary to spot patterns.' },
        { zh: '饭后散步 10–15 分钟，避免立刻躺下或剧烈运动。', en: 'Take a 10–15 minute walk after meals; avoid lying down or hard exercise straight away.' }
      ],
      ask: [
        { zh: '需要胃镜或幽门螺杆菌检测吗？', en: 'Do I need a gastroscopy or H. pylori test?' },
        { zh: '有没有报警症状需要先排除？', en: 'Are there alarm features to rule out first?' },
        { zh: '需要药物，还是先做生活方式调整？', en: 'Do I need medicine, or should we start with lifestyle changes?' }
      ],
      tests: [
        { zh: '幽门螺杆菌检测', en: 'H. pylori test' },
        { zh: '胃镜（按医生判断）', en: 'Gastroscopy if advised' },
        { zh: '血常规、甲状腺功能（必要时）', en: 'Blood count, thyroid tests if needed' }
      ],
      watch: [
        { zh: '夜间痛醒', en: 'Waking at night with pain' },
        { zh: '体重下降、吞咽困难', en: 'Weight loss or trouble swallowing' },
        { zh: '黑便、呕血', en: 'Black stools or vomiting blood' }
      ]
    },
    gastroenteritis: {
      name: { zh: '急性胃肠炎', en: 'Acute gastroenteritis' },
      short: { zh: '恶心、呕吐、腹泻，常有不洁饮食', en: 'Nausea, vomiting, diarrhoea, often after suspect food' },
      dept: { zh: '消化内科 / 急诊', en: 'Gastroenterology / Emergency' },
      urgency: 'today',
      why: { zh: '多由病毒或细菌感染引起，表现为急性恶心、呕吐、腹泻、腹痛。重点不是立刻止泻，而是防脱水。', en: 'Usually viral or bacterial, causing sudden nausea, vomiting, diarrhoea and cramps. The priority is preventing dehydration, not instantly stopping the diarrhoea.' },
      doNow: [
        { zh: '少量多次补充口服补液盐或淡盐水，重点是防脱水。', en: 'Sip oral rehydration salts or lightly salted water often. Preventing dehydration is the priority.' },
        { zh: '吃清淡易消化的食物；不要自行使用强力止泻药，尤其发热或血便时。', en: 'Eat bland, easy food. Do not use strong anti-diarrhoeals, especially with fever or blood.' },
        { zh: '婴幼儿、老人、孕妇，或尿少、头晕、口干明显时，尽早就医。', en: 'Seek care early for infants, older adults, pregnancy, or if urine is low, dizziness or severe thirst.' }
      ],
      ask: [
        { zh: '需要查便常规、血常规或补液吗？', en: 'Do I need stool tests, blood tests or IV fluids?' },
        { zh: '要不要做粪便培养？', en: 'Do I need a stool culture?' },
        { zh: '哪些止泻药不能用？', en: 'Which anti-diarrhoeals should I avoid?' }
      ],
      tests: [
        { zh: '便常规 / 便培养', en: 'Stool tests / culture' },
        { zh: '血常规、电解质', en: 'Blood count, electrolytes' },
        { zh: '口服补液评估', en: 'Hydration assessment' }
      ],
      watch: [
        { zh: '尿量明显减少、口干、头晕', en: 'Very little urine, dry mouth or dizziness' },
        { zh: '血便、持续高热', en: 'Bloody stools or persistent high fever' },
        { zh: '意识模糊、站不稳', en: 'Confusion or unable to stand' }
      ]
    },
    ibs: {
      name: { zh: '肠易激综合征', en: 'Irritable bowel syndrome (IBS)' },
      short: { zh: '腹痛伴排便习惯改变', en: 'Belly pain with a change in bowel habit' },
      dept: { zh: '消化内科', en: 'Gastroenterology' },
      urgency: 'routine',
      why: { zh: '以腹痛伴排便习惯改变为特征的功能性肠病，排便后腹痛常缓解，可能与压力、饮食和肠道敏感有关。', en: 'A functional gut condition with belly pain and changed bowel habits. Pain often eases after a bowel movement and may relate to stress, food and gut sensitivity.' },
      doNow: [
        { zh: '记录排便日记，观察腹痛与排便、饮食、压力的关系。', en: 'Keep a bowel diary and look for links with food, stress and bowel movements.' },
        { zh: '规律作息，尝试缓慢腹式呼吸或轻量运动来降低压力。', en: 'Keep regular hours. Try slow belly breathing or light exercise to lower stress.' },
        { zh: '避免自行长期忌口；必要时在医生或营养师指导下调整膳食纤维。', en: 'Avoid long-term self-imposed elimination diets. Adjust fibre with a doctor or dietitian.' }
      ],
      ask: [
        { zh: '需要排除乳糖不耐受、乳糜泻或炎症吗？', en: 'Should we rule out lactose intolerance, coeliac disease or inflammation?' },
        { zh: '需要胃镜/肠镜吗？', en: 'Do I need endoscopy?' },
        { zh: '怎么调整膳食纤维和压力？', en: 'How should I adjust fibre and stress?' }
      ],
      tests: [
        { zh: '血常规、CRP', en: 'Blood count, CRP' },
        { zh: '乳糜泻筛查（必要时）', en: 'Coeliac screening if needed' },
        { zh: '结肠镜（按年龄和报警症状）', en: 'Colonoscopy depending on age and alarm features' }
      ],
      watch: [
        { zh: '便血、体重下降', en: 'Blood in stool or weight loss' },
        { zh: '夜间痛醒、发热', en: 'Waking at night with pain, or fever' },
        { zh: '40 岁后新发症状', en: 'New symptoms after age 40' }
      ]
    }
  };

  /* ---------- 中医证型 ---------- */
  WA.PATTERNS = {
    liver_qi: {
      name: { zh: '肝气犯胃', en: 'Liver qi invading the stomach' },
      desc: { zh: '情绪紧张、郁怒或思虑多时，胃脘胀痛、嗳气、胸闷叹息加重。中医认为“肝主疏泄”，情绪不畅会影响脾胃运化。', en: 'Stress, irritability or overthinking worsen upper-belly distension, belching and sighing. In TCM, constrained Liver qi affects Stomach and Spleen function.' },
      signs: [
        { zh: '症状随情绪波动', en: 'Symptoms follow your mood' },
        { zh: '嗳气、胸闷、喜欢叹气', en: 'Belching, chest tightness, sighing' },
        { zh: '压力大时胃胀明显', en: 'Bloating worse under stress' }
      ],
      advice: [
        { zh: '饭后慢走 10–15 分钟，配合缓慢腹式呼吸。', en: 'Walk slowly for 10–15 minutes after meals and practise slow belly breathing.' },
        { zh: '把压力事件和胃部不适记在同一张纸上，找出触发点。', en: 'Log stressful events next to symptoms to find triggers.' },
        { zh: '若焦虑持续影响睡眠和生活，考虑心理/精神科支持。', en: 'If anxiety keeps affecting sleep and daily life, consider mental-health support.' }
      ]
    },
    spleen_def: {
      name: { zh: '脾胃气虚', en: 'Spleen-Stomach qi deficiency' },
      desc: { zh: '脾胃运化无力，常见食少腹胀、饭后加重、乏力、大便溏、舌淡。多与长期节食、劳累或病后体虚有关。', en: 'Weak Spleen-Stomach transformation causes poor appetite, bloating after meals, fatigue, loose stools and a pale tongue. Often linked to long-term dieting, overwork or recovery from illness.' },
      signs: [
        { zh: '吃一点就胀、饭后困倦', en: 'Full after small meals, sleepy after eating' },
        { zh: '大便偏溏、容易乏力', en: 'Loose stools and low energy' },
        { zh: '舌淡、有齿痕', en: 'Pale tongue with teeth marks' }
      ],
      advice: [
        { zh: '规律三餐，保证主食和优质蛋白，不要长期过度节食。', en: 'Eat regular meals with staple carbs and good protein. Avoid long-term crash dieting.' },
        { zh: '选择温热、易消化的食物，少食生冷。', en: 'Choose warm, easy-to-digest food and limit cold or raw food.' },
        { zh: '饭后适当休息，避免立刻剧烈运动。', en: 'Rest briefly after meals; avoid hard exercise straight away.' }
      ]
    },
    damp_heat: {
      name: { zh: '湿热中阻', en: 'Damp-heat in the middle burner' },
      desc: { zh: '湿热蕴结中焦，常见胃脘灼痛、口苦口黏、大便黏滞、舌红苔黄腻。常与辛辣、油炸、酒精和熬夜有关。', en: 'Damp-heat obstructs the middle burner, causing burning upper pain, bitter or sticky mouth, sticky stools and a red tongue with yellow greasy coating. Linked to spicy/fried food, alcohol and late nights.' },
      signs: [
        { zh: '口苦、口黏、口气重', en: 'Bitter or sticky mouth, bad breath' },
        { zh: '大便黏滞、排不净', en: 'Sticky stools that feel incomplete' },
        { zh: '舌红、苔黄腻', en: 'Red tongue with yellow greasy coating' }
      ],
      advice: [
        { zh: '减少辛辣、油炸、酒精和含糖饮料。', en: 'Reduce spicy food, fried food, alcohol and sugary drinks.' },
        { zh: '饮食清淡，适量蔬菜和全谷物，避免暴饮暴食。', en: 'Eat lighter meals with vegetables and whole grains; avoid bingeing.' },
        { zh: '不要自行服用“清热祛湿”类中药，需由中医师辨证。', en: 'Do not self-prescribe “damp-clearing” herbs; a TCM practitioner should assess you.' }
      ]
    },
    stomach_cold: {
      name: { zh: '寒邪客胃 / 脾胃虚寒', en: 'Cold invading the Stomach / Spleen-Stomach deficiency cold' },
      desc: { zh: '寒主收引，胃气被遏。常见胃痛暴作或隐痛喜按、遇寒加重、得温则减、喜热饮、手脚凉、大便溏。', en: 'Cold contracts and obstructs Stomach qi. Pain may start suddenly or be a dull ache relieved by warmth and pressure, worse with cold, with cold hands/feet and loose stools.' },
      signs: [
        { zh: '喝冷水、吹空调后加重', en: 'Worse with cold drinks or air conditioning' },
        { zh: '热敷或喝温水会舒服', en: 'Better with a warm compress or warm water' },
        { zh: '手脚凉、大便偏溏', en: 'Cold hands and feet, loose stools' }
      ],
      advice: [
        { zh: '注意腹部和足部保暖，暂避生冷和冰饮。', en: 'Keep the belly and feet warm; avoid cold food and iced drinks.' },
        { zh: '少量多次喝温水，吃温热易消化的粥面。', en: 'Sip warm water and eat warm, easy-to-digest food.' },
        { zh: '不要用烈酒或过烫的热敷止痛；疼痛剧烈或持续请就医。', en: 'Do not use strong alcohol or very hot compresses for pain. Seek care if pain is severe or persistent.' }
      ]
    },
    yin_def: {
      name: { zh: '胃阴不足', en: 'Stomach yin deficiency' },
      desc: { zh: '胃阴亏虚、失于濡润。常见胃脘隐痛或灼痛、口干、饥不欲食、大便干、舌红少苔或有裂纹。', en: 'Depleted Stomach yin fails to moisten. Causes dull or burning upper pain, dry mouth, hunger without appetite, dry stools and a red tongue with little coating or cracks.' },
      signs: [
        { zh: '口干、想喝少量水', en: 'Dry mouth, wanting small sips' },
        { zh: '大便偏干、夜间不适', en: 'Dry stools, worse at night' },
        { zh: '舌红少苔或有裂纹', en: 'Red tongue, little coating or cracks' }
      ],
      advice: [
        { zh: '少量多次喝温水，选择温和、易消化的食物。', en: 'Sip warm water often; choose mild, easy-to-digest food.' },
        { zh: '避免辛辣、烧烤、酒精和熬夜。', en: 'Avoid spicy food, barbecue, alcohol and late nights.' },
        { zh: '口干明显、体重下降或吞咽困难时及时就医。', en: 'Seek care promptly for marked thirst, weight loss or trouble swallowing.' }
      ]
    },
    food_stag: {
      name: { zh: '饮食积滞', en: 'Food stagnation' },
      desc: { zh: '暴饮暴食或食积不化，胃气壅滞。常见脘腹胀满、嗳腐吞酸、恶心，舌苔厚腻。', en: 'Overeating or undigested food blocks Stomach qi, causing fullness, sour belching, nausea and a thick greasy coating.' },
      signs: [
        { zh: '饭后胀满明显、打嗝有食味', en: 'Marked fullness after meals, belching with food smell' },
        { zh: '反酸、恶心、不想再吃', en: 'Reflux, nausea, no appetite' },
        { zh: '舌苔厚腻', en: 'Thick greasy tongue coating' }
      ],
      advice: [
        { zh: '下一餐减量，选择清淡、温热、易消化的食物。', en: 'Make the next meal smaller and choose light, warm, easy food.' },
        { zh: '暂停油腻、甜食、酒精和夜宵，不要自行催吐。', en: 'Pause fatty food, sweets, alcohol and late-night snacks. Do not force vomiting.' },
        { zh: '不要用力按压腹部；胀痛持续或呕吐不止及时就医。', en: 'Do not press hard on the belly. Seek care if pain persists or vomiting will not stop.' }
      ]
    },
    blood_stasis: {
      name: { zh: '瘀血停胃', en: 'Blood stasis in the Stomach' },
      desc: { zh: '久病入络或出血后瘀阻。常见胃痛固定如刺、拒按，舌紫暗或有瘀点；黑便属于危险信号。', en: 'Long-standing illness or bleeding can cause stasis. Pain is fixed, stabbing and tender; the tongue may be purple or have spots. Black stools are a danger sign.' },
      signs: [
        { zh: '疼痛位置固定、像针刺', en: 'Fixed, stabbing pain' },
        { zh: '舌紫暗或有瘀点', en: 'Purple tongue or spots' },
        { zh: '黑便、呕血（危险信号）', en: 'Black stools or vomiting blood (danger)' }
      ],
      advice: [
        { zh: '固定刺痛、黑便或呕血都需要医生评估，不要自行活血化瘀。', en: 'Fixed stabbing pain, black stools or vomiting blood need medical assessment. Do not self-prescribe blood-moving herbs.' },
        { zh: '就诊时告知医生疼痛位置、黑便和用药史。', en: 'Tell the doctor the pain site, black stools and medicine history.' },
        { zh: '避免自行服用止痛药 / 阿司匹林。', en: 'Avoid painkillers or aspirin on your own.' }
      ]
    },
    balanced: {
      name: { zh: '线索不足 / 相对平和', en: 'Not enough clues / relatively balanced' },
      desc: { zh: '目前填写的信息不足以形成明显证型偏颇。可以从规律饮食、情绪和睡眠入手继续观察。', en: 'There is not enough information for a clear TCM pattern. Start with regular meals, mood and sleep, and keep observing.' },
      signs: [
        { zh: '症状不固定、时轻时重', en: 'Symptoms vary and come and go' },
        { zh: '没有明显寒热偏颇', en: 'No clear cold or heat pattern' }
      ],
      advice: [
        { zh: '规律三餐，七分饱，减少酒精、浓咖啡和夜宵。', en: 'Eat regular meals, stop at about 70% full, and reduce alcohol, strong coffee and late snacks.' },
        { zh: '记录 3 天症状日记，观察与饮食、情绪、睡眠的关系。', en: 'Keep a 3-day symptom diary and look at food, mood and sleep.' },
        { zh: '若症状持续 2 周以上或出现警示信号，就医评估。', en: 'If symptoms last over 2 weeks or alarm signs appear, seek medical care.' }
      ]
    }
  };

  /* ---------- 慢病与常用药 ---------- */
  WA.CHRONIC_OPTIONS = [
    { id: 'hypertension', label: { zh: '高血压', en: 'High blood pressure' } },
    { id: 'diabetes', label: { zh: '糖尿病', en: 'Diabetes' } },
    { id: 'coronary', label: { zh: '冠心病 / 心绞痛', en: 'Coronary heart disease / angina' } },
    { id: 'arrhythmia', label: { zh: '心律失常 / 房颤', en: 'Arrhythmia / atrial fibrillation' } },
    { id: 'stroke', label: { zh: '脑卒中 / 中风史', en: 'Stroke history' } },
    { id: 'asthma', label: { zh: '哮喘 / 慢阻肺', en: 'Asthma / COPD' } },
    { id: 'liver', label: { zh: '慢性肝病', en: 'Chronic liver disease' } },
    { id: 'kidney', label: { zh: '慢性肾病', en: 'Chronic kidney disease' } },
    { id: 'gastritis', label: { zh: '慢性胃炎 / 胃溃疡', en: 'Chronic gastritis / ulcer' } },
    { id: 'gallstone', label: { zh: '胆结石 / 胆囊炎', en: 'Gallstones / cholecystitis' } },
    { id: 'other', label: { zh: '其他慢病', en: 'Other chronic condition' } },
    { id: 'none', label: { zh: '没有', en: 'None' } },
    { id: 'unsure', label: { zh: '不清楚', en: 'Not sure' } }
  ];

  WA.MED_GROUPS = {
    hypertension: {
      label: { zh: '降压药', en: 'Blood-pressure medicines' },
      items: [
        { id: 'acei_arb', label: { zh: '普利类 / 沙坦类（如依那普利、缬沙坦）', en: 'ACE inhibitor / ARB (e.g. enalapril, valsartan)' } },
        { id: 'ccb', label: { zh: '地平类（如氨氯地平）', en: 'Calcium-channel blocker (e.g. amlodipine)' } },
        { id: 'beta', label: { zh: '洛尔类（如美托洛尔）', en: 'Beta-blocker (e.g. metoprolol)' }, stomachRisk: false },
        { id: 'diuretic', label: { zh: '利尿剂（如氢氯噻嗪）', en: 'Diuretic (e.g. hydrochlorothiazide)' } },
        { id: 'aspirin', label: { zh: '阿司匹林（小剂量）', en: 'Low-dose aspirin' }, stomachRisk: true }
      ]
    },
    diabetes: {
      label: { zh: '降糖药', en: 'Diabetes medicines' },
      items: [
        { id: 'metformin', label: { zh: '二甲双胍', en: 'Metformin' } },
        { id: 'insulin', label: { zh: '胰岛素', en: 'Insulin' } },
        { id: 'sglt2', label: { zh: '列净类（如达格列净）', en: 'SGLT2 inhibitor (e.g. dapagliflozin)' } },
        { id: 'glp1', label: { zh: 'GLP-1 受体激动剂', en: 'GLP-1 agonist' } },
        { id: 'sulfonylurea', label: { zh: '磺脲类（如格列美脲）', en: 'Sulfonylurea (e.g. glimepiride)' } }
      ]
    },
    coronary: {
      label: { zh: '冠心病用药', en: 'Heart medicines' },
      items: [
        { id: 'aspirin', label: { zh: '阿司匹林', en: 'Aspirin' }, stomachRisk: true },
        { id: 'clopidogrel', label: { zh: '氯吡格雷 / 替格瑞洛', en: 'Clopidogrel / ticagrelor' }, stomachRisk: true },
        { id: 'statin', label: { zh: '他汀类（如阿托伐他汀）', en: 'Statin (e.g. atorvastatin)' } },
        { id: 'beta', label: { zh: '洛尔类（如美托洛尔）', en: 'Beta-blocker (e.g. metoprolol)' } },
        { id: 'nitrate', label: { zh: '硝酸酯类（如硝酸甘油）', en: 'Nitrate (e.g. nitroglycerin)' } }
      ]
    },
    arrhythmia: {
      label: { zh: '心律 / 抗凝药', en: 'Rhythm / blood-thinner medicines' },
      items: [
        { id: 'anticoag', label: { zh: '抗凝药（华法林、利伐沙班等）', en: 'Anticoagulant (warfarin, rivaroxaban, etc.)' }, stomachRisk: true },
        { id: 'beta', label: { zh: '洛尔类', en: 'Beta-blocker' } },
        { id: 'amiodarone', label: { zh: '胺碘酮', en: 'Amiodarone' } }
      ]
    },
    stroke: {
      label: { zh: '卒中二级预防', en: 'Stroke prevention' },
      items: [
        { id: 'aspirin', label: { zh: '阿司匹林', en: 'Aspirin' }, stomachRisk: true },
        { id: 'clopidogrel', label: { zh: '氯吡格雷', en: 'Clopidogrel' }, stomachRisk: true },
        { id: 'anticoag', label: { zh: '抗凝药', en: 'Anticoagulant' }, stomachRisk: true },
        { id: 'statin', label: { zh: '他汀类', en: 'Statin' } }
      ]
    },
    asthma: {
      label: { zh: '呼吸科用药', en: 'Respiratory medicines' },
      items: [
        { id: 'inhaler', label: { zh: '吸入激素 / 支气管扩张剂', en: 'Inhaled steroid / bronchodilator' } },
        { id: 'oral_steroid', label: { zh: '口服激素（如泼尼松）', en: 'Oral steroid (e.g. prednisone)' }, stomachRisk: true }
      ]
    },
    liver: {
      label: { zh: '肝病用药', en: 'Liver medicines' },
      items: [
        { id: 'antiviral', label: { zh: '抗病毒药', en: 'Antiviral' } },
        { id: 'diuretic', label: { zh: '利尿剂', en: 'Diuretic' } },
        { id: 'lactulose', label: { zh: '乳果糖', en: 'Lactulose' } }
      ]
    },
    kidney: {
      label: { zh: '肾病用药', en: 'Kidney medicines' },
      items: [
        { id: 'acei_arb', label: { zh: '普利类 / 沙坦类', en: 'ACE inhibitor / ARB' } },
        { id: 'diuretic', label: { zh: '利尿剂', en: 'Diuretic' } },
        { id: 'phosphate', label: { zh: '磷结合剂', en: 'Phosphate binder' } }
      ]
    },
    gastritis: {
      label: { zh: '胃药', en: 'Stomach medicines' },
      items: [
        { id: 'ppi', label: { zh: '抑酸药（奥美拉唑、雷贝拉唑等）', en: 'Acid suppressant (omeprazole, rabeprazole, etc.)' } },
        { id: 'antacid', label: { zh: '抗酸药 / 胃黏膜保护剂', en: 'Antacid / mucosal protectant' } },
        { id: 'hp', label: { zh: '幽门螺杆菌根除方案', en: 'H. pylori eradication regimen' } }
      ]
    },
    gallstone: {
      label: { zh: '胆道用药', en: 'Biliary medicines' },
      items: [
        { id: 'udca', label: { zh: '熊去氧胆酸', en: 'Ursodeoxycholic acid' } }
      ]
    },
    other: {
      label: { zh: '其他长期用药', en: 'Other long-term medicines' },
      items: [
        { id: 'nsaid', label: { zh: '止痛药 / 布洛芬 / 双氯芬酸', en: 'Painkillers / ibuprofen / diclofenac' }, stomachRisk: true },
        { id: 'steroid', label: { zh: '激素（如泼尼松）', en: 'Steroid (e.g. prednisone)' }, stomachRisk: true },
        { id: 'supplement', label: { zh: '保健品', en: 'Supplements' } },
        { id: 'weightloss', label: { zh: '减肥药 / 代餐', en: 'Weight-loss drugs / meal replacements' } },
        { id: 'tcm', label: { zh: '中药 / 中成药', en: 'Chinese herbal medicine' } }
      ]
    }
  };

  WA.GENERAL_MEDS = [
    { id: 'nsaid', label: { zh: '止痛药 / 布洛芬 / 双氯芬酸', en: 'Painkillers / ibuprofen / diclofenac' }, stomachRisk: true },
    { id: 'aspirin', label: { zh: '阿司匹林', en: 'Aspirin' }, stomachRisk: true },
    { id: 'steroid', label: { zh: '激素（如泼尼松）', en: 'Steroid (e.g. prednisone)' }, stomachRisk: true },
    { id: 'anticoag', label: { zh: '抗凝药 / 抗血小板药', en: 'Anticoagulant / antiplatelet' }, stomachRisk: true },
    { id: 'supplement', label: { zh: '保健品', en: 'Supplements' } },
    { id: 'weightloss', label: { zh: '减肥药 / 代餐', en: 'Weight-loss drugs / meal replacements' } },
    { id: 'tcm', label: { zh: '中药 / 中成药', en: 'Chinese herbal medicine' } }
  ];

  /* ---------- 养胃小课 ---------- */
  WA.LEARN = [
    {
      id: 'seventy', category: 'food', icon: 'leaf', time: 2,
      title: { zh: '七分饱，到底是多少？', en: 'What does “70% full” actually mean?' },
      dek: { zh: '不是算卡路里，是学会在“还能再吃几口”时放下筷子。', en: 'It is not calorie maths. It is learning to stop while you could still eat a few more bites.' },
      body: [
        { zh: '胃的饱感有延迟。吃到“不饿了，但还能再吃几口”时，通常已经接近七分饱。再吃 10 分钟，往往会变成“撑”。', en: 'Fullness signals lag behind eating. When you are “not hungry but could eat a little more”, you are probably near 70%. Ten more minutes often turns that into “stuffed”.' },
        { zh: '一个可操作的做法：先把这一餐的量盛好，吃到一半停 2 分钟，喝两口水，再决定要不要继续。', en: 'A practical trick: plate the portion first, pause for 2 minutes halfway through, sip water, then decide whether to continue.' },
        { zh: '如果你经常饭后胀、嗳气、反酸，先连续 7 天记录“几分饱”和症状，而不是立刻买胃药。', en: 'If you often feel full, belch or reflux after meals, track “fullness level” and symptoms for 7 days before buying stomach medicine.' }
      ],
      source: { zh: '参考：中国居民膳食指南与消化科生活方式建议', en: 'Based on Chinese dietary guidelines and gastroenterology lifestyle advice' }
    },
    {
      id: 'reflux_sleep', category: 'food', icon: 'breath', time: 2,
      title: { zh: '反酸的人，怎么睡？', en: 'How to sleep with reflux' },
      dek: { zh: '抬高床头，不是把枕头垫高；睡前 3 小时别再进食。', en: 'Raise the head of the bed, not just the pillow. No food 3 hours before bed.' },
      body: [
        { zh: '只垫高枕头会让脖子弯着，胃和食管仍然在同一水平，反而不舒服。更好的做法是把床头整体抬高 10–15 厘米。', en: 'Stacking pillows bends your neck but keeps the stomach and oesophagus level. Better: raise the whole head of the bed by 10–15 cm.' },
        { zh: '晚餐少吃一点，睡前 3 小时不进食；如果夜间反酸明显，左侧卧通常比右侧卧更舒服。', en: 'Eat a lighter dinner and stop eating 3 hours before bed. If night reflux is bad, lying on your left side often feels better than the right.' },
        { zh: '若每周反酸超过 2 次、影响睡眠，或出现吞咽困难、黑便、体重下降，去消化内科评估。', en: 'If reflux happens more than twice a week, disturbs sleep, or comes with trouble swallowing, black stools or weight loss, see Gastroenterology.' }
      ],
      source: { zh: '参考：胃食管反流病基层诊疗指南', en: 'Based on primary-care guidelines for GERD' }
    },
    {
      id: 'emotion', category: 'mind', icon: 'heart', time: 3,
      title: { zh: '思虑伤脾：情绪真的会影响胃', en: 'Overthinking hurts the Spleen: mood and your gut' },
      dek: { zh: '“气得胃疼”不是矫情，脑和肠之间有一条真实的对话通道。', en: '“Stomach pain from stress” is not imaginary. The brain and gut really do talk.' },
      body: [
        { zh: '中医说“思伤脾”“怒伤肝，肝气犯胃”，现代医学则把它部分解释为脑-肠轴：压力会改变胃酸、胃肠蠕动和内脏敏感度。', en: 'TCM describes overthinking as injuring the Spleen and anger as Liver qi invading the Stomach. Modern medicine partly explains this through the brain–gut axis: stress changes acid, motility and gut sensitivity.' },
        { zh: '如果你发现“一紧张就胃胀、一生气就反酸”，先记录触发点，再练 4 秒吸气、6 秒呼气的慢呼吸，每天 3 次，每次 2 分钟。', en: 'If tension brings bloating and anger brings reflux, log the triggers. Then practise 4-second inhale, 6-second exhale, three times a day for 2 minutes.' },
        { zh: '情绪支持不是“替代看病”。持续焦虑、抑郁或失眠，值得找心理/精神科帮忙。', en: 'Mood support is not a substitute for medical care. Persistent anxiety, depression or insomnia deserves professional help.' }
      ],
      source: { zh: '参考：《黄帝内经》情志理论；脑-肠轴研究综述', en: 'Based on Huangdi Neijing emotion theory and brain–gut axis reviews' }
    },
    {
      id: 'painkillers', category: 'safety', icon: 'pill', time: 2,
      title: { zh: '胃痛别乱吃止痛药', en: 'Do not reach for painkillers for stomach pain' },
      dek: { zh: '布洛芬、双氯芬酸、阿司匹林都可能伤胃；有些还会掩盖出血。', en: 'Ibuprofen, diclofenac and aspirin can hurt the stomach — and hide bleeding.' },
      body: [
        { zh: '非甾体抗炎药（NSAIDs）会削弱胃黏膜保护。空腹吃、长期吃、和激素或抗凝药一起用，风险更高。', en: 'NSAIDs weaken the stomach’s protective lining. Risk rises with empty-stomach use, long-term use, steroids or blood thinners.' },
        { zh: '如果医生让你长期吃阿司匹林或抗凝药，不要自行停；但要把胃痛、黑便、反酸告诉医生，讨论是否需要胃保护。', en: 'If a doctor prescribed aspirin or an anticoagulant, do not stop it yourself. Tell them about stomach pain, black stools or reflux and ask about protection.' },
        { zh: '剧烈腹痛时，止痛药可能掩盖阑尾炎、穿孔、胰腺炎或心梗的信号。先就医，再谈止痛。', en: 'With severe belly pain, painkillers can mask appendicitis, perforation, pancreatitis or a heart attack. Get assessed first.' }
      ],
      source: { zh: '参考：NSAIDs 相关胃肠损伤防治专家共识', en: 'Based on expert consensus on NSAID-related GI injury' }
    },
    {
      id: 'gastroscopy', category: 'care', icon: 'search', time: 3,
      title: { zh: '胃镜，没有传说中可怕', en: 'Gastroscopy is not as scary as its reputation' },
      dek: { zh: '大多数检查 5–10 分钟；可以选择无痛胃镜。', en: 'Most tests take 5–10 minutes, and sedation is an option.' },
      body: [
        { zh: '胃镜是发现胃炎、溃疡、早癌和出血原因最直接的方法。医生会根据年龄、症状、报警信号和家族史决定要不要做。', en: 'Gastroscopy is the most direct way to find gastritis, ulcers, early cancer and bleeding. Doctors decide based on age, symptoms, alarm signs and family history.' },
        { zh: '普通胃镜会有恶心、流泪的感觉，但通常很快；如果特别紧张，可以问是否有无痛胃镜。检查前需空腹，具体按医院要求。', en: 'Unscented gastroscopy can cause retching and tears but is usually quick. If you are very anxious, ask about sedation. You will need to fast; follow the hospital’s instructions.' },
        { zh: '不要因为“怕难受”一直拖。持续上腹不适、黑便、体重下降、吞咽困难，越早查越主动。', en: 'Do not delay because of fear. Persistent upper-belly symptoms, black stools, weight loss or trouble swallowing are reasons to check early.' }
      ],
      source: { zh: '参考：消化内镜诊疗规范与胃癌早筛建议', en: 'Based on endoscopy standards and gastric-cancer screening guidance' }
    },
    {
      id: 'music', category: 'tcm', icon: 'music', time: 2,
      title: { zh: '中医音乐疗法，怎么听才放松', en: 'How to use music for calm, the TCM way' },
      dek: { zh: '不是“听歌治病”，是用节律和呼吸把身体从警报状态里带出来。', en: 'It is not music as cure. It uses rhythm and breathing to bring the body out of alarm mode.' },
      body: [
        { zh: '中医有“五音入五脏”的说法，现代研究也发现舒缓音乐可以降低交感神经兴奋、减轻焦虑和疼痛感受。', en: 'TCM links five tones to five organs. Modern research also finds that calming music can reduce sympathetic arousal and ease anxiety and pain perception.' },
        { zh: '选 60–80 拍/分钟、没有强烈鼓点的纯音乐，音量调到“刚好听见”。配合 4 秒吸气、6 秒呼气，听 5–10 分钟即可。', en: 'Choose instrumental music at 60–80 bpm without heavy drums, at “just audible” volume. Pair with 4-second inhale and 6-second exhale for 5–10 minutes.' },
        { zh: '音乐不能替代急救。胸痛、呕血、黑便、晕厥时，先拨打 120，再谈放松。', en: 'Music never replaces emergency care. With chest pain, vomiting blood, black stools or fainting, call 120 first.' }
      ],
      source: { zh: '参考：《黄帝内经》五音理论；音乐干预辅助镇痛研究', en: 'Based on Huangdi Neijing five-tone theory and music-intervention research' }
    },
    {
      id: 'hpylori', category: 'care', icon: 'shield', time: 2,
      title: { zh: '幽门螺杆菌阳性，全家都要查吗？', en: 'H. pylori positive — should the whole family be tested?' },
      dek: { zh: '不是所有家人都必须查；但共同餐具、密切接触会增加家庭内传播。', en: 'Not every family member must be tested, but shared utensils and close contact increase household spread.' },
      body: [
        { zh: '幽门螺杆菌与慢性胃炎、消化性溃疡和部分胃癌相关。是否根除，要结合症状、胃镜、年龄和家族史由医生判断。', en: 'H. pylori is linked to chronic gastritis, ulcers and some gastric cancers. Whether to eradicate depends on symptoms, gastroscopy, age and family history.' },
        { zh: '如果一个人阳性且有胃病或胃癌家族史，医生可能会建议同住成年家人检测。儿童是否检测要听儿科/消化科意见。', en: 'If one person is positive with stomach disease or family history, doctors may suggest testing adult household members. Testing children needs paediatric/gastro advice.' },
        { zh: '不要自行买“杀菌套餐”。方案、疗程和复查都有讲究，乱吃药会增加耐药。', en: 'Do not buy a DIY “H. pylori kit”. Regimens, duration and retesting matter; unnecessary antibiotics drive resistance.' }
      ],
      source: { zh: '参考：幽门螺杆菌感染处理共识', en: 'Based on H. pylori management consensus' }
    }
  ];

  /* ---------- 医院搜索 ---------- */
  WA.HOSPITAL_SPECIALTIES = {
    cardiac: { zh: '心内科 / 胸痛中心', en: 'Cardiology / Chest Pain Centre', query: { zh: '心内科 胸痛中心 医院', en: 'cardiology chest pain centre hospital' } },
    gallbladder: { zh: '肝胆外科 / 消化内科', en: 'Hepatobiliary surgery / Gastroenterology', query: { zh: '肝胆外科 医院', en: 'hepatobiliary surgery hospital' } },
    gi: { zh: '消化内科', en: 'Gastroenterology', query: { zh: '消化内科 医院', en: 'gastroenterology hospital' } },
    tcm: { zh: '中医脾胃科 / 治未病科', en: 'TCM digestive / preventive clinic', query: { zh: '中医脾胃科 医院', en: 'TCM digestive clinic hospital' } },
    emergency: { zh: '急诊', en: 'Emergency', query: { zh: '急诊 医院', en: 'emergency hospital' } }
  };
})();
