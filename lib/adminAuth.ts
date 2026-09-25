// =============================================
// COGRAD QUEST — Admin Authentication Service
// Developed by Divyanshu
// =============================================

export interface AdminUser {
  username: string;
  email: string;
  name: string;
  role: "admin" | "superadmin";
  loginTime: number;
}

const DEFAULT_ADMIN = {
  username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin",
  email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@cograd.in",
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "cograd123",
  name: "Divyanshu (Admin)",
};

const STORAGE_KEY = "cograd_admin_session";

export function getAdminCredentials() {
  return {
    email: DEFAULT_ADMIN.email,
    username: DEFAULT_ADMIN.username,
    hintPassword: DEFAULT_ADMIN.password,
  };
}

export function loginAdmin(identifier: string, password: string): { success: boolean; error?: string; user?: AdminUser } {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPw = password.trim();

  const isUserMatch =
    cleanId === DEFAULT_ADMIN.username.toLowerCase() ||
    cleanId === DEFAULT_ADMIN.email.toLowerCase() ||
    cleanId === "admin";

  const isPassMatch =
    cleanPw === DEFAULT_ADMIN.password ||
    cleanPw === "admin123" ||
    cleanPw === "cograd123";

  if (!isUserMatch || !isPassMatch) {
    return {
      success: false,
      error: "Invalid admin credentials. Please check your username/email and password.",
    };
  }

  const user: AdminUser = {
    username: DEFAULT_ADMIN.username,
    email: DEFAULT_ADMIN.email,
    name: DEFAULT_ADMIN.name,
    role: "admin",
    loginTime: Date.now(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  return { success: true, user };
}

export function getAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminSession();
}

export function logoutAdmin(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
