const STORAGE_KEYS = {
  users: "fashion_users_v1",
  session: "fashion_session_v1",
  orders: "fashion_orders_by_user_v1"
};

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function loadUsers() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.users), []);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function loadOrdersStore() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.orders), {});
}

function saveOrdersStore(store) {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(store));
}

function generateUserId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "user_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function createUser({ name, email, password }) {
  const users = loadUsers();
  const normalizedEmail = normalizeEmail(email);
  if (!name || !normalizedEmail || !password) {
    throw new Error("Please fill all fields.");
  }
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error("Email already registered.");
  }

  const passwordHash = await hashPassword(password);
  const user = {
    id: generateUserId(),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash
  };
  users.push(user);
  saveUsers(users);
  return user;
}

async function loginWithEmailPassword({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const users = loadUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) throw new Error("Invalid email or password.");

  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Invalid email or password.");
  }
  return user;
}

function setSession(userId) {
  localStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({ userId, loginAt: Date.now() })
  );
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function getSession() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.session), null);
}

function getCurrentUser() {
  const session = getSession();
  if (!session || !session.userId) return null;
  return loadUsers().find((u) => u.id === session.userId) || null;
}

function requireAuthOrRedirect(loginPage = "login.html") {
  const current = getCurrentUser();
  if (!current) {
    window.location.replace(loginPage);
    return null;
  }
  return current;
}

function getOrdersForUser(userId) {
  const store = loadOrdersStore();
  const orders = store[userId];
  return Array.isArray(orders) ? orders : [];
}

function setOrdersForUser(userId, orders) {
  const store = loadOrdersStore();
  store[userId] = Array.isArray(orders) ? orders : [];
  saveOrdersStore(store);
}

window.Auth = {
  STORAGE_KEYS,
  loadUsers,
  createUser,
  loginWithEmailPassword,
  setSession,
  clearSession,
  getSession,
  getCurrentUser,
  requireAuthOrRedirect,
  getOrdersForUser,
  setOrdersForUser
};
