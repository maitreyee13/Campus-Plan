import { initTheme, toggleTheme, setTheme } from "./theme.js";
import {
  APP_REDIRECT_URL,
  isSupabaseConfigured
} from "./config.js";
import {
  deleteRecord,
  getAuthMessage,
  getPreviewData,
  getSession,
  isPreviewMode,
  loadPlanner,
  resetPassword,
  saveRecord,
  saveStreak,
  signIn,
  signOut,
  signUp,
  startPreview,
  stopPreview,
  supabase,
  updatePassword,
  updateProfile,
  watchAuth
} from "./database.js";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const state = {
  user: null,
  data: null,
  view: "dashboard",
  selectedDate: localDateKey(),
  calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  loading: false,
  modalTrigger: null
};

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function dateFromKey(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(key, amount) { const date = dateFromKey(key); date.setDate(date.getDate() + amount); return localDateKey(date); }
function formatDate(key, options = { month: "short", day: "numeric" }) { return key ? dateFromKey(key).toLocaleDateString(undefined, options) : "No date"; }
function fullDate(key) { return dateFromKey(key).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }
function monthLabel(date) { return date.toLocaleDateString(undefined, { month: "long", year: "numeric" }); }
function esc(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function initials(name = "You") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "YO"; }
function shortTime(time = "") { return time.replace(/^0/, ""); }
function daysUntil(key) { return Math.ceil((dateFromKey(key) - dateFromKey(localDateKey())) / 86400000); }
function isOverdue(key) { return daysUntil(key) < 0; }
function titleCase(value = "") { return value.charAt(0).toUpperCase() + value.slice(1); }

function setAuthView(view) {
  ["login", "register", "forgot"].forEach((name) => $(`#${name}-form`)?.classList.toggle("hidden", name !== view));
  const title = { login: "Make today feel lighter.", register: "A calmer week starts here.", forgot: "Let’s get you back in." }[view];
  const copy = { login: "Plan the next right thing, then let the rest wait.", register: "A few details, then you’re ready to begin.", forgot: "We’ll help you find your way back to your planner." }[view];
  $("#auth-title").textContent = title;
  $(".auth-copy p").textContent = copy;
  $$(".form-message").forEach((message) => { message.textContent = ""; message.classList.remove("success"); });
}

function showSetupBanner() {
  const banner = $("#setup-banner");
  if (!isSupabaseConfigured) {
    banner.classList.remove("hidden");
    banner.innerHTML = "<strong>Cloud sync is not connected yet.</strong><br>Set your Supabase URL and anon key in <code>js/config.js</code> before using accounts.";
  } else banner.classList.add("hidden");
}

function showAuth() {
  $("#auth-screen").classList.remove("hidden");
  $("#planner-screen").classList.add("hidden");
  $("#preview-mode-bar").classList.add("hidden");
  setAuthView("login");
  showSetupBanner();
}

function setLoading(button, loading, label = "Working…") {
  if (!button) return;
  if (loading) { button.dataset.originalLabel = button.innerHTML; button.innerHTML = `<span class="spinner"></span>${label}`; button.disabled = true; }
  else { button.innerHTML = button.dataset.originalLabel || button.innerHTML; button.disabled = false; }
}

function authMessage(id, message, success = false) {
  const element = $(`#${id}`);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("success", success);
}

async function handleLogin(event) {
  event.preventDefault();
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  if (!email) return authMessage("login-message", "Please enter your email.");
  if (!password) return authMessage("login-message", "Please enter your password.");
  const button = $("#login-form button[type=submit]");
  try { setLoading(button, true, "Signing in…"); await signIn(email, password); }
  catch (error) { authMessage("login-message", getAuthMessage(error)); setLoading(button, false); }
}

async function handleRegister(event) {
  event.preventDefault();
  const name = $("#register-name").value.trim();
  const email = $("#register-email").value.trim();
  const password = $("#register-password").value;
  const confirm = $("#register-confirm").value;
  if (!name) return authMessage("register-message", "Please enter your name.");
  if (!email) return authMessage("register-message", "Please enter your email.");
  if (password.length < 8) return authMessage("register-message", "Password must contain at least 8 characters.");
  if (password !== confirm) return authMessage("register-message", "Passwords do not match.");
  const button = $("#register-form button[type=submit]");
  try {
    setLoading(button, true, "Creating account…");
    const result = await signUp(email, password, name);
    if (!result.session) { authMessage("register-message", "Account created. Check your inbox to confirm your email, then sign in.", true); setLoading(button, false); }
  } catch (error) { authMessage("register-message", getAuthMessage(error)); setLoading(button, false); }
}

async function handleForgot(event) {
  event.preventDefault();
  const email = $("#forgot-email").value.trim();
  if (!email) return authMessage("forgot-message", "Please enter your email.");
  const button = $("#forgot-form button[type=submit]");
  try { setLoading(button, true, "Sending…"); await resetPassword(email); authMessage("forgot-message", "Reset link sent. Check your inbox.", true); }
  catch (error) { authMessage("forgot-message", getAuthMessage(error)); }
  finally { setLoading(button, false); }
}

async function enterPlanner(user, preview = false) {
  state.user = user;
  state.loading = true;
  $("#auth-screen").classList.add("hidden");
  $("#planner-screen").classList.remove("hidden");
  $("#preview-mode-bar").classList.toggle("hidden", !preview);
  try {
    state.data = await loadPlanner(user?.id || "preview-user");
    updateIdentity();
    setView("dashboard");
    renderAll();
  } catch (error) {
    showToast("error", "Couldn’t load your planner", "Please check your connection and try again.");
    showAuth();
  } finally { state.loading = false; }
}

function updateIdentity() {
  const profile = state.data?.profile || {};
  const name = profile.full_name || "there";
  const email = profile.email || state.user?.email || "";
  const firstName = name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("#sidebar-name").textContent = name;
  $("#sidebar-email").textContent = email;
  $("#greeting").innerHTML = `${greeting}, ${esc(firstName)} <span class="greeting-spark">✦</span>`;
  $("#profile-name").value = name;
  $("#profile-email").value = email;
  [$("#avatar"), $("#top-avatar"), $("#settings-avatar")].forEach((element) => { if (element) element.textContent = initials(name); });
  $("#date-label").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
}

async function refreshData() {
  state.data = await loadPlanner(state.user?.id || "preview-user");
  updateIdentity();
  renderAll();
}

function showToast(type, title, message) {
  const region = $("#toast-region");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === "error" ? "!" : "✓"}</span><div><strong>${esc(title)}</strong><p>${esc(message)}</p></div>`;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

function updateStats() {
  const tasks = state.data?.tasks || [];
  const todayTasks = tasks.filter((task) => task.due_date === localDateKey());
  const total = todayTasks.length;
  const done = todayTasks.filter((task) => task.completed).length;
  const remaining = Math.max(0, total - done);
  const percent = total ? Math.round((done / total) * 100) : 0;
  $("#progress-percent").innerHTML = `${percent}<span>%</span>`;
  $("#progress-copy").textContent = `${done} of ${total} tasks complete`;
  $("#progress-bar").style.width = `${percent}%`;
  $("#remaining-copy").textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} remaining`;
  $("#task-summary").textContent = `${done} / ${total} completed`;
  $("#tasks-total").textContent = total;
  $("#tasks-done").textContent = done;
  $("#tasks-left").textContent = remaining;
  $("#nav-task-count").textContent = remaining;
  const streak = state.data?.streak || {};
  $("#streak-current").textContent = String(streak.current_streak || 0).padStart(2, "0");
  $("#settings-streak").textContent = streak.current_streak || 0;
  $("#settings-longest").textContent = streak.longest_streak || 0;
  $("#settings-completed").textContent = tasks.filter((task) => task.completed).length;
  $("#streak-message").textContent = streak.current_streak ? "Keep the rhythm going — you’re doing great." : "Complete one task today to start a new streak.";
  $("#streak-dots").innerHTML = Array.from({ length: 7 }, (_, index) => `<i class="${index < Math.min(streak.current_streak || 0, 7) ? "is-active" : ""}"></i>`).join("");
  const next = (state.data?.assignments || []).filter((item) => !item.completed && !isOverdue(item.due_date)).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  if (next) { $("#next-deadline").textContent = next.title; $("#next-deadline-meta").textContent = `Due ${daysUntil(next.due_date) === 1 ? "tomorrow" : formatDate(next.due_date)} · Assignment`; $(".mini-date-day").textContent = dateFromKey(next.due_date).getDate(); }
}

