// точка входа. сюда позже добавим что нужно.
// если используешь плавающие иконки - подключай их тут:
// import './icons.js' - для простого HTML это не работает без сборки,
// значит просто добавь еще один <script src="js/icons.js" defer></script> в index.html ниже main.js

// --- Tabs + swipe + lazy loader unified ---
(function(){
  const tabs = Array.from(document.querySelectorAll('.top-nav .tab'));
  const group = document.getElementById('panelGroup');
  if (!tabs.length || !group) return;

  const panels = Array.from(group.querySelectorAll('.panel'));
  const cache = new Map();

  // ---------- Enhancements (forms + memes) ----------
  function attachEnhancements(scope){
    attachForm(scope);
    attachMemes(scope);
  }

  function attachForm(scope){
    const form = scope.querySelector('#contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = (fd.get('name') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const message = (fd.get('message') || '').toString().trim();
      if (!name || !email || !message) { alert('Please fill all fields'); return; }
      const subject = encodeURIComponent('Kotan site contact');
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      const mailto = `mailto:me@kotan.pro?subject=${subject}&body=${body}`;
      window.location.href = mailto;
    }, { once: true });
  }

  function attachMemes(scope){
    const grid = scope.querySelector('#memesGrid');
    if (!grid || scope.dataset.memesBound) return;
    scope.dataset.memesBound = '1';

    const btn = scope.querySelector('#memesRefresh');
    const tabsLocal = Array.from(document.querySelectorAll('.top-nav .tab'));
    const memesIndex = tabsLocal.findIndex(a => a.getAttribute('href') === '#memes');

    const MAX_ITEMS = 30;
    const allowExt = /\.(jpg|jpeg|png|gif|webp)$/i;
    const subs = ['catmemes','meow_irl','CatsStandingUp','catswhoyell','IllegallySmolCats'];
    const queue = [];            // rendered (latest-first)
    const seenSession = new Set();
    const pool = [];             // pre-fetched
    const LS_KEY = 'kotan_memes_seen_v1';

    const todayKey = new Date().toISOString().slice(0,10);
    let seenPersist = {};
    try { seenPersist = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(e){}
    if (seenPersist.date !== todayKey) { seenPersist = { date: todayKey, urls: [] }; }
    const seenGlobal = new Set(seenPersist.urls || []);

    function saveSeen(){
      try {
        seenPersist.urls = Array.from(seenGlobal).slice(-500);
        localStorage.setItem(LS_KEY, JSON.stringify(seenPersist));
      } catch(e){}
    }
    const norm = (url='') => (url || '').replace(/&amp;/g, '&');
    const isGood = (url) => !!url && allowExt.test(url);
    function shuffle(arr){
      for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
      return arr;
    }

    function makeCard(url, title, href){
      const a = document.createElement('a');
      a.href = href || url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer nofollow';
      const img = document.createElement('img');
      img.src = url;
      img.alt = title || 'cat meme';
      img.className = 'meme-img';
      img.referrerPolicy = 'no-referrer';
      const card = document.createElement('div');
      card.className = 'meme-card';
      a.appendChild(img); card.appendChild(a);
      return card;
    }

    function skeleton(n=12){
      grid.innerHTML = '';
      for(let i=0;i<n;i++){ const d=document.createElement('div'); d.className='meme-skeleton'; grid.appendChild(d); }
    }

    function render(){
      grid.innerHTML = '';
      const n = Math.min(queue.length, MAX_ITEMS);
      for(let i=0;i<n;i++){ const it=queue[i]; grid.appendChild(makeCard(it.url, it.title, it.postLink || it.source)); }
      if (n < 12){ for(let i=n;i<12;i++){ const d=document.createElement('div'); d.className='meme-skeleton'; grid.appendChild(d); } }
    }

    function push(it){
      if (!it || !isGood(it.url)) return false;
      if (seenSession.has(it.url) || seenGlobal.has(it.url)) return false;
      queue.unshift(it); seenSession.add(it.url); seenGlobal.add(it.url);
      while(queue.length > MAX_ITEMS) queue.pop();
      render(); saveSeen(); return true;
    }

    // Multi-source bulk
    async function fromMemeApiBulk(){
      const url = `https://meme-api.com/gimme/${subs.join(',')}/60?_=${Date.now()}`;
      const r = await fetch(url, { cache: 'no-store' }); const j = await r.json();
      return (j.memes || []).map(x => ({ url: norm(x.url), title: x.title, postLink: x.postLink, source: 'meme-api' })).filter(x => isGood(x.url));
    }
    async function fromRedditBulk(){
      const multi=subs.join('+');
      const url = `https://www.reddit.com/r/${multi}/top.json?limit=100&t=week&_=${Date.now()}`;
      const r = await fetch(url, { cache: 'no-store' }); const j = await r.json();
      return (j.data?.children || []).map(c => c.data).map(d => ({
        url: norm(d.url_overridden_by_dest || d.url || (d.preview?.images?.[0]?.source?.url) || ''),
        title: d.title, postLink: 'https://reddit.com'+d.permalink, source: 'reddit'
      })).filter(x => isGood(x.url));
    }
    async function fromCatApiBulk(){
      const url=`https://api.thecatapi.com/v1/images/search?limit=40&mime_types=jpg,png,gif&_=${Date.now()}`;
      const r=await fetch(url,{cache:'no-store'}); const j=await r.json();
      return (j||[]).map(x=>({ url:norm(x.url), title:'cat', postLink:x.url, source:'thecatapi' })).filter(x=>isGood(x.url));
    }

    async function fillPool(){
      let a=[],b=[],c=[]; try{a=await fromMemeApiBulk();}catch(e){} try{b=await fromRedditBulk();}catch(e){} try{c=await fromCatApiBulk();}catch(e){}
      const merged = shuffle([...a,...b,...c]); const seenTmp=new Set(); pool.length=0;
      for(const it of merged){ if(!isGood(it.url)) continue; if(seenTmp.has(it.url)||seenSession.has(it.url)||seenGlobal.has(it.url)) continue; seenTmp.add(it.url); pool.push(it); }
    }

    async function prime(){
      skeleton(12); await fillPool();
      let guard=0; while(queue.length<MAX_ITEMS && pool.length && guard<MAX_ITEMS*3){ const it=pool.shift(); if(it) push(it); guard++; }
      render();
      if (queue.length < 12){ await fillPool(); let g2=0; while(queue.length<12 && pool.length && g2<50){ const it=pool.shift(); if(it) push(it); g2++; } render(); }
    }

    async function tick(){
      const idx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-index')) || 0;
      if (idx !== memesIndex) return;
      if (!pool.length) await fillPool();
      const it = pool.shift(); if (it) push(it);
    }

    // init + timers
    prime();
    if (btn) btn.addEventListener('click', async () => { await fillPool(); await tick(); });
    if (!window.__memesMinuteTimer){ window.__memesMinuteTimer = setInterval(tick, 60 * 1000); }
    window.addEventListener('hashchange', async () => {
      const idx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-index')) || 0;
      if (idx === memesIndex && !pool.length) await fillPool();
    });
  }

  // ---------- Panel loader & router ----------
  async function loadIntoIndex(i){
    if (i < 0 || i >= panels.length) return;
    const panel = panels[i];
    const src = panel.getAttribute('data-src');
    if (!src) return;
    if (cache.has(src)) { panel.innerHTML = cache.get(src); attachEnhancements(panel); return; }
    try{
      const res = await fetch(src, { cache: 'no-store' });
      const html = await res.text();
      panel.innerHTML = html;
      cache.set(src, html);
      attachEnhancements(panel);
    }catch(err){
      panel.innerHTML = '<div class="panel-inner"><h2>Error</h2><p>Could not load content.</p></div>';
    }
  }

  function preloadAround(i){ [i, i-1, i+1].forEach(loadIntoIndex); }

  function setActiveByIndex(i){
    document.documentElement.style.setProperty('--panel-index', i);
    tabs.forEach((t, idx) => t.classList.toggle('is-active', idx === i));
    loadIntoIndex(i);
    preloadAround(i);
  }

  function indexFromHash(){
    const id = (location.hash || '#home').replace('#','');
    const idx = tabs.findIndex(a => a.getAttribute('href') === '#' + id);
    return idx >= 0 ? idx : 0;
  }

  // Init
  if (!location.hash) { history.replaceState(null, '', '#home'); }
  setActiveByIndex(indexFromHash());

  tabs.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', a.getAttribute('href'));
      setActiveByIndex(i);
    });
  });

  window.addEventListener('hashchange', () => { const i = indexFromHash(); setActiveByIndex(i); });

  // Optional: horizontal wheel (desktop)
  let wheelBlock = false;
  group.addEventListener('wheel', (e) => {
    if (wheelBlock) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-index')) || 0;
      const dir = e.deltaX > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(tabs.length - 1, current + dir));
      if (next !== current) {
        const target = tabs[next].getAttribute('href');
        history.replaceState(null, '', target);
        setActiveByIndex(next);
        wheelBlock = true;
        setTimeout(() => wheelBlock = false, 400);
      }
      e.preventDefault();
    }
  }, { passive: false });

  // ---------- Touch swipe (mobile) ----------
  (function addTouchSwipe(){
    let startX=0, startY=0, dx=0, dy=0, active=false, locked=false;
    const threshold = 40; // px
    const restraint = 18; // vertical tolerance

    function currentIndex(){
      return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-index')) || 0;
    }

    group.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY; dx = dy = 0; active = true; locked = false;
    }, { passive: true });

    group.addEventListener('touchmove', (e) => {
      if (!active || !e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      dx = t.clientX - startX;
      dy = t.clientY - startY;
      // horizontal intent
      if (!locked && Math.abs(dx) > Math.abs(dy) + restraint){
        locked = true;
      }
      if (locked) e.preventDefault(); // block vertical scroll during horizontal swipe
    }, { passive: false });

    group.addEventListener('touchend', () => {
      if (!active) return;
      active = false;
      if (!locked) return;
      const i = currentIndex();
      if (Math.abs(dx) > threshold){
        const dir = dx < 0 ? 1 : -1;
        const next = Math.max(0, Math.min(tabs.length-1, i + dir));
        if (next !== i){
          const target = tabs[next].getAttribute('href');
          history.replaceState(null, '', target);
          setActiveByIndex(next);
        }
      }
    }, { passive: true });
  })();

})();
