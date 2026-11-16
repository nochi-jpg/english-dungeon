// ===== 英単語ダンジョン（リメイク版）=====
// 2025年版（絵文字・縦画面）を、主観視点のドラクエ風バトルに作りなおしたもの。
// 敵の絵は 過去作 nochi-jpg/manabi-dragon のボス、問題は nochi-jpg/manabi-resource の英語（questions.js）
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = n => Math.floor(Math.random() * n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- 設定（レベルデザイン） ----------
  const PLAYER_MAX = 2000;
  const TIMER = 20;                 // 問題の制限時間（秒）
  const MODES = {
    normal: { name: 'NORMAL', label: 'ノーマル', hpMul: 1, dmgMul: 1, lvShift: 0, failDmg: 100 },
    hard:   { name: 'HARD',   label: 'ハード',   hpMul: 1.5, dmgMul: 1.5, lvShift: 1, failDmg: 200 },
  };
  // コマンド：lv＝問題のレベル、unlock＝クリアしたステージ数、mul＝残り秒数にかける数
  const CMDS = [
    { id: 'fight',   name: 'たたかう',       en: 'Fight',         lv: 1, unlock: 0, mul: 15,  ok: 'Correct! 英語ソードで きりつけた！' },
    { id: 'guard',   name: 'まもる',         en: 'Guard',         lv: 1, unlock: 0, mul: 0,   ok: 'Correct! ガードせいこう！ つぎの ダメージを 半分にする！' },
    { id: 'special', name: 'ひっさつ',       en: 'Special',       lv: 2, unlock: 2, mul: 30,  ok: 'Correct! ひっさつ、英語ソード・三連斬！！' },
    { id: 'heal',    name: 'かいふく',       en: 'Heal',          lv: 2, unlock: 2, mul: 15,  ok: 'Correct! ばんそうこう！' },
    { id: 'gheal',   name: 'すごいかいふく', en: 'Great recovery', lv: 3, unlock: 4, mul: 50,  ok: 'Correct! すごいかいふく、エリクサー！' },
    { id: 'ult',     name: 'おうぎ',         en: 'Ultimate',      lv: 3, unlock: 4, mul: 120, ok: 'Correct! おうぎ・四連撃！！！' },
  ];
  // 敵。acts：random＝どれかをランダム、loop＝順番にくりかえす。dmg＝こちらへのダメージ、heal＝敵の回復、kind＝モーション
  const ENEMIES = [
    { img: 'images/enemy/shakai.png', bg: 'images/bg/battle1.png', name: 'かみなり小僧ライト', en: 'Thunder Kid', hp: 500, pattern: 'random',
      acts: [{ m: 'せいでんきが ビリッときた！', en: 'Static shock!', dmg: 100, kind: 'attack' },
             { m: 'ノートパソコンで ゲームをしている…', en: 'He is playing a game.', kind: 'idle' }] },
    { img: 'images/enemy/rika.png', bg: 'images/bg/battle1.png', name: 'やくそう少女ミドリ', en: 'Herb Girl', hp: 800, pattern: 'random',
      acts: [{ m: 'へんな くすりを かけてきた！', en: 'Yuck!', dmg: 150, kind: 'attack' },
             { m: '花に 水を やっている…', en: 'She is watering flowers.', kind: 'idle' }] },
    { img: 'images/enemy/sansu.png', bg: 'images/bg/battle2.png', name: '水の博士カズマ', en: 'Water Doctor', hp: 1200, pattern: 'random',
      acts: [{ m: 'みずでっぽう！', en: 'Splash!', dmg: 200, kind: 'attack' },
             { m: 'けいさんを している…', en: 'He is calculating.', kind: 'idle' }] },
    { img: 'images/enemy/kokugo.png', bg: 'images/bg/battle2.png', name: 'ほのおの魔女コトハ', en: 'Fire Witch', hp: 2500, pattern: 'random',
      acts: [{ m: 'ファイアボール！', en: 'So hot!', dmg: 250, kind: 'attack' },
             { m: 'まほうの本を 読んでいる…', en: 'She is reading a book.', heal: 300, kind: 'heal' }] },
    { img: 'images/enemy/devil.png', bg: 'images/bg/battle3.png', name: '悪魔公ヴァルツ', en: 'Devil Duke', hp: 6000, pattern: 'loop',
      acts: [{ m: 'つめを といでいる… 3', en: 'Sharpening his claws.', kind: 'idle' },
             { m: 'つばさを 広げた… 2', en: 'Spreading his wings.', kind: 'charge' },
             { m: 'こちらを にらんでいる！… 1', en: "I'm scared!", kind: 'charge' },
             { m: 'ダークドレイン！ HPを すいとられた！', en: 'Drain!', dmg: 1200, heal: 1200, kind: 'attack' }] },
    { img: 'images/enemy/last.png', bg: 'images/bg/last.png', name: '忘却の天使ワスレーヌ', en: 'The Angel of Oblivion', hp: 12000, pattern: 'loop', boss: true,
      acts: [{ m: 'ひかりを ためている！', en: 'What are you doing?', kind: 'charge' },
             { m: 'ホーリーレイ！', en: 'Flash!', dmg: 700, kind: 'attack' },
             { m: 'ひかりを ためている！', en: 'What are you doing?', kind: 'charge' },
             { m: 'ホーリーレイ！', en: 'Flash!', dmg: 700, kind: 'attack' },
             { m: 'いのりを ささげている…', en: 'She is praying.', heal: 2500, kind: 'heal' },
             { m: 'つばさが ふるえている… 2', en: 'Are you okay?', kind: 'charge' },
             { m: 'てんしの めが ひかった！… 1', en: 'The face is scary!', kind: 'charge' },
             { m: 'ワールドエンド！', en: "I don't want this to end.", dmg: 1500, kind: 'attack' },
             { m: 'いのりを ささげている…', en: 'She is praying.', heal: 2500, kind: 'heal' }] },
  ];
  // ハードのラスボス（ステージ6を差しかえる）
  const HARD_LAST = { img: 'images/enemy/kurogane.png', bg: 'images/bg/space.png', name: '剣聖クロガネ', en: 'The Sword Saint', hp: 14000, pattern: 'loop', boss: true,
      acts: [{ m: 'けんを かまえている…', en: 'En garde.', kind: 'charge' },
             { m: 'いあいぎり！', en: 'Slash!', dmg: 700, kind: 'attack' },
             { m: 'きあいを ためている！', en: 'He is focusing.', heal: 1500, kind: 'heal' },
             { m: 'れんぞくぎり！', en: 'Double slash!', dmg: 800, kind: 'attack' },
             { m: 'けんが あおく ひかった… 2', en: 'The sword is glowing.', kind: 'charge' },
             { m: 'さっきが ふくれあがる！… 1', en: 'Here it comes!', kind: 'charge' },
             { m: 'てんはざん！！', en: 'Final strike!', dmg: 1600, kind: 'attack' },
             { m: 'きあいを ためている！', en: 'He is focusing.', heal: 1500, kind: 'heal' }] };

  const HOWTO = [
    [['たたかう', 'Fight', 'レベル1の問題。正解で 残り秒数×15 のダメージ'],
     ['まもる', 'Guard', 'レベル1の問題。正解で つぎの敵のこうげきが 半分'],
     ['ひっさつ', 'Special', 'ステージ2クリアで 使える。レベル2の問題。残り秒数×30 のダメージ'],
     ['かいふく', 'Heal', 'ステージ2クリアで 使える。レベル2の問題。残り秒数×15 かいふく'],
     ['すごいかいふく', 'Great recovery', 'ステージ4クリアで 使える。レベル3の問題。残り秒数×50 かいふく'],
     ['おうぎ', 'Ultimate', 'ステージ4クリアで 使える。レベル3の問題。残り秒数×120 のダメージ']],
    [['ルール', 'Rules', 'コマンドをえらぶと 英単語の4択問題が出る。20秒いないに 正解すると 行動がせいこう'],
     ['しっぱい', 'Miss', 'まちがえるか 時間切れになると、すきをつかれて 自分がダメージを受ける'],
     ['レベル', 'Level', 'レベル1＝小3・4年、レベル2＝小5年、レベル3＝小6年の英単語'],
     ['ステージ', 'Stage', '全6ステージ。ラスボスを たおせば ゲームクリア！'],
     ['ハード', 'Hard', '敵が強くなり、問題のレベルが1つ上がる。ラスボスも ちがう'],
     ['スコア', 'Score', '速く正解するほど 高得点。たおした敵と 残りHPで ボーナス']],
  ];

  // ---------- 音 ----------
  const SND = { bgm: true, se: true, el: {} };
  try { const s = JSON.parse(localStorage.getItem('ed_snd') || '{}'); if (s.bgm === false) SND.bgm = false; if (s.se === false) SND.se = false; } catch (e) { }
  function saveSnd() { try { localStorage.setItem('ed_snd', JSON.stringify({ bgm: SND.bgm, se: SND.se })); } catch (e) { } }
  function se(k) {
    if (!SND.se || !window.ED_SE || !ED_SE[k]) return;
    try { const a = (SND.el[k] = SND.el[k] || new Audio(ED_SE[k])).cloneNode(); a.volume = 0.7; a.play().catch(() => { }); } catch (e) { }
  }
  let wantBgm = null;
  function bgm(k) {
    wantBgm = k;
    if (!window.ED || !ED.chip) return;
    if (!SND.bgm || !k) { ED.chip.stop(); return; }
    if (ED.chip.playing === k) return;
    ED.chip.play(k, 0.45);
  }
  function refreshSndBtn() {
    $('bBgm').textContent = 'BGM ' + (SND.bgm ? 'ON' : 'OFF'); $('bBgm').classList.toggle('off', !SND.bgm);
    $('bSe').textContent = 'SE ' + (SND.se ? 'ON' : 'OFF'); $('bSe').classList.toggle('off', !SND.se);
  }
  $('bBgm').onclick = () => { SND.bgm = !SND.bgm; saveSnd(); refreshSndBtn(); if (SND.bgm) { const k = wantBgm; wantBgm = null; bgm(k); } else ED.chip.stop(); };
  $('bSe').onclick = () => { SND.se = !SND.se; saveSnd(); refreshSndBtn(); se('tap'); };
  // さいしょのタップで鳴らしはじめる
  addEventListener('pointerdown', () => { if (wantBgm && SND.bgm && ED.chip && ED.chip.playing !== wantBgm) setTimeout(() => bgm(wantBgm), 50); }, true);

  // ---------- 画面の大きさ ----------
  function fit() {
    const w = innerWidth, h = innerHeight, s = Math.min(w / 1280, h / 720);
    $('stage').style.transform = `scale(${s})`;
    $('rotate').style.display = (w < h && w < 700) ? 'flex' : 'none';
  }
  addEventListener('resize', fit); fit();

  // ---------- 問題 ----------
  const pools = { 1: [], 2: [], 3: [] };
  function nextQ(lv) {
    lv = clamp(lv, 1, 3);
    if (!pools[lv].length) { pools[lv] = ED_Q[String(lv)].slice(); for (let i = pools[lv].length - 1; i > 0; i--) { const j = rnd(i + 1); [pools[lv][i], pools[lv][j]] = [pools[lv][j], pools[lv][i]]; } }
    const [q, c] = pools[lv].pop();
    const ans = c[0], ch = c.slice(); for (let i = ch.length - 1; i > 0; i--) { const j = rnd(i + 1); [ch[i], ch[j]] = [ch[j], ch[i]]; }
    return { q, ch, ans };
  }

  // ---------- ハイスコア ----------
  function loadHS() { try { return JSON.parse(localStorage.getItem('ed_hiscore') || '{}'); } catch (e) { return {}; } }
  function hsList(mode) { const h = loadHS(); return (h[mode] || []).slice().sort((a, b) => b.s - a.s).slice(0, 5); }
  function hsRank(mode, s) { const l = hsList(mode); if (s <= 0) return -1; const i = l.findIndex(x => s > x.s); return i < 0 ? (l.length < 5 ? l.length : -1) : i; }
  function hsAdd(mode, rec) { const h = loadHS(); h[mode] = (h[mode] || []); h[mode].push(rec); h[mode].sort((a, b) => b.s - a.s); h[mode] = h[mode].slice(0, 5); try { localStorage.setItem('ed_hiscore', JSON.stringify(h)); } catch (e) { } }

  // ---------- オートセーブ・クリアのきろく ----------
  function loadProg() { try { return JSON.parse(localStorage.getItem('ed_prog') || '{}'); } catch (e) { return {}; } }
  function setProg(k) { const p = loadProg(); p[k] = true; try { localStorage.setItem('ed_prog', JSON.stringify(p)); } catch (e) { } }
  function loadSave() { try { const s = JSON.parse(localStorage.getItem('ed_save') || 'null'); return s && MODES[s.mode] ? s : null; } catch (e) { return null; } }
  function autoSave() {
    if (G.over) return;
    const s = { mode: G.mode, stage: G.stage, php: G.php, ehp: G.ehp, score: G.score, kills: G.kills, correct: G.correct, miss: G.miss, actIdx: G.actIdx, guard: G.guard };
    try { localStorage.setItem('ed_save', JSON.stringify(s)); } catch (e) { }
  }
  function clearSave() { try { localStorage.removeItem('ed_save'); } catch (e) { } }

  // ---------- ページ切りかえ ----------
  function page(id) { ['battle', 'title', 'result'].forEach(p => $(p).classList.toggle('on', p === id)); }
  function sub(id) { ['howto', 'hiscore'].forEach(p => $(p).classList.toggle('on', p === id)); $('menu').style.display = id ? 'none' : 'block'; $('logo').style.display = id ? 'none' : 'block'; }

  // ---------- メッセージ ----------
  const msgEl = $('msg');
  let lines = [];
  let skipTyping = false;
  async function say(jp, en, wait) {
    // 3行まで。英語は青で2行目に出す（1つのメッセージで 日本語＋英語）
    const t = en ? `${jp}\n<span class="en">${en}</span>` : jp;
    lines.push(t); while (lines.join('\n').split('\n').length > 3) lines.shift();
    msgEl.innerHTML = lines.join('\n');
    while (lines.length > 1 && msgEl.scrollHeight > 136) { lines.shift(); msgEl.innerHTML = lines.join('\n'); }
    // タイプライター風：最後の行だけ ふわっと出す
    await sleep(wait == null ? 650 : wait);
  }
  function clearMsg() { lines = []; msgEl.innerHTML = ''; }
  function waitClick() {
    return new Promise(res => {
      $('next').style.display = 'block';
      const h = e => { if (e.type === 'keydown' && !['Enter', ' ', 'ArrowRight'].includes(e.key)) return; cleanup(); res(); };
      const cleanup = () => { $('next').style.display = 'none'; $('stage').removeEventListener('pointerdown', h); removeEventListener('keydown', h); };
      setTimeout(() => { $('stage').addEventListener('pointerdown', h); addEventListener('keydown', h); }, 150);
    });
  }

  // ---------- 演出 ----------
  const scene = $('scene'), enemy = $('enemy'), fx = $('fx');
  function anim(el, cls, ms) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }
  const cam = (cls, ms) => anim(scene, cls, ms);
  const flash = (id, ms) => anim($(id), 'go', ms);
  function slash(deg, gold, dx, dy) {
    const d = document.createElement('div'); d.className = 'slash' + (gold ? ' gold' : ''); d.style.setProperty('--r', deg + 'deg');
    d.style.left = (640 + (dx || 0)) + 'px'; d.style.top = (300 + (dy || 0)) + 'px'; fx.appendChild(d); setTimeout(() => d.remove(), 500);
  }
  function popDmg(txt, x, y, cls) { const d = document.createElement('div'); d.className = 'dmg ' + (cls || ''); d.textContent = txt; d.style.left = x + 'px'; d.style.top = y + 'px'; fx.appendChild(d); setTimeout(() => d.remove(), 1100); }
  function sparks(n) { for (let i = 0; i < n; i++) { const s = document.createElement('div'); s.className = 'spark'; s.style.left = (300 + rnd(680)) + 'px'; s.style.top = (380 + rnd(140)) + 'px'; s.style.animationDelay = (rnd(40) * 10) + 'ms'; fx.appendChild(s); setTimeout(() => s.remove(), 1600); } }
  function enemyHit() { anim(enemy, 'hit', 480); }

  // ---------- ゲームの状態 ----------
  const G = { mode: 'normal', stage: 0, php: PLAYER_MAX, ehp: 0, emax: 0, enemy: null, actIdx: 0, guard: false, score: 0, kills: 0, correct: 0, miss: 0, busy: false, over: false };
  const M = () => MODES[G.mode];
  function stageList() { const l = ENEMIES.slice(); if (G.mode === 'hard') l[5] = HARD_LAST; return l; }

  function drawHP() {
    $('php').textContent = G.php; const pr = G.php / PLAYER_MAX * 100;
    $('pg').style.width = pr + '%'; $('pg').className = pr <= 25 ? 'low' : pr <= 50 ? 'mid' : '';
    $('ehp').textContent = G.ehp; const er = G.emax ? G.ehp / G.emax * 100 : 0;
    $('eg').style.width = er + '%'; $('eg').className = er <= 25 ? 'low' : er <= 50 ? 'mid' : '';
    $('score').textContent = G.score; $('stg').textContent = `STAGE ${Math.min(G.stage + 1, 6)}/6`; $('mode').textContent = M().name;
  }
  function addScore(n) { G.score += n; drawHP(); }

  function drawCmds() {
    const box = $('cmds'); box.innerHTML = '';
    CMDS.forEach(c => {
      const b = document.createElement('button'); b.className = 'cmd';
      const locked = G.kills < c.unlock;
      if (locked) { b.classList.add('lock'); b.innerHTML = '<span>－－－－－<small>？？？</small></span>'; }
      else { b.innerHTML = `<span>${c.name}<small>${c.en}</small></span>`; if (c.unlock >= 4) b.classList.add('glow'); b.onclick = () => choose(c); }
      box.appendChild(b);
    });
  }
  function cmdsOn(on) { $('cwin').classList.toggle('off', !on); }

  // ---------- クイズ ----------
  let timerId = 0;
  function quiz(lv) {
    return new Promise(res => {
      const q = nextQ(lv); const qw = $('qwin'); qw.classList.add('on'); $('cwin').style.display = 'none'; $('mwin').style.display = 'none';
      $('qtext').textContent = q.q; $('qlv').textContent = 'レベル' + clamp(lv, 1, 3);
      const chs = $('chs'); chs.innerHTML = '';
      let left = TIMER, done = false; const t0 = performance.now();
      const tn = $('tnum'), tg = $('tg'); tn.textContent = TIMER; tn.className = ''; tg.className = ''; tg.style.width = '100%';
      const finish = async (okIdx, pickedEl) => {
        if (done) return; done = true; clearInterval(timerId);
        const remain = Math.max(0, Math.ceil(left)); const ok = okIdx >= 0 && q.ch[okIdx] === q.ans;
        [...chs.children].forEach((el, i) => { el.classList.add('done'); if (q.ch[i] === q.ans) el.classList.add('ok'); });
        if (pickedEl && !ok) pickedEl.classList.add('ng');
        se(ok ? 'ok' : 'ng');
        await sleep(ok ? 500 : 1100);
        qw.classList.remove('on'); $('cwin').style.display = ''; $('mwin').style.display = '';
        res({ ok, remain, ans: q.ans, timeout: okIdx < 0 });
      };
      q.ch.forEach((c, i) => { const b = document.createElement('button'); b.className = 'ch'; b.textContent = c; b.onclick = () => finish(i, b); chs.appendChild(b); });
      timerId = setInterval(() => {
        left = TIMER - (performance.now() - t0) / 1000;
        const s = Math.max(0, Math.ceil(left)); tn.textContent = s; tg.style.width = Math.max(0, left / TIMER * 100) + '%';
        if (s <= 5) { tn.className = 'hot'; tg.className = 'hot'; }
        if (left <= 0) finish(-1, null);
      }, 100);
    });
  }

  // ---------- プレイヤーの行動 ----------
  async function choose(c) {
    if (G.busy || G.over) return; G.busy = true; cmdsOn(false); se('decide');
    await say(`${c.name}！`, c.en, 300);
    const r = await quiz(c.lv + M().lvShift);
    if (!r.ok) {
      G.miss++;
      await say(r.timeout ? `じかんぎれ！ せいかいは「${r.ans}」` : `ざんねん！ せいかいは「${r.ans}」`, 'Oops!', 700);
      await hurt(M().failDmg, 'すきを つかれた！');
      if (!G.over) await enemyTurn();
      endTurn(); return;
    }
    G.correct++; addScore(r.remain * 10);
    const s = r.remain;
    if (c.id === 'fight') { await say(c.ok, null, 150); await swordAttack(1, false); await damageEnemy(c.mul * s); }
    else if (c.id === 'special') { await say(c.ok, null, 150); await swordAttack(3, false); await damageEnemy(c.mul * s); }
    else if (c.id === 'ult') { await say(c.ok, null, 150); $('dark').classList.add('on'); $('bg').classList.add('dark'); await swordAttack(4, true); $('dark').classList.remove('on'); $('bg').classList.remove('dark'); await damageEnemy(c.mul * s, true); }
    else if (c.id === 'guard') { await say(c.ok, null, 150); G.guard = true; anim($('shield'), 'up', 1250); se('good'); await sleep(900); }
    else if (c.id === 'heal' || c.id === 'gheal') { await say(c.ok, null, 150); await healMe(c.mul * s); }
    if (G.ehp <= 0) { await defeat(); endTurn(); return; }
    await enemyTurn();
    endTurn();
  }
  function endTurn() { G.busy = false; if (!G.over) { autoSave(); cmdsOn(true); } }

  async function swordAttack(n, ult) {
    for (let i = 0; i < n; i++) {
      cam('lunge', 560); anim($('sword'), ult ? 'ult' : 'swing', ult ? 500 : 460);
      await sleep(200);
      se('hit'); enemyHit(); slash((i % 2 ? 30 : -35) + rnd(10), ult, rnd(60) - 30, rnd(60) - 30);
      if (ult) { flash('flash', 350); cam('shake', 500); }
      await sleep(ult ? 420 : 380);
    }
    if (ult) { cam('zoom', 1100); flash('flash', 350); await sleep(400); }
  }
  async function damageEnemy(d, ult) {
    d = Math.round(d); G.ehp = Math.max(0, G.ehp - d); popDmg(String(d), 640 + rnd(80) - 40, 200, ult ? 'ult' : ''); drawHP(); addScore(Math.round(d / 10));
    await say(`${G.enemy.name}に ${d} のダメージ！`, null, 600);
  }
  async function healMe(h) {
    h = Math.round(h); const before = G.php; G.php = Math.min(PLAYER_MAX, G.php + h); const real = G.php - before;
    se('good'); flash('green', 900); sparks(26); popDmg('+' + real, 180, 130, 'heal'); drawHP();
    await say(`HPが ${real} かいふくした！`, null, 700);
  }
  async function hurt(d, why) {
    d = Math.round(d);
    if (G.guard) { d = Math.round(d / 2); G.guard = false; await say('ガードで ダメージを 半分に した！', null, 450); }
    G.php = Math.max(0, G.php - d); se('shock'); flash('red', 550); cam('shake', 500); anim($('pwin'), 'shake', 400); popDmg(String(d), 180, 130, 'me'); drawHP();
    await say(`${why ? why + ' ' : ''}ゆうしゃは ${d} のダメージ！`, null, 700);
    if (G.php <= 0) await gameOver();
  }

  // ---------- 敵の行動 ----------
  async function enemyTurn() {
    if (G.over || G.ehp <= 0) return;
    const e = G.enemy; let a;
    if (e.pattern === 'random') a = e.acts[rnd(e.acts.length)]; else { a = e.acts[G.actIdx % e.acts.length]; G.actIdx++; }
    await sleep(250);
    if (a.kind === 'attack') {
      await say(`${e.name}の こうげき！`, null, 350);
      anim(enemy, 'lunge', 900); await sleep(470);
      await say(a.m, a.en, 0);
      await hurt(a.dmg * M().dmgMul, '');
      if (a.heal) { G.ehp = Math.min(G.emax, G.ehp + Math.round(a.heal * M().hpMul)); anim(enemy, 'heal', 1000); se('good'); popDmg('+' + Math.round(a.heal * M().hpMul), 640, 200, 'heal'); drawHP(); await say(`${e.name}の HPが かいふくした！`, null, 600); }
    } else if (a.kind === 'heal') {
      anim(enemy, 'heal', 1000); se('good');
      const h = Math.round(a.heal * M().hpMul); G.ehp = Math.min(G.emax, G.ehp + h); popDmg('+' + h, 640, 200, 'heal'); drawHP();
      await say(a.m, a.en, 500); await say(`${e.name}の HPが ${h} かいふくした！`, null, 600);
    } else if (a.kind === 'charge') {
      anim(enemy, 'charge', 1000); se('tap'); await say(a.m, a.en, 1000);
    } else { anim(enemy, 'idleact', 900); await say(a.m, a.en, 1000); }
    G.guard = false;
  }

  // ---------- ステージの進行 ----------
  async function startStage(resume) {
    const list = stageList(); const e = G.enemy = list[G.stage];
    G.emax = Math.round(e.hp * M().hpMul); G.ehp = G.emax; G.actIdx = 0; G.guard = false;
    if (resume) { G.ehp = clamp(resume.ehp, 1, G.emax); G.actIdx = resume.actIdx || 0; G.guard = !!resume.guard; }
    $('bg').style.backgroundImage = `url(${e.bg})`; $('bg').classList.remove('dark');
    enemy.className = 'hide'; enemy.src = e.img; $('ename').textContent = e.name; drawHP(); drawCmds(); cmdsOn(false); clearMsg();
    bgm(e.boss ? 'boss' : 'battle');
    await sleep(500);
    // ドラクエ風：チラチラして あらわれる
    for (let i = 0; i < 4; i++) { enemy.className = 'show'; await sleep(70); enemy.className = 'hide'; await sleep(70); }
    enemy.className = 'show'; se('decide');
    if (resume) await say(`${e.name}との たたかいを さいかいした！`, 'Continue!', 800);
    else {
      await say(`${e.name}が あらわれた！`, e.en, 800);
      if (e.boss) { anim(enemy, 'charge', 1000); await say('すさまじい きを かんじる…！', null, 700); }
    }
    await say('コマンドを えらぼう！', null, 100);
    G.busy = false; autoSave(); cmdsOn(true);
  }
  async function defeat() {
    const e = G.enemy; se('ko'); enemy.classList.add('die'); flash('flash', 350);
    G.kills++; const bonus = (G.stage + 1) * 300; addScore(bonus);
    await say(`${e.name}を たおした！`, 'You win!', 900);
    await say(`ボーナス ${bonus} てん！`, null, 300);
    if (G.stage === 5) { await sleep(700); await gameClear(); return; }
    await waitClick();
    if (G.kills === 2) { se('cheer'); clearMsg(); await say('レベルアップ！', 'Level up!', 500); await say('「ひっさつ」と「かいふく」を おぼえた！', null, 300); await waitClick(); }
    if (G.kills === 4) { se('cheer'); clearMsg(); await say('レベルアップ！', 'Level up!', 500); await say('「おうぎ」と「すごいかいふく」を おぼえた！', null, 300); await waitClick(); }
    G.stage++; await startStage();
  }
  async function gameClear() {
    G.over = true; cmdsOn(false); bgm('win'); se('cheer'); clearSave(); setProg(G.mode === 'hard' ? 'hardClear' : 'normalClear');
    const hpBonus = G.php; addScore(hpBonus + 3000);
    await say('ダンジョンを せいは した！', 'Congratulations!', 900);
    await say(`クリアボーナス 3000 ＋ のこりHP ${hpBonus}！`, null, 300);
    await waitClick(); showResult(true);
  }
  async function gameOver() {
    G.over = true; cmdsOn(false); bgm('lose'); clearSave();
    await say('ゆうしゃは たおれてしまった…', 'Game over...', 900);
    await waitClick(); showResult(false);
  }

  // ---------- リザルト ----------
  function showResult(win) {
    page('result'); $('rbg').style.backgroundImage = `url(${win ? 'images/bg/result.png' : 'images/bg/battle3.png'})`;
    const t = $('rtitle'); t.textContent = win ? 'ゲームクリア！' : 'ゲームオーバー'; t.className = win ? 'clear' : 'lose';
    const rows = [['モード', M().label], ['とうたつステージ', `${Math.min(G.stage + 1, 6)} / 6`], ['たおした敵', `${G.kills} たい`], ['正解 / ミス', `${G.correct} / ${G.miss}`]];
    $('rrows').innerHTML = rows.map(r => `<div class="rrow"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('') + `<div class="rrow total"><span>スコア</span><span>${G.score}</span></div>`;
    const rank = hsRank(G.mode, G.score);
    $('nameRow').style.visibility = rank >= 0 ? 'visible' : 'hidden'; $('rSave').style.display = rank >= 0 ? '' : 'none'; $('rSave').disabled = false;
    $('rankNote').textContent = rank === 0 ? 'ハイスコア！' : `${rank + 1}いに ランクイン！`; $('rname').value = '';
  }
  $('rSave').onclick = () => { const n = ($('rname').value.trim() || 'ゆうしゃ').slice(0, 10); hsAdd(G.mode, { n, s: G.score, st: Math.min(G.stage + 1, 6), d: new Date().toISOString().slice(0, 10) }); $('rSave').disabled = true; $('rankNote').textContent = 'きろくした！'; se('good'); };
  $('rRetry').onclick = () => { se('decide'); startGame(G.mode); };
  $('rTitle').onclick = () => { se('tap'); showTitle(); };

  // ---------- タイトル ----------
  function showTitle() {
    page('title'); sub(null); bgm('title');
    const pr = loadProg();
    $('tbg').style.backgroundImage = `url(${pr.hardClear ? 'images/bg/title_star.png' : pr.normalClear ? 'images/bg/title_sunset.png' : 'images/bg/title_sky.png'})`;
    const sv = loadSave(); const mc = $('miCont');
    mc.style.display = sv ? '' : 'none';
    if (sv) mc.innerHTML = `つづきから<small>${MODES[sv.mode].name} STAGE ${sv.stage + 1}</small>`;
    $('menu').style.height = (sv ? 336 : 276) + 'px'; $('menu').style.top = (sv ? 336 : 366) + 'px';
    const hb = document.querySelector('#menu .mi[data-go="hard"]');
    hb.classList.toggle('lock', !pr.normalClear);
    hb.innerHTML = pr.normalClear ? 'ハードモード<small>HARD</small>' : '？？？？？？<small>CLEAR NORMAL</small>';
  }
  document.querySelectorAll('#menu .mi').forEach(b => b.onclick = () => {
    const go = b.dataset.go;
    if (go === 'hard' && !loadProg().normalClear) { se('ng'); return; }
    se('decide');
    if (go === 'continue') { const sv = loadSave(); if (sv) startGame(sv.mode, sv); else showTitle(); }
    else if (go === 'normal' || go === 'hard') startGame(go);
    else if (go === 'howto') { howPage = 0; drawHow(); sub('howto'); }
    else { drawHS(); sub('hiscore'); }
  });
  let howPage = 0;
  function drawHow() {
    const p = HOWTO[howPage]; $('howPage').textContent = `${howPage + 1}/${HOWTO.length}`;
    $('howBody').innerHTML = `<div class="hrow h"><span>${howPage === 0 ? 'コマンド' : 'こうもく'}</span><span>English</span><span>せつめい</span></div>` +
      p.map(r => `<div class="hrow"><span>${r[0]}</span><span class="en">${r[1]}</span><span>${r[2]}</span></div>`).join('');
    $('howPrev').disabled = howPage === 0; $('howNext').disabled = howPage === HOWTO.length - 1;
  }
  $('howPrev').onclick = () => { howPage--; drawHow(); se('tap'); }; $('howNext').onclick = () => { howPage++; drawHow(); se('tap'); };
  $('howBack').onclick = () => { sub(null); se('tap'); }; $('hsBack').onclick = () => { sub(null); se('tap'); };
  function drawHS() {
    const mk = (mode, label) => { const l = hsList(mode); let h = `<div class="hs t">${label}</div><div class="hs h"><span></span><span>なまえ</span><span class="r">スコア</span></div>`; for (let i = 0; i < 5; i++) { const r = l[i]; h += `<div class="hs"><span>${i + 1}.</span><span>${r ? r.n + `　<small style="color:#9cf">ST${r.st}</small>` : '－－－'}</span><span class="r">${r ? r.s : '－'}</span></div>`; } return h; };
    $('hsN').innerHTML = mk('normal', 'ノーマル'); $('hsH').innerHTML = mk('hard', 'ハード');
  }

  // ---------- ゲーム開始 ----------
  function startGame(mode, resume) {
    Object.assign(G, { mode, stage: 0, php: PLAYER_MAX, score: 0, kills: 0, correct: 0, miss: 0, busy: true, over: false, guard: false });
    if (resume) Object.assign(G, { stage: clamp(resume.stage | 0, 0, 5), php: clamp(resume.php, 1, PLAYER_MAX), score: resume.score | 0, kills: resume.kills | 0, correct: resume.correct | 0, miss: resume.miss | 0 });
    pools[1] = []; pools[2] = []; pools[3] = [];
    page('battle'); refreshSndBtn(); startStage(resume);
  }

  // 画像の先読み
  [...ENEMIES, HARD_LAST].forEach(e => { new Image().src = e.img; new Image().src = e.bg; });
  ['images/bg/result.png', 'images/bg/title_sunset.png', 'images/bg/title_star.png'].forEach(s => { new Image().src = s; });
  if (location.search.includes('debug')) window.EDG = G;
  refreshSndBtn(); showTitle();
})();