function taskMarkup(task) {
  return `<div class="task-row ${task.completed ? "is-complete" : ""}" data-id="${esc(task.id)}"><button class="task-check" data-action="toggle-task" data-id="${esc(task.id)}" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}">${task.completed ? "✓" : ""}</button><div class="task-main"><strong class="task-title">${esc(task.title)}</strong><div class="task-meta"><span class="task-tag">${esc(task.category || "Other")}</span><span class="priority-tag priority-${String(task.priority || "Low").toLowerCase()}">${esc(task.priority || "Low")} priority</span><span>${task.due_date === localDateKey() ? "Today" : formatDate(task.due_date)}</span></div></div><div class="task-actions"><button class="icon-button" data-action="edit-task" data-id="${esc(task.id)}" aria-label="Edit task">✎</button><button class="icon-button" data-action="delete-task" data-id="${esc(task.id)}" aria-label="Delete task">×</button></div></div>`;
}

function renderDashboard() {
  const todayTasks = (state.data?.tasks || []).filter((task) => task.due_date === localDateKey());
  $("#dashboard-tasks").innerHTML = todayTasks.length ? todayTasks.slice(0, 5).map(taskMarkup).join("") : emptyMarkup("☼", "No tasks for today", "A clear list is a good list. Add something small to begin.");
  const today = new Date().getDay() || 7;
  const classes = (state.data?.timetable || []).filter((item) => Number(item.day_of_week) === today).sort((a, b) => a.start_time.localeCompare(b.start_time));
  $("#dashboard-schedule").innerHTML = classes.length ? classes.map((item) => `<div class="schedule-row"><span class="schedule-time">${shortTime(item.start_time)}</span><i class="schedule-line"></i><div><strong>${esc(item.subject)}</strong><span>${esc(item.teacher || "")}</span></div><span class="schedule-room">${esc(item.room || "")}</span></div>`).join("") : emptyMarkup("☷", "Nothing scheduled today", "Leave some space for the unexpected.");
  const upcoming = [...(state.data?.assignments || []).filter((item) => !item.completed), ...(state.data?.exams || []).map((item) => ({ ...item, title: item.exam_name, due_date: item.exam_date, subject: `${item.subject} · Exam` }))].filter((item) => item.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 3);
  $("#dashboard-upcoming").innerHTML = upcoming.length ? upcoming.map((item) => `<div class="upcoming-row"><span class="upcoming-date">${String(dateFromKey(item.due_date).getDate()).padStart(2, "0")}</span><div><strong>${esc(item.title)}</strong><span>${esc(item.subject || "")}</span></div><span class="upcoming-urgency">${daysUntil(item.due_date) === 0 ? "Today" : daysUntil(item.due_date) === 1 ? "Tomorrow" : `${daysUntil(item.due_date)} days`}</span></div>`).join("") : emptyMarkup("✦", "Nothing upcoming", "You’re clear for a moment.");
}

