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
    btn.innerHTML = isDark
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDarkMode);
} else {
  initDarkMode();
}