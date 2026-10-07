import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { APP_REDIRECT_URL, SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config.js";

export const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const today = new Date();
const iso = (date) => date.toISOString().slice(0, 10);
const addDays = (days) => { const date = new Date(today); date.setDate(date.getDate() + days); return iso(date); };

const previewData = {
  profile: { id: "preview-user", full_name: "Sarah Chen", email: "sarah@example.com", longest_streak: 14, created_at: "2026-08-14T10:00:00Z" },
  tasks: [
    { id: "task-1", title: "Review lecture notes", description: "Consolidate week 5 notes before study group.", category: "Study", priority: "High", due_date: iso(today), completed: true },
    { id: "task-2", title: "Submit library book renewal", description: "", category: "College", priority: "Medium", due_date: iso(today), completed: true },
    { id: "task-3", title: "20-minute walk between classes", description: "", category: "Health", priority: "Low", due_date: iso(today), completed: true },
    { id: "task-4", title: "Email project partner", description: "Confirm the research presentation split.", category: "College", priority: "Medium", due_date: iso(today), completed: true },
    { id: "task-5", title: "Outline methods section", description: "", category: "Study", priority: "High", due_date: iso(today), completed: false },
    { id: "task-6", title: "Pick up oat milk", description: "", category: "Shopping", priority: "Low", due_date: iso(today), completed: false }
  ],
  assignments: [
    { id: "assignment-1", title: "Research methods reflection", subject: "PSY 204", description: "", due_date: addDays(1), priority: "High", completed: false },
    { id: "assignment-2", title: "Visual culture reading response", subject: "ART 112", description: "", due_date: addDays(4), priority: "Medium", completed: false },
    { id: "assignment-3", title: "Statistics problem set 3", subject: "MTH 120", description: "", due_date: addDays(-2), priority: "High", completed: true }
  ],
  exams: [
    { id: "exam-1", subject: "PSY 204", exam_name: "Research methods midterm", exam_date: addDays(5), exam_time: "10:00", location: "Hall B · 204", notes: "Focus on validity and reliability." },
    { id: "exam-2", subject: "MTH 120", exam_name: "Statistics quiz", exam_date: addDays(12), exam_time: "14:00", location: "Science 1 · 18", notes: "Bring calculator." },
    { id: "exam-3", subject: "ART 112", exam_name: "Visual culture final", exam_date: addDays(28), exam_time: "09:00", location: "Studio 3", notes: "" }
  ],
  timetable: [
    { id: "class-1", day_of_week: 2, subject: "Research methods", teacher: "Dr. Patel", room: "Hall B · 204", start_time: "09:30", end_time: "10:45" },
    { id: "class-2", day_of_week: 2, subject: "Visual culture", teacher: "M. Jones", room: "Arts · 12", start_time: "13:00", end_time: "14:15" },
    { id: "class-3", day_of_week: 4, subject: "Statistics", teacher: "K. Lee", room: "Science 1 · 18", start_time: "11:00", end_time: "12:15" },
    { id: "class-4", day_of_week: 5, subject: "Project studio", teacher: "Open lab", room: "Library · 3F", start_time: "15:00", end_time: "16:30" }
  ],
  notes: [
    { id: "note-1", title: "Questions for office hours", content: "Ask about the difference between internal and external validity. Bring the draft outline and check whether the sample size needs a short justification.", created_at: addDays(-5), updated_at: addDays(-1) },
    { id: "note-2", title: "Presentation moodboard", content: "Warm neutrals, a single electric lavender accent, generous white space. Keep charts legible and let the argument breathe.", created_at: addDays(-9), updated_at: addDays(-3) },
    { id: "note-3", title: "Tiny wins this week", content: "Made it to every morning class. Asked for help before the deadline. Took a real lunch break.", created_at: addDays(-12), updated_at: addDays(-2) }
  ],
  events: [
    { id: "event-1", title: "Study group", date: addDays(1), time: "16:30", description: "Library quiet floor · bring the methods outline." },
    { id: "event-2", title: "Maya’s birthday", date: addDays(6), time: "19:00", description: "Dinner near campus." },
    { id: "event-3", title: "Project check-in", date: addDays(9), time: "12:30", description: "Video call with the group." }
  ],
  streak: { current_streak: 7, longest_streak: 14, days_completed: 31 }
};

const preview = { active: false };
export function isPreviewMode() { return preview.active; }
export function startPreview() { preview.active = true; return previewData; }
export function stopPreview() { preview.active = false; }
export function getPreviewData() { return previewData; }

function table(name) {
  if (!supabase) throw new Error("Cloud sync is not configured yet.");
  return supabase.from(name);
}

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function watchAuth(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((event, session) => callback(session, event));
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Connect Supabase in js/config.js before signing in.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, fullName) {
  if (!supabase) throw new Error("Connect Supabase in js/config.js before creating an account.");
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: APP_REDIRECT_URL } });
  if (error) throw error;
  return data;
}

