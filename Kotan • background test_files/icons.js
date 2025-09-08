// js/icons.js
import { ICONS } from "../assets/icons/icons.js";

const COLORS = [
  "#00f0ff", // bright cyan
  "#7a3cff", // vivid purple
  "#ff9900", // bright orange
  "#e6eeff", // soft light
  "#ff3df0", // neon pink
  "#a6ff0a"  // neon lime
];

function computeCount() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return Math.min(160, Math.max(60, Math.ceil((W * H) / 18000)));
}

function rand(a, b) { return Math.random() * (b - a) + a }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function makeIcon(iconDef) {
  const wrap = document.createElement("div");
  wrap.className = "icon";
  wrap.style.left = `${rand(-5, 100)}vw`;
  wrap.style.top = `${rand(0, 120)}vh`;
  wrap.style.setProperty("--dur", `${rand(20, 40)}s`);
  wrap.style.opacity = `${rand(0.12, 0.26).toFixed(2)}`;
  wrap.style.setProperty("--rot", `${rand(-25, 25)}deg`);
  wrap.style.setProperty("--col", choice(COLORS)); // рандомный цвет

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", iconDef.viewBox || "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");

  if (iconDef.paths) {
    for (const d of iconDef.paths) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    }
  }
  if (iconDef.circles) {
    for (const c of iconDef.circles) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      for (const [k, v] of Object.entries(c)) el.setAttribute(k, v);
      svg.appendChild(el);
    }
  }
  if (iconDef.rects) {
    for (const r of iconDef.rects) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      for (const [k, v] of Object.entries(r)) el.setAttribute(k, v);
      svg.appendChild(el);
    }
  }
  if (iconDef.polygons) {
    for (const poly of iconDef.polygons) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      for (const [k, v] of Object.entries(poly)) el.setAttribute(k, v);
      svg.appendChild(el);
    }
  }

  wrap.appendChild(svg);
  return wrap;
}

function spawnIcons() {
  const field = document.querySelector(".icon-field");
  field.innerHTML = "";
  const count = computeCount();
  for (let i = 0; i < count; i++) {
    field.appendChild(makeIcon(choice(ICONS)));
  }
}

spawnIcons();

let to;
window.addEventListener("resize", () => {
  clearTimeout(to);
  to = setTimeout(spawnIcons, 200);
});