function renderTasks() {
  const search = $("#task-search")?.value.toLowerCase() || "";
  const filter = $("#task-filter")?.value || "all";
  const category = $("#task-category-filter")?.value || "all";
  const tasks = (state.data?.tasks || []).filter((task) => !search || `${task.title} ${task.description}`.toLowerCase().includes(search)).filter((task) => filter === "all" || (filter === "done" ? task.completed : !task.completed)).filter((task) => category === "all" || task.category === category).sort((a, b) => a.due_date.localeCompare(b.due_date));
  $("#all-tasks").innerHTML = tasks.length ? tasks.map(taskMarkup).join("") : emptyMarkup("✓", "No matching tasks", "Try a different filter or add a new task.");
}

function renderAssignments() {
  const search = $("#assignment-search")?.value.toLowerCase() || "";
  const filter = $("#assignment-view-filter")?.value || "all";
  const sort = $("#assignment-sort")?.value || "date";
  let items = (state.data?.assignments || []).filter((item) => !search || `${item.title} ${item.subject}`.toLowerCase().includes(search));
  items = items.filter((item) => filter === "all" || filter === "completed" && item.completed || filter === "overdue" && isOverdue(item.due_date) && !item.completed || filter === "upcoming" && !isOverdue(item.due_date) && !item.completed);
  items.sort((a, b) => sort === "priority" ? ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 3) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 3) : sort === "subject" ? a.subject.localeCompare(b.subject) : a.due_date.localeCompare(b.due_date));
  $("#assignment-list").innerHTML = items.length ? items.map((item) => `<div class="record-row"><div class="record-col"><h3>${esc(item.title)}</h3><p>${esc(item.description || "No description added")}</p></div><div class="record-col"><span class="record-col-label">Subject</span><span>${esc(item.subject || "—")}</span></div><div class="record-col"><span class="record-col-label">Due</span><span class="${isOverdue(item.due_date) && !item.completed ? "overdue" : ""}">${formatDate(item.due_date)}${isOverdue(item.due_date) && !item.completed ? " · overdue" : ""}</span></div><div class="record-actions"><span class="priority-tag priority-${String(item.priority || "Low").toLowerCase()}">${item.completed ? "Done" : esc(item.priority || "Low")}</span><button class="icon-button" data-action="edit-assignment" data-id="${esc(item.id)}" aria-label="Edit assignment">✎</button><button class="icon-button" data-action="delete-assignment" data-id="${esc(item.id)}" aria-label="Delete assignment">×</button></div></div>`).join("") : emptyMarkup("◫", "No assignments here", "Add a deadline and get it out of your head.");
}

