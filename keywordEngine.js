// =========================================================
// Keyword Engine
// Purpose: Normalize a student's question and score it
// against the FAQ keywords retrieved from Supabase.
// This module contains NO school-specific knowledge —
// every FAQ, answer, and keyword lives in Supabase.
// =========================================================

// Small stopword list. Kept intentionally short since the
// dataset is domain-specific (school FAQs), not general text.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been",
  "am", "i", "you", "he", "she", "it", "we", "they",
  "do", "does", "did", "can", "could", "will", "would", "should",
  "of", "in", "on", "at", "to", "for", "with", "about",
  "and", "or", "but", "so", "if", "my", "me", "please",
  "how", "what", "when", "where", "who", "why", "which",
]);

/**
 * Lowercases, strips punctuation, and splits a raw message
 * into meaningful tokens (stopwords removed).
 * @param {string} rawText
 * @returns {string[]} tokens
 */
export function tokenize(rawText) {
  if (!rawText) return [];
  const cleaned = rawText
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(" ")
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Scores each candidate FAQ by summing the weights of its
 * keywords that appear in the tokenized student message.
 * Multi-word keywords (e.g. "school id") are matched against
 * the normalized message string, not single tokens.
 *
 * @param {string} rawMessage - the student's raw message
 * @param {Array<{faq_id: string, keyword: string, weight: number}>} keywordRows
 * @returns {Map<string, number>} faq_id -> score
 */
export function scoreFaqs(rawMessage, keywordRows) {
  const tokens = tokenize(rawMessage);
  const tokenSet = new Set(tokens);
  const normalizedMessage = " " + tokens.join(" ") + " ";

  const scores = new Map();

  for (const row of keywordRows) {
    const keyword = (row.keyword || "").toLowerCase().trim();
    if (!keyword) continue;

    const keywordTokens = keyword.split(/\s+/);
    let matched = false;

    if (keywordTokens.length === 1) {
      matched = tokenSet.has(keyword);
    } else {
      // Phrase keyword: check the normalized message contains it
      matched = normalizedMessage.includes(" " + keyword + " ");
    }

    if (matched) {
      const current = scores.get(row.faq_id) || 0;
      scores.set(row.faq_id, current + row.weight);
    }
  }

  return scores;
}

/**
 * Picks the winning FAQ id from a score map, breaking ties
 * using each FAQ's priority (higher priority wins).
 *
 * @param {Map<string, number>} scores
 * @param {Map<string, number>} priorityById - faq_id -> priority
 * @param {number} minScore - minimum score to count as a real match
 * @returns {{faqId: string|null, score: number}}
 */
export function pickBestMatch(scores, priorityById, minScore = 2) {
  let bestId = null;
  let bestScore = -Infinity;
  let bestPriority = -Infinity;

  for (const [faqId, score] of scores.entries()) {
    const priority = priorityById.get(faqId) ?? 0;
    if (
      score > bestScore ||
      (score === bestScore && priority > bestPriority)
    ) {
      bestId = faqId;
      bestScore = score;
      bestPriority = priority;
    }
  }

  if (bestId === null || bestScore < minScore) {
    return { faqId: null, score: bestScore === -Infinity ? 0 : bestScore };
  }

  return { faqId: bestId, score: bestScore };
}
