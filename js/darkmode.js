// Dark mode utility
const DARK_MODE_KEY = "sbm_dark_mode";

function initDarkMode() {
  const saved = localStorage.getItem(DARK_MODE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "true" : prefersDark;
  document.documentElement.classList.toggle("dark", isDark);
  updateDarkModeToggle(isDark);
}

function toggleDarkMode() {
  const isDark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(DARK_MODE_KEY, isDark);
  updateDarkModeToggle(isDark);
}

function updateDarkModeToggle(isDark) {
  document.querySelectorAll("[data-dark-toggle]").forEach(btn => {
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.setAttribute("aria-label", isDark ? "Mod terang" : "Mod gelap");
  });
}

function createDarkModeToggle() {
  const btn = document.createElement("button");
  btn.className = "btn ghost sm";
  btn.setAttribute("data-dark-toggle", "");
  btn.setAttribute("aria-label", "Tukar mod gelap/terang");
  btn.addEventListener("click", toggleDarkMode);
  return btn;
}

document.addEventListener("DOMContentLoaded", initDarkMode);