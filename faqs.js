import { supabase } from "./supabaseClient.js";
import { logAction } from "./auditLog.js";

/**
 * Lists FAQs for the admin table, including every status
 * (RLS allows admins to see inactive/needs_review/expired too).
 */
export async function listFaqs({ status, categoryId, language } = {}) {
  let query = supabase
    .from("faqs")
    .select(
      "id, question, answer, category_id, language, priority, status, source_name, source_url, last_verified, updated_at, is_machine_translated, categories(name)"
    )
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (language) query = query.eq("language", language);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getFaqWithKeywords(faqId) {
  const [{ data: faq, error: faqError }, { data: keywords, error: kwError }] =
    await Promise.all([
      supabase.from("faqs").select("*").eq("id", faqId).single(),
      supabase
        .from("faq_keywords")
        .select("id, keyword, weight")
        .eq("faq_id", faqId)
        .order("weight", { ascending: false }),
    ]);
  if (faqError) throw faqError;
  if (kwError) throw kwError;
  return { faq, keywords };
}

/**
 * Creates a new FAQ and its keyword rows.
 * @param {object} faqFields
 * @param {Array<{keyword: string, weight: number}>} keywords
 */
export async function createFaq(faqFields, keywords) {
  const { data: faq, error } = await supabase
    .from("faqs")
    .insert(faqFields)
    .select()
    .single();
  if (error) throw error;

  await logAction("FAQ_CREATED", "faqs", faq.id, {
    question: faqFields.question,
  });

  if (keywords.length > 0) {
    await replaceKeywords(faq.id, keywords);
  }

  return faq;
}

/**
 * Updates an existing FAQ and fully replaces its keyword set,
 * so the admin form is always the single source of truth for
 * what keywords are attached to an FAQ.
 */
export async function updateFaq(faqId, faqFields, keywords) {
  const { data: faq, error } = await supabase
    .from("faqs")
    .update(faqFields)
    .eq("id", faqId)
    .select()
    .single();
  if (error) throw error;

  await logAction("FAQ_UPDATED", "faqs", faqId, faqFields);
  await replaceKeywords(faqId, keywords);

  return faq;
}

async function replaceKeywords(faqId, keywords) {
  const { error: deleteError } = await supabase
    .from("faq_keywords")
    .delete()
    .eq("faq_id", faqId);
  if (deleteError) throw deleteError;
  await logAction("KEYWORD_REMOVED", "faq_keywords", faqId, { faqId, reason: "replace" });

  // Normalize first (trim + lowercase), THEN deduplicate — two rows
  // that only differ by case (e.g. "hi" and "Hi"), or that collapse
  // to the same word after translation, would otherwise both try to
  // insert the same (faq_id, lower(keyword)) pair and violate the
  // uq_faq_keyword constraint. When duplicates collide, keep the
  // highest weight rather than picking arbitrarily.
  const normalized = keywords
    .filter((k) => k.keyword && k.keyword.trim())
    .map((k) => ({
      keyword: k.keyword.trim().toLowerCase(),
      weight: Math.min(5, Math.max(1, Number(k.weight) || 1)),
    }));

  const byKeyword = new Map();
  for (const row of normalized) {
    const existing = byKeyword.get(row.keyword);
    if (!existing || row.weight > existing.weight) {
      byKeyword.set(row.keyword, row);
    }
  }

  const rows = [...byKeyword.values()].map((row) => ({ faq_id: faqId, ...row }));

  if (rows.length === 0) return;

  const { error: insertError } = await supabase
    .from("faq_keywords")
    .insert(rows);
  if (insertError) throw insertError;
  await logAction("KEYWORD_ADDED", "faq_keywords", faqId, {
    keywords: rows.map((r) => r.keyword),
  });
}

/**
 * Creates a primary-language FAQ, then calls the translate-faq
 * Edge Function to auto-generate the same FAQ in other
 * languages — so an admin never has to type it three times.
 *
 * Auto-generated translations are created with
 * status='needs_review' (regardless of the primary FAQ's
 * status) and is_machine_translated=true, so a bad machine
 * translation of something like a deadline or fee can't reach
 * students until an admin has actually looked at it.
 *
 * @param {object} faqFields - fields for the primary-language FAQ
 * @param {Array<{keyword: string, weight: number}>} keywords
 * @param {string[]} targetLanguages - e.g. ["fil", "ceb"]
 * @returns {{ primary: object, translated: object[] }}
 */
export async function createFaqWithAutoTranslate(faqFields, keywords, targetLanguages) {
  const primary = await createFaq(faqFields, keywords);

  if (!targetLanguages || targetLanguages.length === 0) {
    return { primary, translated: [] };
  }

  // Empty keyword rows (e.g. a blank "+ Add keyword" row the admin
  // never filled in) are safely dropped by createFaq/replaceKeywords
  // above, but that filtering is internal to this file — the Edge
  // Function gets whatever we send it. Apply the same filter here so
  // an empty string never gets sent to MyMemory (which rejects it
  // outright and fails the whole translation).
  const nonEmptyKeywords = keywords.filter((k) => k.keyword && k.keyword.trim());

  const { data: fnResult, error: fnError } = await supabase.functions.invoke("translate-faq", {
    body: {
      question: faqFields.question,
      answer: faqFields.answer,
      keywords: nonEmptyKeywords,
      sourceLanguage: faqFields.language,
      targetLanguages,
    },
  });

  // The primary FAQ has already saved successfully at this point —
  // any translation failure below is surfaced separately so the UI
  // can say "saved, but auto-translation failed" rather than losing
  // the admin's work.
  //
  // fnError only fires for transport-level failures (function not
  // found, network error, CORS). The function itself always
  // responds with HTTP 200 and puts any failure in fnResult.error
  // instead — see the comment in translate-faq/index.ts for why.
  if (fnError) {
    throw new Error(`FAQ saved, but auto-translation failed: ${fnError.message || fnError}`);
  }
  if (fnResult?.error) {
    throw new Error(`FAQ saved, but auto-translation failed: ${fnResult.error}`);
  }

  const translated = [];
  for (const lang of targetLanguages) {
    const t = fnResult?.translations?.[lang];
    if (!t) continue;

    const translatedFields = {
      ...faqFields,
      question: t.question,
      answer: t.answer,
      language: lang,
      status: "needs_review",
      is_machine_translated: true,
    };

    const faq = await createFaq(translatedFields, t.keywords || []);
    translated.push(faq);
  }

  return { primary, translated };
}

export async function setFaqStatus(faqId, status) {
  const { error } = await supabase
    .from("faqs")
    .update({ status })
    .eq("id", faqId);
  if (error) throw error;
  const action = status === "active" ? "FAQ_ACTIVATED" : "FAQ_DEACTIVATED";
  await logAction(action, "faqs", faqId, { status });
}

export async function markVerified(faqId) {
  const { error } = await supabase
    .from("faqs")
    .update({ last_verified: new Date().toISOString().slice(0, 10) })
    .eq("id", faqId);
  if (error) throw error;
  await logAction("FAQ_VERIFIED", "faqs", faqId, {});
}

/**
 * Soft-deletes by default (status = 'inactive') to preserve
 * chat_logs / feedback history. Pass hardDelete=true to actually
 * remove the row (only safe when it has no meaningful history).
 */
export async function deleteFaq(faqId, { hardDelete = false } = {}) {
  if (hardDelete) {
    const { error } = await supabase.from("faqs").delete().eq("id", faqId);
    if (error) throw error;
    await logAction("FAQ_DELETED", "faqs", faqId, { hardDelete: true });
  } else {
    await setFaqStatus(faqId, "inactive");
  }
}
