import { supabase } from "./supabaseClient.js";

/**
 * Writes one row to admin_audit_logs. Called after every admin
 * create/update/delete so the dashboard has a full audit trail.
 * Failures are logged to the console but never block the UI —
 * the primary action (e.g. saving an FAQ) has already succeeded.
 *
 * @param {string} action - e.g. "FAQ_CREATED", "KEYWORD_REMOVED"
 * @param {string} tableName - table the action affected
 * @param {string|null} recordId
 * @param {object} [details]
 */
export async function logAction(action, tableName, recordId, details = {}) {
  const { data: userData } = await supabase.auth.getUser();
  const adminId = userData?.user?.id;
  if (!adminId) return;

  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    table_name: tableName,
    record_id: recordId,
    details,
  });

  if (error) {
    console.error("Failed to write audit log", action, error);
  }
}