function renderExams() {
  const items = [...(state.data?.exams || [])].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  $("#exam-list").innerHTML = items.length ? items.map((item) => { const remaining = daysUntil(item.exam_date); const urgency = remaining <= 3 ? "urgent" : remaining <= 7 ? "soon" : ""; return `<article class="exam-card ${urgency}"><span class="record-chip">${esc(item.subject)}</span><h3>${esc(item.exam_name)}</h3><p>${formatDate(item.exam_date, { weekday: "long", month: "long", day: "numeric" })}</p><div class="exam-details"><span>◷ ${shortTime(item.exam_time || "Time TBC")}</span><span>⌖ ${esc(item.location || "Location TBC")}</span></div><div class="exam-countdown"><strong>${remaining < 0 ? "Passed" : remaining === 0 ? "Today" : remaining === 1 ? "1 day" : `${remaining} days`}</strong><span>${remaining <= 3 && remaining >= 0 ? "You’ve got this." : "until exam"}</span></div><div class="record-actions"><button class="icon-button" data-action="edit-exam" data-id="${esc(item.id)}" aria-label="Edit exam">✎</button><button class="icon-button" data-action="delete-exam" data-id="${esc(item.id)}" aria-label="Delete exam">×</button></div></article>`; }).join("") : emptyMarkup("◷", "No exams added yet", "Add the next date you need to prepare for.");
}

function renderTimetable() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const times = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const classes = state.data?.timetable || [];
  let html = `<div class="timetable-cell header">TIME</div>${days.map((day) => `<div class="timetable-cell header">${day}</div>`).join("")}`;
  times.forEach((time, index) => {
    html += `<div class="timetable-cell time">${shortTime(time)}</div>`;
    for (let day = 1; day <= 7; day += 1) {
      const match = classes.find((item) => Number(item.day_of_week) === day && item.start_time?.slice(0, 2) === time.slice(0, 2));
      html += `<div class="timetable-cell">${match ? `<div class="class-pill ${index % 3 === 1 ? "coral" : index % 3 === 2 ? "mint" : ""}"><strong>${esc(match.subject)}</strong><span>${esc(match.room || match.teacher || "")}</span></div>` : ""}</div>`;
    }
  });
  $("#timetable-grid").innerHTML = html;
  $("#timetable-records").innerHTML = classes.length ? classes.sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week) || a.start_time.localeCompare(b.start_time)).map((item) => `<div class="timetable-record"><div><strong>${esc(item.subject)}</strong><span>${days[Number(item.day_of_week) - 1] || "Day"} · ${shortTime(item.start_time)}–${shortTime(item.end_time)}</span></div><span>${esc(item.teacher || item.room || "")}</span><div class="record-actions"><button class="icon-button" data-action="edit-timetable" data-id="${esc(item.id)}" aria-label="Edit class">✎</button><button class="icon-button" data-action="delete-timetable" data-id="${esc(item.id)}" aria-label="Delete class">×</button></div></div>`).join("") : emptyMarkup("☷", "No classes added yet", "Add your first class to make the week visible.");
}

function renderNotes() {
  const search = $("#note-search")?.value.toLowerCase() || "";
  const notes = (state.data?.notes || []).filter((note) => !search || `${note.title} ${note.content}`.toLowerCase().includes(search));
  $("#notes-list").innerHTML = notes.length ? notes.map((note) => `<article class="note-card"><h3>${esc(note.title)}</h3><p>${esc(note.content)}</p><div class="note-card-footer"><span>Updated ${formatDate(note.updated_at || note.created_at)}</span><div class="note-card-actions"><button class="icon-button" data-action="edit-note" data-id="${esc(note.id)}" aria-label="Edit note">✎</button><button class="icon-button" data-action="delete-note" data-id="${esc(note.id)}" aria-label="Delete note">×</button></div></div></article>`).join("") : emptyMarkup("⌑", "No notes yet", "Create your first note and give the thought somewhere to land.");
}

function renderEvents() {
  const items = [...(state.data?.events || [])].sort((a, b) => a.date.localeCompare(b.date));
  $("#event-list").innerHTML = items.length ? items.map((item) => `<div class="record-row"><div class="record-col"><h3>${esc(item.title)}</h3><p>${esc(item.description || "No description added")}</p></div><div class="record-col"><span class="record-col-label">Date</span><span>${formatDate(item.date, { weekday: "short", month: "short", day: "numeric" })}</span></div><div class="record-col"><span class="record-col-label">Time</span><span>${esc(item.time || "Time TBC")}</span></div><div class="record-actions"><button class="icon-button" data-action="edit-event" data-id="${esc(item.id)}" aria-label="Edit event">✎</button><button class="icon-button" data-action="delete-event" data-id="${esc(item.id)}" aria-label="Delete event">×</button></div></div>`).join("") : emptyMarkup("✦", "No events yet", "Keep the meaningful moments close, too.");
}

function calendarMarkerMap() {
  const map = {};
  const add = (date, type) => { if (!date) return; map[date] ||= new Set(); map[date].add(type); };
  (state.data?.tasks || []).forEach((item) => add(item.due_date, "task"));
  (state.data?.assignments || []).forEach((item) => add(item.due_date, "deadline"));
  (state.data?.exams || []).forEach((item) => add(item.exam_date, "deadline"));
  (state.data?.events || []).forEach((item) => add(item.date, "event"));
  return map;
}