export async function resetPassword(email) {
  if (!supabase) throw new Error("Connect Supabase in js/config.js before requesting a reset link.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_REDIRECT_URL });
  if (error) throw error;
}

export async function updatePassword(password) {
  if (!supabase) throw new Error("Connect Supabase in js/config.js before changing your password.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export async function loadPlanner(userId) {
  if (preview.active) return structuredClone(previewData);
  const profileRequest = table("profiles").select("*").eq("id", userId).maybeSingle();
  const names = ["tasks", "assignments", "exams", "timetable", "notes", "events", "streaks"];
  const results = await Promise.all([profileRequest, ...names.map((name) => table(name).select("*").eq("user_id", userId))]);
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
  return {
    profile: results[0].data || { id: userId, full_name: "there", email: "" },
    tasks: results[1].data || [],
    assignments: results[2].data || [],
    exams: results[3].data || [],
    timetable: results[4].data || [],
    notes: results[5].data || [],
    events: results[6].data || [],
    streak: results[7].data?.[0] || { current_streak: 0, longest_streak: 0, days_completed: 0 }
  };
}

export async function saveRecord(collection, record, userId, id) {
  if (preview.active) {
    const list = previewData[collection];
    if (id) Object.assign(list.find((item) => item.id === id), record);
    else list.unshift({ ...record, id: `${collection}-${Date.now()}` });
    return record;
  }
  const payload = { ...record, user_id: userId };
  const query = id ? table(collection).update(payload).eq("id", id).eq("user_id", userId).select().single() : table(collection).insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deleteRecord(collection, id, userId) {
  if (preview.active) {
    const list = previewData[collection];
    const index = list.findIndex((item) => item.id === id);
    if (index >= 0) list.splice(index, 1);
    return;
  }
  const { error } = await table(collection).delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function updateProfile(profile, userId) {
  if (preview.active) { Object.assign(previewData.profile, profile); return previewData.profile; }
  const { data, error } = await table("profiles").update({ full_name: profile.full_name }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}

export async function saveStreak(streak, userId) {
  if (preview.active) { Object.assign(previewData.streak, streak); return previewData.streak; }
  const { data, error } = await table("streaks").upsert({ ...streak, user_id: userId }, { onConflict: "user_id" }).select().single();
  if (error) throw error;
  return data;
}

export function getAuthMessage(error) {
  const message = String(error?.message || error || "");
  if (/invalid login|invalid email or password/i.test(message)) return "Incorrect email or password. Try again or reset it below.";
  if (/already registered|already exists/i.test(message)) return "An account with that email already exists. Try signing in instead.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first, then come back to sign in.";
  if (/password/i.test(message) && /8|short|characters/i.test(message)) return "Password must contain at least 8 characters.";
  if (/network|fetch|connection/i.test(message)) return "We couldn't reach the cloud right now. Check your connection and try again.";
  return message || "Something went wrong. Please try again.";
}
