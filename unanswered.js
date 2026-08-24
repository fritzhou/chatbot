import { supabase } from "./supabaseClient.js";
import { logAction } from "./auditLog.js";

export async function listUnanswered(status = "new") {
  let query = supabase
    .from("unanswered_questions")
    .select("id, question, detected_keywords, status, created_at, reviewed_at, converted_faq_id")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markReviewed(id) {
  const { error } = await supabase
    .from("unanswered_questions")
    .update({ status: "reviewed", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAction("UNANSWERED_REVIEWED", "unanswered_questions", id, {});
}

export async function markIgnored(id) {
  const { error } = await supabase
    .from("unanswered_questions")
    .update({ status: "ignored", reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAction("UNANSWERED_IGNORED", "unanswered_questions", id, {});
}

/**
 * Links an unanswered question to the FAQ it was converted into.
 * The FAQ itself is created separately via faqs.js — this just
 * records the conversion for traceability.
 */
export async function markConverted(id, faqId) {
  const { error } = await supabase
    .from("unanswered_questions")
    .update({
      status: "converted",
      reviewed_at: new Date().toISOString(),
      converted_faq_id: faqId,
    })
    .eq("id", id);
  if (error) throw error;
  await logAction("UNANSWERED_CONVERTED", "unanswered_questions", id, { faqId });
}