function renderCalendar() {
  const month = state.calendarMonth;
  $("#calendar-month").textContent = monthLabel(month);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const previousDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const markers = calendarMarkerMap();
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    let number = index - startOffset + 1;
    let date;
    let other = false;
    if (index < startOffset) { number = previousDays - startOffset + index + 1; date = new Date(month.getFullYear(), month.getMonth() - 1, number); other = true; }
    else if (number > daysInMonth) { date = new Date(month.getFullYear(), month.getMonth() + 1, number - daysInMonth); number -= daysInMonth; other = true; }
    else date = new Date(month.getFullYear(), month.getMonth(), number);
    const key = localDateKey(date);
    const markerHtml = [...(markers[key] || [])].map((type) => `<i class="day-marker ${type === "task" ? "dot-lavender" : type === "deadline" ? "dot-coral" : "dot-mint"}"></i>`).join("");
    cells.push(`<button class="calendar-day ${other ? "is-other" : ""} ${key === state.selectedDate ? "is-selected" : ""} ${key === localDateKey() ? "is-today" : ""}" data-calendar-date="${key}"><span class="day-number">${number}</span><span class="day-markers">${markerHtml}</span></button>`);
  }
  $("#calendar-grid").innerHTML = cells.join("");
  $("#selected-date-title").textContent = fullDate(state.selectedDate);
  const dayItems = [
    ...(state.data?.tasks || []).filter((item) => item.due_date === state.selectedDate).map((item) => ({ title: item.title, meta: `Task · ${item.completed ? "completed" : item.priority || "Open"}`, type: "task" })),
    ...(state.data?.assignments || []).filter((item) => item.due_date === state.selectedDate).map((item) => ({ title: item.title, meta: `Assignment · ${item.subject || ""}`, type: "deadline" })),
    ...(state.data?.exams || []).filter((item) => item.exam_date === state.selectedDate).map((item) => ({ title: item.exam_name, meta: `Exam · ${item.subject || ""}`, type: "deadline" })),
    ...(state.data?.events || []).filter((item) => item.date === state.selectedDate).map((item) => ({ title: item.title, meta: `Event · ${item.time || ""}`, type: "event" }))
  ];
  $("#selected-day-items").innerHTML = dayItems.length ? dayItems.map((item) => `<div class="selected-day-item"><i class="${item.type === "task" ? "dot-lavender" : item.type === "deadline" ? "dot-coral" : "dot-mint"}"></i><div><strong>${esc(item.title)}</strong><span>${esc(item.meta)}</span></div></div>`).join("") : `<div class="empty-state"><div class="empty-icon">☼</div><strong>A clear day</strong><p>Nothing is scheduled here yet.</p></div>`;
}

function emptyMarkup(icon, title, copy) { return `<div class="empty-state"><div class="empty-icon">${icon}</div><strong>${title}</strong><p>${copy}</p></div>`; }
function renderAll() { if (!state.data) return; updateStats(); renderDashboard(); renderTasks(); renderAssignments(); renderExams(); renderTimetable(); renderNotes(); renderEvents(); renderCalendar(); }

function setView(view) {
  state.view = view;
  $$(".page-view").forEach((page) => page.classList.toggle("active-view", page.id === `view-${view}`));
  $$(".nav-item[data-view]").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  const page = $(`#view-${view}`);
  if (page) { $("#view-kicker").textContent = page.dataset.pageKicker; $("#view-title").textContent = page.dataset.pageTitle; }
  closeNav();
}

function openNav() { $("#sidebar").classList.add("is-open"); $("#sidebar-scrim").classList.add("is-open"); }
function closeNav() { $("#sidebar").classList.remove("is-open"); $("#sidebar-scrim").classList.remove("is-open"); }

