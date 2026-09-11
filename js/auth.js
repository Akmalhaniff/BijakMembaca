const AUTH_KEY = "sbm_auth";
const USERS_KEY = "sbm_users";

function apiHeaders() {
  const h = { "Content-Type": "application/json" };
  if (API_TOKEN) h["Authorization"] = "Bearer " + API_TOKEN;
  return h;
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function fetchUsersFromSheet() {
  if (!API_URL) return null;
  try {
    const res = await fetch(API_URL + "?sheet=users", { headers: apiHeaders() });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        const users = rows.map(r => ({
          id: r.id,
          email: r.email,
          password: r.password,
          name: r.name,
          createdAt: r.createdAt
        })).filter(u => u.id && u.email && u.password);
        saveUsers(users);
        return users;
      }
    }
  } catch (e) {}
  return null;
}

async function saveUserToSheet(user) {
  if (!API_URL) return;
  const row = {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name,
    createdAt: user.createdAt
  };
  try {
    await fetch(API_URL + "?sheet=users", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ data: [row] })
    });
  } catch (e) {
    console.error("Failed to save user to sheet:", e);
  }
}

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "sha1$" + Math.abs(hash).toString(36) + "$" + btoa(password).slice(0, 16);
}

function verifyPassword(password, hash) {
  if (!hash || !hash.startsWith("sha1$")) return false;
  const expected = "sha1$" + Math.abs(hash.split("$")[1]).toString(36) + "$" + btoa(password).slice(0, 16);
  return hash === expected;
}

function generateUserId() {
  return "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function registerUser(email, password, name) {
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email sudah didaftarkan");
  }
  if (password.length < 4) {
    throw new Error("Kata laluan mesti sekurang-kurangnya 4 karakter");
  }
  const user = {
    id: generateUserId(),
    email: email.toLowerCase().trim(),
    password: hashPassword(password),
    name: name.trim(),
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  await saveUserToSheet(user);
  return user;
}

async function loginUser(email, password) {
  let users = getUsers();
  if (users.length === 0) {
    await fetchUsersFromSheet();
    users = getUsers();
  }
  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user) {
    throw new Error("Email tidak dijumpai");
  }
  if (!verifyPassword(password, user.password)) {
    throw new Error("Kata laluan salah");
  }
  const sessionUser = { id: user.id, email: user.email, name: user.name };
  setCurrentUser(sessionUser);
  return sessionUser;
}

function logoutUser() {
  setCurrentUser(null);
}

function requireAuth(redirectTo = "login.html") {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

function authGuard() {
  const user = getCurrentUser();
  const publicPages = ["login.html", "index.html"];
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (!user && !publicPages.includes(currentPage)) {
    window.location.href = "login.html";
  }
  return user;
}

function updateAuthUI() {
  const user = getCurrentUser();
  const authLinks = document.querySelectorAll("[data-auth]");
  authLinks.forEach(el => {
    if (user) {
      if (el.dataset.auth === "guest") el.style.display = "none";
      if (el.dataset.auth === "user") el.style.display = "";
    } else {
      if (el.dataset.auth === "guest") el.style.display = "";
      if (el.dataset.auth === "user") el.style.display = "none";
    }
  });
  const userNameEl = document.getElementById("userName");
  if (userNameEl && user) {
    userNameEl.textContent = user.name;
  }
}

async function ensureDefaultAdmin() {
  let users = getUsers();
  if (users.length === 0) {
    await fetchUsersFromSheet();
    users = getUsers();
  }
  if (users.length === 0) {
    const admin = {
      id: "admin",
      email: "admin@sekolah.edu.my",
      password: hashPassword("admin123"),
      name: "Admin",
      createdAt: new Date().toISOString()
    };
    users.push(admin);
    saveUsers(users);
    await saveUserToSheet(admin);
  }
}

function initAuth() {
  ensureDefaultAdmin();
  updateAuthUI();
  document.addEventListener("click", e => {
    if (e.target.matches("[data-logout]")) {
      logoutUser();
      window.location.href = "login.html";
    }
  });
}

initAuth();