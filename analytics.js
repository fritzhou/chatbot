import { supabase } from "./supabaseClient.js";

/**
 * Pulls a small set of headline numbers for the analytics tab.
 * Uses count-only queries where possible to avoid pulling full
 * row sets just to display a number.
 */
export async function getSummary() {
  const [
    totalFaqs,
    activeFaqs,
    totalLogs,
    answeredLogs,
    newUnanswered,
  ] = await Promise.all([
    countRows("faqs"),
    countRows("faqs", (q) => q.eq("status", "active")),
    countRows("chatbot_logs"),
    countRows("chatbot_logs", (q) => q.eq("was_answered", true)),
    countRows("unanswered_questions", (q) => q.eq("status", "new")),
  ]);

  const answerRate = totalLogs > 0 ? Math.round((answeredLogs / totalLogs) * 100) : null;

  return { totalFaqs, activeFaqs, totalLogs, answeredLogs, answerRate, newUnanswered };
}

async function countRows(table, modify) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (modify) query = modify(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Most-matched FAQs, useful for spotting what students ask most.
 */
export async function getTopMatchedFaqs(limit = 8) {
  const { data, error } = await supabase
    .from("chatbot_logs")
    .select("matched_faq_id, faqs(question)")
    .not("matched_faq_id", "is", null)
    .limit(500);
  if (error) throw error;

  const counts = new Map();
  for (const row of data) {
    const key = row.matched_faq_id;
    const question = row.faqs?.question ?? "(deleted FAQ)";
    const entry = counts.get(key) || { question, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }

  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/**
 * FAQs with the most 👎 feedback, so admins know what to
 * review or rewrite first.
 */
export async function getLowestRatedFaqs(limit = 8) {
  const { data, error } = await supabase
    .from("faq_feedback")
    .select("faq_id, is_helpful, faqs(question)")
    .limit(1000);
  if (error) throw error;

  const stats = new Map();
  for (const row of data) {
    const entry = stats.get(row.faq_id) || {
      question: row.faqs?.question ?? "(deleted FAQ)",
      up: 0,
      down: 0,
    };
    if (row.is_helpful) entry.up += 1;
    else entry.down += 1;
    stats.set(row.faq_id, entry);
  }

  return [...stats.values()]
    .filter((s) => s.down > 0)
    .sort((a, b) => b.down - a.down)
    .slice(0, limit);
}
