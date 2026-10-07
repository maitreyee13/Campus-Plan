const THEME_KEY = "campusplan-theme";

export function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  const themeButton = document.querySelector("#theme-toggle");
  if (themeButton) themeButton.setAttribute("aria-pressed", String(next === "dark"));
  document.querySelectorAll("[role=\"switch\"]").forEach((control) => {
    if (control.id === "settings-theme-toggle") { control.setAttribute("aria-checked", String(next === "dark")); control.classList.toggle("is-on", next === "dark"); }
  });
  return next;
}

export function toggleTheme() {
  return setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

export function initTheme() {
  return setTheme(getPreferredTheme());
}
