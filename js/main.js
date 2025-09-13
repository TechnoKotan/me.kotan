// точка входа. сюда позже добавим что нужно.
// если используешь плавающие иконки - подключай их тут:
// import './icons.js' - для простого HTML это не работает без сборки,
// значит просто добавь еще один <script src="js/icons.js" defer></script> в index.html ниже main.js


// --- Tabs + swipe + lazy loader unified ---
(function(){
  const tabs = Array.from(document.querySelectorAll('.top-nav .tab'));
  const group = document.getElementById('panelGroup');
  if (!tabs.length || !group) return;

  
  function attachMemes(scope){
    const grid = scope.querySelector('#memesGrid');
    if (!grid || scope.dataset.memesBound) return;
    scope.dataset.memesBound = '1';

    const btn = scope.querySelector('#memesRefresh');
    const tabs = Array.from(document.querySelectorAll('.top-nav .tab'));
    const memesIndex = tabs.findIndex(a => a.getAttribute('href') === '#memes');

    // queue stores latest-first URLs (avoid duplicates)
    const queue = [];
    const seen = new Set();

    const allowExt = /\.(jpg|jpeg|png|gif|webp)$/i;

    function makeCard(url, title, href){
      const a = document.createElement('a');
      a.href = href || url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer nofollow';
      const img = document.createElement('img');
      img.src = url;
      img.alt = title || 'cat meme';
      img.referrerPolicy = 'no-referrer';
      const card = document.createElement('div');
      card.className = 'meme-card';
      a.appendChild(img);
      card.appendChild(a);
      return card;
    }

    function skeleton(n=8){
      grid.innerHTML = '';
      for(let i=0;i<n;i++){
        const d = document.createElement('div');
        d.className = 'meme-skeleton';
        grid.appendChild(d);
      }
    }

    function computeCapacity(){
      const gridRect = grid.getBoundingClientRect();
      const cell = 220; // target card size in px
      const cols = Math.max(2, Math.floor(gridRect.width / cell));
      const rows = Math.max(2, Math.floor(gridRect.height / cell));
      return Math.max(6, cols * rows);
    }

    let capacity = computeCapacity();
    let filling = false;

    function renderQueue(){
      grid.innerHTML = '';
      for(let i=0; i<Math.min(queue.length, capacity); i++){
        const it = queue[i];
        grid.appendChild(makeCard(it.url, it.title, it.postLink || it.source));
      }
      // pad with skeletons if queue is still filling
      for(let i=queue.length; i<capacity; i++){
        const d = document.createElement('div');
        d.className = 'meme-skeleton';
        grid.appendChild(d);
      }
    }

    function pushItem(it){
      if (!it || !it.url || !allowExt.test(it.url)) return false;
      if (seen.has(it.url)) return false;
      queue.unshift(it);
      seen.add(it.url);
      if (queue.length > capacity) {
        const removed = queue.pop();
        if (removed) seen.delete(removed.url);
      }
      renderQueue();
      return true;
    }

    async function getOneFromMemeAPI(){
      const url = 'https://meme-api.com/gimme/catmemes';
      const r = await fetch(url, { cache: 'no-store' });
      const j = await r.json();
      const x = j.meme || j;
      return { url: x.url, title: x.title, postLink: x.postLink, source: 'meme-api' };
    }

    async function getOneFromReddit(){
      const url = 'https://www.reddit.com/r/catmemes/hot.json?limit=50';
      const r = await fetch(url, { cache: 'no-store' });
      const j = await r.json();
      const items = (j.data.children || []).map(c => c.data).map(d => ({
        url: d.url_overridden_by_dest || (d.preview && d.preview.images && d.preview.images[0] && d.preview.images[0].source && d.preview.images[0].source.url) || '',
        title: d.title, postLink: 'https://reddit.com' + d.permalink, source: 'reddit'
      }));
      // pick first unseen valid
      return items.find(it => it.url && allowExt.test(it.url) && !seen.has(it.url));
    }

    async function getOneFromTheCatAPI(){
      const url = 'https://api.thecatapi.com/v1/images/search?limit=1&mime_types=jpg,png,gif';
      const r = await fetch(url, { cache: 'no-store' });
      const j = await r.json();
      const x = (j && j[0]) || null;
      if (!x) return null;
      return { url: x.url, title: 'cat', postLink: x.url, source: 'thecatapi' };
    }

    async function fetchOne(){
      // try in order; return first valid unseen
      try{
        const a = await getOneFromMemeAPI();
        if (a && a.url && allowExt.test(a.url) && !seen.has(a.url)) return a;
      }catch(e){}
      try{
        const b = await getOneFromReddit();
        if (b && b.url && allowExt.test(b.url) && !seen.has(b.url)) return b;
      }catch(e){}
      try{
        const c = await getOneFromTheCatAPI();
        if (c && c.url && allowExt.test(c.url) && !seen.has(c.url)) return c;
      }catch(e){}
      return null;
    }

    async function prime(n){
      if (filling) return; filling = true;
      skeleton(Math.min(n, 12));
      let tries = 0;
      while(queue.length < n && tries < n * 6){
        const it = await fetchOne();
        if (it && pushItem(it)) { /* ok */ }
        tries++;
      }
      filling = false;
      renderQueue();
    }

    async function tick(){
      // only when Memes is active
      const idx = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-index')) || 0;
      if (idx !== memesIndex) return;
      const it = await fetchOne();
      if (it) pushItem(it);
    }

    // Resize handling to keep full viewport grid without scroll
    const ro = new ResizeObserver(() => {
      const newCap = computeCapacity();
      if (newCap !== capacity){
        capacity = newCap;
        // trim or pad queue rendering
        if (queue.length > capacity){
          while(queue.length > capacity){
            const removed = queue.pop();
            if (removed) seen.delete(removed.url);
          }
        }
        renderQueue();
      }
    });
    ro.observe(grid);

    // init
    prime(capacity);

    // manual refresh = fetch one now
    if (btn) btn.addEventListener('click', tick);

    // every minute pull one new and drop last
    if (!window.__memesMinuteTimer){
      window.__memesMinuteTimer = setInterval(tick, 60 * 1000);
    }
  }


  const panels = Array.from(group.querySelectorAll('.panel'));
  const cache = new Map();

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

  function preloadAround(i){
    [i, i-1, i+1].forEach(loadIntoIndex);
  }

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

  // Optional: horizontal wheel
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

  function attachEnhancements(scope){ attachForm(scope); attachMemes(scope); }

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
})();
