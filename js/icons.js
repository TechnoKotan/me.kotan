// js/icons.js
document.addEventListener('DOMContentLoaded', () => {
  // контейнер для иконок
  const TARGET = document.getElementById('bg-icons');
  if (!TARGET) return;
  TARGET.style.pointerEvents = 'none';

  // пути к svg
  const ICON_FILES = [
    'assets/icons/1.svg',
    'assets/icons/2.svg',
    'assets/icons/3.svg',
    'assets/icons/4.svg',
    'assets/icons/5.svg',
    'assets/icons/6.svg',
    'assets/icons/7.svg',
    'assets/icons/8.svg',
    'assets/icons/9.svg',
    'assets/icons/10.svg',
    'assets/icons/11.svg',
    'assets/icons/12.svg'
  ];

  // цвета
  const COLORS = [
    '#00FFFF',
    '#9D00FF',
    '#FF6600',
    '#CCCCFF',
    '#FF1493',
    '#39FF14'
  ];

  // параметры
  const COUNT = 24;            // сколько иконок
  const VX = [-1.0, 1.0];      // пикселей за кадр по X
  const VY = [-1.0, 1.0];      // пикселей за кадр по Y
  const VR_MAG = [0.8, 0.8]; // градусов за кадр

  // утилиты
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(rand(0, arr.length))];

  // загрузка svg как DOM
  async function loadSVG(url) {
    const res = await fetch(url);
    const text = await res.text();
    const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;

    // убрать фиксированные размеры, чтобы масштабировалось
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // базовые стили самого svg
    svg.style.position = 'static';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';

    return svg;
  }

  // пробивка цвета внутрь svg
  function applyColor(svg, color) {
    svg.style.color = color;
    const nodes = svg.querySelectorAll('*');
    nodes.forEach(n => {
      const hasFill = n.hasAttribute('fill');
      const hasStroke = n.hasAttribute('stroke');

      if (hasFill && n.getAttribute('fill') !== 'none') n.setAttribute('fill', color);
      if (hasStroke && n.getAttribute('stroke') !== 'none') n.setAttribute('stroke', color);
      if (!hasFill) n.style.fill = color;
    });
  }

  // хелперы для коллизий
  function isInsideTarget(el) {
    return el && (el === TARGET || TARGET.contains(el));
  }

  function hitAt(x, y) {
    const el = document.elementFromPoint(Math.round(x), Math.round(y));
    if (!el) return null;
    if (isInsideTarget(el)) return null;
    if (el === document.documentElement || el === document.body) return null;
    return el; // любое реальное содержимое страницы считаем препятствием
  }

  const items = [];

  async function boot() {
    const svgs = await Promise.all(ICON_FILES.map(loadSVG));

    for (let i = 0; i < COUNT; i++) {
      const svgNode = svgs[i % svgs.length].cloneNode(true);

      // цвет
      const color = pick(COLORS);
      applyColor(svgNode, color);

      // обертка для надежного transform
      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.width = '28px';
      wrap.style.height = '28px';
      wrap.style.willChange = 'transform';
      wrap.style.transformOrigin = 'center';
      wrap.style.pointerEvents = 'none';

      wrap.appendChild(svgNode);

      // стартовые параметры
      let x = Math.random() * window.innerWidth;
      let y = Math.random() * window.innerHeight;
      const s = rand(0.8, 1.25);
      const o = rand(0.5, 1);
      const startRot = rand(0, 360);
      const vrMagnitude = rand(VR_MAG[0], VR_MAG[1]);
      const vrSign = Math.random() < 0.5 ? -1 : 1;

      // начальные стили
      wrap.style.left = x + 'px';
      wrap.style.top = y + 'px';
      wrap.style.opacity = String(o);
      wrap.style.transform = `translate(-50%, -50%) scale(${s}) rotate(${startRot}deg)`;

      TARGET.appendChild(wrap);

      items.push({
        el: wrap,
        x,
        y,
        vx: rand(VX[0], VX[1]),
        vy: rand(VY[0], VY[1]),
        rot: startRot,
        vr: vrMagnitude * vrSign,
        scale: s
      });
    }

    requestAnimationFrame(tick);
  }

  function tick() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const it of items) {
      // предсказанная позиция и угол
      let nx = it.x + it.vx;
      let ny = it.y + it.vy;
      let nrot = it.rot + it.vr;

      // границы окна
      const half = 14 * it.scale; // половина базового размера 28px
      if (nx - half < 0 || nx + half > w) {
        it.vx *= -1;
        nx = it.x + it.vx;
      }
      if (ny - half < 0 || ny + half > h) {
        it.vy *= -1;
        ny = it.y + it.vy;
      }

      // проверка препятствий точками в направлении движения
      const sx = Math.sign(it.vx) || 1;
      const sy = Math.sign(it.vy) || 1;

      const hitCenter = hitAt(nx, ny);
      if (hitCenter) {
        const hitX = hitAt(nx + sx * half, ny);
        const hitY = hitAt(nx, ny + sy * half);

        if (hitX && !hitY) {
          it.vx *= -1;
          nx = it.x + it.vx;
        } else if (hitY && !hitX) {
          it.vy *= -1;
          ny = it.y + it.vy;
        } else {
          it.vx *= -1;
          it.vy *= -1;
          nx = it.x + it.vx;
          ny = it.y + it.vy;
        }
      }

      // применяем
      it.x = nx;
      it.y = ny;
      it.rot = nrot;

      it.el.style.left = it.x + 'px';
      it.el.style.top = it.y + 'px';
      it.el.style.transform = `translate(-50%, -50%) scale(${it.scale}) rotate(${it.rot}deg)`;
    }

    requestAnimationFrame(tick);
  }

  // держим иконки в рамках при ресайзе
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const it of items) {
      const half = 14 * it.scale;
      it.x = Math.min(Math.max(it.x, half), w - half);
      it.y = Math.min(Math.max(it.y, half), h - half);
    }
  });

  // старт
  boot().catch(console.error);
});
