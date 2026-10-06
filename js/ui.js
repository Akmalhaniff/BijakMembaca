// Shared UI helpers for the redesigned interface
import { esc } from './data.js';

// Lucide-style line icons (inline SVG strings)
const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
export const ICONS = {
  book: `<svg viewBox="0 0 24 24" ${P}><path d="M2 4.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2z"/><path d="M22 4.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" ${P}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" ${P}><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 3.5a4 4 0 0 1 0 9"/><path d="M22 21a6 6 0 0 0-4-5.6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg>`,
  cog: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
  login: `<svg viewBox="0 0 24 24" ${P}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5M15 12H3"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" ${P}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>`,
  search: `<svg viewBox="0 0 24 24" ${P}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" ${P}><path d="M12 5v14M5 12h14"/></svg>`,
  share: `<svg viewBox="0 0 24 24" ${P}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4M12 2v13"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" ${P}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  print: `<svg viewBox="0 0 24 24" ${P}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" ${P}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" ${P}><path d="M3 3v18h18"/><path d="M7 15v2M11 11v6M15 7v10M19 12v5"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" ${P}><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" ${P}><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>`,
  pen: `<svg viewBox="0 0 24 24" ${P}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" ${P}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>`,
  link: `<svg viewBox="0 0 24 24" ${P}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>`,
  select: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/></svg>`
};

// Pleasant hue progression for reading levels: violet → sky → teal → green → amber → coral
const HUES = [255, 205, 172, 142, 38, 350];
export function levelHue(i, total) {
  const n = Math.max(total, 1);
  if (n === 1) return HUES[0];
  const pos = (i / (n - 1)) * (HUES.length - 1);
  const a = Math.floor(pos), b = Math.min(a + 1, HUES.length - 1);
  let h1 = HUES[a], h2 = HUES[b];
  if (Math.abs(h2 - h1) > 180) h2 += h2 < h1 ? 360 : -360;
  return Math.round((h1 + (h2 - h1) * (pos - a) + 360) % 360);
}
export function levelColor(i, total, l = 62, s = 78) {
  return `hsl(${levelHue(i, total)} ${s}% ${l}%)`;
}

export function initials(name) {
  return String(name || "?").replace(/\b(binti|bin|bt|b\.)\b/gi, "").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}
function nameHue(name) {
  let h = 0;
  for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
export function avatar(s, size = "") {
  const inner = s.photo ? `<img src="${esc(s.photo)}" alt="">` : esc(initials(s.name));
  return `<div class="av ${size}" style="--h:${nameHue(s.name)}">${inner}</div>`;
}

export function levelPill(data, lv, big = false) {
  const l = data.meta.levels[lv] || { short: "L" + (lv + 1), name: "" };
  return `<span class="lvpill ${big ? "big" : ""}" style="--h:${levelHue(lv, data.meta.levels.length)}"><i></i>${esc(l.short)} · ${esc(l.name)}</span>`;
}

export function miniRing(lv, total) {
  const r = 19, c = 2 * Math.PI * r;
  const pct = total ? (lv + 1) / total : 0;
  return `<div class="mini-ring" style="--h:${levelHue(lv, total)}" title="Tahap ${lv + 1} / ${total}">
    <svg viewBox="0 0 46 46"><circle class="t" cx="23" cy="23" r="${r}" fill="none" stroke-width="5"/>
    <circle class="v" cx="23" cy="23" r="${r}" fill="none" stroke-width="5" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>
    <b>L${lv + 1}</b></div>`;
}

export function meterClass(p) { return p >= 80 ? "good" : p >= 60 ? "warn" : "bad"; }

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi";
  if (h < 15) return "Selamat tengah hari";
  if (h < 19) return "Selamat petang";
  return "Selamat malam";
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Lock page scroll while any bottom sheet is open (important on iOS Safari)
function syncSheetLock() {
  const anyOpen = !!document.querySelector(".modal-bg.open");
  document.documentElement.classList.toggle("sheet-open", anyOpen);
}
const mo = new MutationObserver(syncSheetLock);
function watchSheets() {
  document.querySelectorAll(".modal-bg").forEach(el => mo.observe(el, { attributes: true, attributeFilter: ["class"] }));
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watchSheets);
else watchSheets();
export { watchSheets };

// Fill any <el data-icon="name"> with its SVG
export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(el => {
    if (el.dataset.iconDone) return;
    const svg = ICONS[el.dataset.icon];
    if (svg) { el.insertAdjacentHTML("afterbegin", svg); el.dataset.iconDone = "1"; }
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => hydrateIcons());
else hydrateIcons();
