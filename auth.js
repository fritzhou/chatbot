import { supabase } from "./supabaseClient.js";

/**
 * Signs an administrator in with Supabase Auth (email + password).
 * Note: this only authenticates the user. Whether they are actually
 * an authorized admin is decided by the `admins` table + RLS, not
 * by anything in this file — see requireAdminSession().
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Returns the current Supabase Auth session, or null.
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Confirms the signed-in user has a row in `admins` and is active.
 * Because `admins` has RLS restricting reads to `id = auth.uid()`,
 * a non-admin authenticated user simply gets no row back here —
 * they cannot see anyone else's admin status either.
 */
export async function getAdminProfile() {
  const { data, error } = await supabase
    .from("admins")
    .select("id, full_name, role, is_active")
    .maybeSingle();
  if (error) {
    console.error("Failed to load admin profile", error);
    return null;
  }
  return data && data.is_active ? data : null;
}

/**
 * Page guard for admin-dashboard.html. Redirects to login if there
 * is no session, or if the session exists but isn't an authorized
 * admin (e.g. a student who somehow authenticated).
 * Returns the admin profile on success.
 */
export async function requireAdminSession() {
  const session = await getSession();
  if (!session) {
    window.location.href = "admin-login.html";
    return null;
  }
  const admin = await getAdminProfile();
  if (!admin) {
    await signOut();
    window.location.href = "admin-login.html?unauthorized=1";
    return null;
  }
  return admin;
}