const formDefinitions = {
  task: { collection: "tasks", title: "Task", subtitle: "Give the next thing a clear shape.", fields: [{ name: "title", label: "Task title", type: "text", placeholder: "e.g. Outline methods section", required: true }, { name: "description", label: "Notes", type: "textarea", placeholder: "Optional context" }, { name: "due_date", label: "Date", type: "date", required: true }, { name: "category", label: "Category", type: "select", options: ["College", "Study", "Personal", "Health", "Shopping", "Other"] }, { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"] }] },
  assignment: { collection: "assignments", title: "Assignment", subtitle: "Keep the deadline visible, not heavy.", fields: [{ name: "title", label: "Assignment title", type: "text", placeholder: "e.g. Reading response", required: true }, { name: "subject", label: "Subject", type: "text", placeholder: "e.g. PSY 204" }, { name: "description", label: "Description", type: "textarea", placeholder: "Optional details" }, { name: "due_date", label: "Due date", type: "date", required: true }, { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High"] }, { name: "completed", label: "Status", type: "select", options: ["false", "true"], labels: ["Open", "Completed"] }] },
  exam: { collection: "exams", title: "Exam", subtitle: "Future you will be glad this is here.", fields: [{ name: "subject", label: "Subject", type: "text", placeholder: "e.g. MTH 120", required: true }, { name: "exam_name", label: "Exam name", type: "text", placeholder: "e.g. Statistics midterm", required: true }, { name: "exam_date", label: "Exam date", type: "date", required: true }, { name: "exam_time", label: "Time", type: "time" }, { name: "location", label: "Location", type: "text", placeholder: "Room or building" }, { name: "notes", label: "Notes", type: "textarea", placeholder: "What will help you prepare?" }] },
  timetable: { collection: "timetable", title: "Class", subtitle: "Build a week you can actually read.", fields: [{ name: "subject", label: "Subject", type: "text", placeholder: "e.g. Research methods", required: true }, { name: "teacher", label: "Teacher", type: "text", placeholder: "e.g. Dr. Patel" }, { name: "room", label: "Room", type: "text", placeholder: "e.g. Hall B · 204" }, { name: "day_of_week", label: "Day", type: "select", options: ["1", "2", "3", "4", "5", "6", "7"], labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }, { name: "start_time", label: "Start time", type: "time", required: true }, { name: "end_time", label: "End time", type: "time", required: true }] },
  note: { collection: "notes", title: "Note", subtitle: "Save the thought before it gets away.", fields: [{ name: "title", label: "Title", type: "text", placeholder: "e.g. Questions for office hours", required: true }, { name: "content", label: "Content", type: "textarea", placeholder: "Write it down…", required: true }] },
  event: { collection: "events", title: "Event", subtitle: "The life around your list matters too.", fields: [{ name: "title", label: "Event title", type: "text", placeholder: "e.g. Study group", required: true }, { name: "date", label: "Date", type: "date", required: true }, { name: "time", label: "Time", type: "time" }, { name: "description", label: "Description", type: "textarea", placeholder: "Optional details" }] }
};

function openPasswordRecoveryModal() {
  state.modalTrigger = document.activeElement;
  $("#modal-root").innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><div><h2 id="modal-title">Choose a new password</h2><p>Make it something only you will know.</p></div></div><form id="password-recovery-form" class="modal-form"><label>New password<input name="password" type="password" minlength="8" autocomplete="new-password" placeholder="8+ characters" required></label><label>Confirm password<input name="confirm" type="password" minlength="8" autocomplete="new-password" placeholder="Repeat your password" required></label><div class="modal-actions"><button type="submit" class="button button-primary">Update password</button></div><p id="modal-message" class="form-message" aria-live="polite"></p></form></div></div>`;
  $("#password-recovery-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    if (values.password.length < 8) return $("#modal-message").textContent = "Password must contain at least 8 characters.";
    if (values.password !== values.confirm) return $("#modal-message").textContent = "Passwords do not match.";
    const submit = form.querySelector("button[type=submit]");
    try { setLoading(submit, true, "Updating…"); await updatePassword(values.password); closeModal(); await signOut(); showAuth(); authMessage("login-message", "Password updated. You can sign in with your new password.", true); }
    catch (error) { $("#modal-message").textContent = getAuthMessage(error); setLoading(submit, false); }
  });
  setTimeout(() => $("#password-recovery-form input")?.focus(), 0);
}

function getItem(type, id) { return (state.data?.[formDefinitions[type].collection] || []).find((item) => item.id === id); }
function fieldMarkup(field, item = {}) {
  const value = item[field.name] ?? (field.name === "due_date" || field.name === "exam_date" || field.name === "date" ? state.selectedDate : field.name === "priority" ? "Medium" : field.name === "category" ? "Other" : field.name === "day_of_week" ? "1" : field.name === "completed" ? "false" : "");
  const required = field.required ? "required" : "";
  if (field.type === "textarea") return `<label>${field.label}<textarea name="${field.name}" placeholder="${field.placeholder || ""}" ${required}>${esc(value)}</textarea></label>`;
  if (field.type === "select") return `<label>${field.label}<select name="${field.name}" ${required}>${field.options.map((option, index) => `<option value="${esc(option)}" ${String(value) === option ? "selected" : ""}>${esc(field.labels?.[index] || option)}</option>`).join("")}</select></label>`;
  const inputValue = field.type === "time" ? String(value).slice(0, 5) : value;
  return `<label>${field.label}<input name="${field.name}" type="${field.type}" value="${esc(inputValue)}" placeholder="${field.placeholder || ""}" ${required}></label>`;
}

function openRecordModal(type, id = "") {
  const definition = formDefinitions[type];
  const item = id ? getItem(type, id) : {};
  state.modalTrigger = document.activeElement;
  const fields = definition.fields.map((field, index) => `<div class="${definition.fields.length > 3 && field.type !== "textarea" && index < 6 ? "modal-field-wrap" : ""}">${fieldMarkup(field, item)}</div>`).join("");
  $("#modal-root").innerHTML = `<div class="modal-backdrop" data-close-modal><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><div><h2 id="modal-title">${id ? "Edit" : "Add"} ${definition.title}</h2><p>${definition.subtitle}</p></div><button class="icon-button" data-close-modal aria-label="Close dialog">×</button></div><form id="record-form" class="modal-form" data-type="${type}" data-id="${esc(id)}"><div class="form-grid-2">${fields}</div><div class="modal-actions"><button type="button" class="button button-ghost" data-close-modal>Cancel</button><button type="submit" class="button button-primary">${id ? "Save changes" : `Add ${definition.title.toLowerCase()}`}</button></div><p id="modal-message" class="form-message" aria-live="polite"></p></form></div></div>`;
  if (definition.fields.some((field) => field.type === "textarea")) $(".form-grid-2").classList.add("has-textarea");
  $("#record-form").addEventListener("submit", handleRecordSubmit);
  setTimeout(() => $("#record-form input, #record-form textarea, #record-form select")?.focus(), 0);
}

async function handleRecordSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const type = form.dataset.type;
  const id = form.dataset.id;
  const definition = formDefinitions[type];
  const payload = Object.fromEntries(new FormData(form).entries());
  if (payload.completed !== undefined) payload.completed = payload.completed === "true";
  if (payload.day_of_week) payload.day_of_week = Number(payload.day_of_week);
  if (type === "note") { payload.created_at ||= new Date().toISOString(); payload.updated_at = new Date().toISOString().slice(0, 10); }
  const submit = form.querySelector("button[type=submit]");
  try {
    setLoading(submit, true, "Saving…");
    await saveRecord(definition.collection, payload, state.user?.id || "preview-user", id);
    await refreshData();
    if (type === "task") { await recalculateAndSaveStreak(); await refreshData(); }
    closeModal();
    showToast("success", id ? "Updated" : "Added", `${definition.title} saved to your planner.`);
  } catch (error) { $("#modal-message").textContent = getAuthMessage(error); setLoading(submit, false); }
}

async function recalculateAndSaveStreak() {
  const completedDates = new Set((state.data?.tasks || []).filter((task) => task.completed).map((task) => task.due_date));
  let current = 0; let cursor = localDateKey();
  while (completedDates.has(cursor)) { current += 1; cursor = addDays(cursor, -1); }
  const sorted = [...completedDates].sort();
  let longest = 0; let run = 0; let previous = "";
  sorted.forEach((date) => { run = previous && addDays(previous, 1) === date ? run + 1 : 1; longest = Math.max(longest, run); previous = date; });
  const previousStreak = state.data?.streak || {};
  await saveStreak({ current_streak: current, longest_streak: Math.max(longest, previousStreak.longest_streak || 0), days_completed: completedDates.size }, state.user?.id || "preview-user");
}

async function toggleTask(id) {
  const task = getItem("task", id);
  if (!task) return;
  try { await saveRecord("tasks", { completed: !task.completed }, state.user?.id || "preview-user", id); await refreshData(); await recalculateAndSaveStreak(); await refreshData(); showToast("success", task.completed ? "Task reopened" : "Nice work", task.completed ? "It’s back on your open list." : "That small win counts."); }
  catch (error) { showToast("error", "Couldn’t update task", getAuthMessage(error)); }
}

async function removeItem(type, id) {
  const definition = formDefinitions[type];
  if (!confirm(`Delete this ${definition.title.toLowerCase()}?`)) return;
  try { await deleteRecord(definition.collection, id, state.user?.id || "preview-user"); await refreshData(); showToast("success", "Deleted", `${definition.title} removed.`); }
  catch (error) { showToast("error", "Couldn’t delete", getAuthMessage(error)); }
}

function closeModal() { $("#modal-root").innerHTML = ""; state.modalTrigger?.focus?.(); state.modalTrigger = null; }

function handleAction(event) {
  const target = event.target.closest("[data-action], [data-view-link], [data-view], [data-auth-view], [data-close-modal], [data-calendar-date]");
  if (!target) return;
  if (target.dataset.closeModal !== undefined) { if (target.classList.contains("modal-backdrop") || target.closest(".modal") === null || target.tagName === "BUTTON") closeModal(); return; }
  if (target.dataset.authView) { setAuthView(target.dataset.authView); return; }
  if (target.dataset.viewLink || target.dataset.view) { setView(target.dataset.viewLink || target.dataset.view); return; }
  if (target.dataset.calendarDate) { state.selectedDate = target.dataset.calendarDate; const date = dateFromKey(state.selectedDate); state.calendarMonth = new Date(date.getFullYear(), date.getMonth(), 1); renderCalendar(); return; }
  const action = target.dataset.action; const id = target.dataset.id;
  if (action === "add-task") openRecordModal("task");
  else if (action === "add-assignment") openRecordModal("assignment");
  else if (action === "add-exam") openRecordModal("exam");
  else if (action === "add-timetable") openRecordModal("timetable");
  else if (action === "add-note") openRecordModal("note");
  else if (action === "add-event") openRecordModal("event");
  else if (action === "toggle-task") toggleTask(id);
  else if (action === "edit-task") openRecordModal("task", id);
  else if (action === "delete-task") removeItem("task", id);
  else if (action === "edit-assignment") openRecordModal("assignment", id);
  else if (action === "delete-assignment") removeItem("assignment", id);
  else if (action === "edit-exam") openRecordModal("exam", id);
  else if (action === "delete-exam") removeItem("exam", id);
  else if (action === "edit-timetable") openRecordModal("timetable", id);
  else if (action === "delete-timetable") removeItem("timetable", id);
  else if (action === "edit-note") openRecordModal("note", id);
  else if (action === "delete-note") removeItem("note", id);
  else if (action === "edit-event") openRecordModal("event", id);
  else if (action === "delete-event") removeItem("event", id);
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const name = $("#profile-name").value.trim();
  if (!name) return authMessage("profile-message", "Please enter a display name.");
  try { await updateProfile({ full_name: name }, state.user?.id || "preview-user"); await refreshData(); authMessage("profile-message", "Profile saved.", true); showToast("success", "Profile updated", "Your name is looking good."); }
  catch (error) { authMessage("profile-message", getAuthMessage(error)); }
}

function bindEvents() {
  document.addEventListener("click", handleAction);
  $("#login-form").addEventListener("submit", handleLogin);
  $("#register-form").addEventListener("submit", handleRegister);
  $("#forgot-form").addEventListener("submit", handleForgot);
  $("#preview-button").addEventListener("click", () => { startPreview(); enterPlanner(getPreviewData().profile, true); });
  $("#preview-exit").addEventListener("click", () => { stopPreview(); state.data = null; showAuth(); });
  $("#theme-toggle").addEventListener("click", () => { toggleTheme(); renderAll(); });
  $("#settings-theme-toggle").addEventListener("click", (event) => { const next = toggleTheme(); event.currentTarget.classList.toggle("is-on", next === "dark"); renderAll(); });
  $("#open-nav").addEventListener("click", openNav);
  $("#close-nav").addEventListener("click", closeNav);
  $("#sidebar-scrim").addEventListener("click", closeNav);
  $("#sidebar-profile").addEventListener("click", () => setView("settings"));
  $("#top-avatar").addEventListener("click", () => setView("settings"));
  $("#logout-button").addEventListener("click", async () => { try { await signOut(); stopPreview(); state.data = null; showAuth(); showToast("success", "You’re logged out", "See you next time."); } catch (error) { showToast("error", "Couldn’t log out", getAuthMessage(error)); } });
  $("#notification-button").addEventListener("click", () => showToast("success", "You’re all caught up", "No new planner notifications right now."));
  $$("[data-setting-toggle]").forEach((switchButton) => switchButton.addEventListener("click", () => { const next = !switchButton.classList.contains("is-on"); switchButton.classList.toggle("is-on", next); switchButton.setAttribute("aria-checked", String(next)); localStorage.setItem(`campusplan-${switchButton.dataset.settingToggle}`, String(next)); }));
  $("#profile-form").addEventListener("submit", handleProfileSubmit);
  ["task-search", "task-filter", "task-category-filter"].forEach((id) => $("#" + id)?.addEventListener("input", renderTasks));
  ["assignment-search", "assignment-view-filter", "assignment-sort"].forEach((id) => $("#" + id)?.addEventListener("input", renderAssignments));
  $("#note-search")?.addEventListener("input", renderNotes);
  $("#calendar-prev").addEventListener("click", () => { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1); renderCalendar(); });
  $("#calendar-next").addEventListener("click", () => { state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1); renderCalendar(); });
  $("#calendar-today").addEventListener("click", () => { const now = new Date(); state.selectedDate = localDateKey(now); state.calendarMonth = new Date(now.getFullYear(), now.getMonth(), 1); renderCalendar(); });
  $$("[data-toggle-password]").forEach((button) => button.addEventListener("click", () => { const input = $("#" + button.dataset.togglePassword); input.type = input.type === "password" ? "text" : "password"; button.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password"); }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && $("#modal-root").firstElementChild) closeModal(); });
}

async function init() {
  initTheme();
  bindEvents();
  showSetupBanner();
  try {
    const session = await getSession();
    if (session?.user) await enterPlanner(session.user);
    else showAuth();
  } catch (error) { showAuth(); }
  if (supabase) watchAuth((session, event) => { if (event === "PASSWORD_RECOVERY") { openPasswordRecoveryModal(); return; } if (session?.user && !state.data) enterPlanner(session.user); });
}

init();
