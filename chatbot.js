import { supabase } from "./supabaseClient.js";
import { tokenize, scoreFaqs, pickBestMatch } from "./keywordEngine.js";

const chatLog = document.getElementById("chat-log");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const languageSelect = document.getElementById("language-select");
const categoryRail = document.getElementById("category-rail");
const brandCategoryList = document.getElementById("brand-category-list");
const statusLine = document.getElementById("connection-status");
const statusLabel = document.getElementById("status-label");
const themeToggle = document.getElementById("theme-toggle");
const menuBtn = document.getElementById("menu-btn");
const menuPopover = document.getElementById("menu-popover");

const FALLBACK_MESSAGE =
  "I don't have a confirmed answer for that yet. I've forwarded your " +
  "question to the front desk so it can be added to the knowledge base.";

// Small icon lookup so category chips feel like the reference design
// without hard-coding school-specific categories into the source code.
const CATEGORY_ICONS = {
  "tuition & fees": "💵",
  tuition: "💵",
  enrollment: "📝",
  registrar: "🗂️",
  scholarships: "🎓",
  admissions: "🏫",
  "student services": "🧑‍🎓",
  "campus facilities": "🏛️",
  "contact information": "📞",
  contact: "📞",
  schedule: "📅",
};

init();

async function init() {
  form.addEventListener("submit", handleSubmit);
  wireThemeToggle();
  wireMenu();
  await loadCategories();
  addBotBubble(
    "Hi! I'm the Lourdes College School Inquiry Assistant. Ask me about enrollment, " +
      "tuition, the registrar, scholarships, or campus services."
  );
}

// ---------------------------------------------------------
// Theme toggle (persists via localStorage on this static site)
// ---------------------------------------------------------
function wireThemeToggle() {
  const saved = localStorage.getItem("faq-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (prefersDark ? "dark" : "light"));

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("faq-theme", next);
  });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById("theme-icon-sun").hidden = theme === "dark";
  document.getElementById("theme-icon-moon").hidden = theme !== "dark";
}

// ---------------------------------------------------------
// "More options" popover (language switcher + staff sign-in)
// ---------------------------------------------------------
function wireMenu() {
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = menuPopover.hidden;
    menuPopover.hidden = !isHidden;
    menuBtn.setAttribute("aria-expanded", String(isHidden));
  });
  document.addEventListener("click", (e) => {
    if (!menuPopover.hidden && !menuPopover.contains(e.target) && e.target !== menuBtn) {
      menuPopover.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
  languageSelect.addEventListener("change", () => {
    menuPopover.hidden = true;
  });
}

// ---------------------------------------------------------
// Categories: populate both the mobile quick-chip rail and
// the desktop brand-panel sidebar from the same Supabase data.
// ---------------------------------------------------------
async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Failed to load categories", error);
    setStatus("offline");
    return;
  }

  setStatus("online");

  categoryRail.innerHTML = "";
  brandCategoryList.innerHTML = "";

  for (const category of data) {
    const icon = CATEGORY_ICONS[category.name.toLowerCase()] || "💬";

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.innerHTML = `<span aria-hidden="true">${icon}</span> ${escapeHtml(category.name)}`;
    categoryRail.appendChild(chip);

    const link = document.createElement("button");
    link.type = "button";
    link.className = "brand-link-btn";
    link.innerHTML = `<span aria-hidden="true">${icon}</span> ${escapeHtml(category.name)}`;
    brandCategoryList.appendChild(link);

    // Chip and sidebar link both represent the same category, so
    // clicking either highlights both (mobile rail + desktop panel
    // stay in sync) and clears any previously selected pair.
    const handler = () => {
      document.querySelectorAll(".chip.selected, .brand-link-btn.selected").forEach((el) =>
        el.classList.remove("selected")
      );
      chip.classList.add("selected");
      link.classList.add("selected");
      browseCategory(category);
    };
    chip.addEventListener("click", handler);
    link.addEventListener("click", handler);
  }
}

/**
 * Category chips used to work by typing an English sentence like
 * "Tell me about Campus Facilities" and running it through the
 * keyword matcher — which only ever worked in English, since a
 * Filipino/Cebuano FAQ's keywords are in Filipino/Cebuano, not
 * English. This fetches that category's active FAQs directly, in
 * whichever language is currently selected, sidestepping the
 * matcher (and the language mismatch) entirely.
 */
async function browseCategory(category) {
  addUserBubble(category.name);
  const language = languageSelect.value || "en";
  const typingBubble = addBotBubble("Typing…", true);

  try {
    const { data, error } = await supabase
      .from("faqs")
      .select("id, question, answer, source_name, source_url, last_verified")
      .eq("category_id", category.id)
      .eq("language", language)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .limit(5);

    typingBubble.closest(".bubble-group").remove();
    if (error) throw error;

    await supabase.from("chatbot_logs").insert({
      user_question: `[category] ${category.name}`,
      matched_faq_id: data?.[0]?.id ?? null,
      category_id: category.id,
      language,
      match_score: null,
      was_answered: Boolean(data && data.length > 0),
    });

    if (!data || data.length === 0) {
      addBotBubble(
        "There aren't any published answers for this category in the selected language yet. Try switching language from the ⋯ menu, or type your question directly."
      );
      return;
    }

    for (const faq of data) {
      addAnswerCard(faq, null);
    }
  } catch (err) {
    console.error(err);
    typingBubble.closest(".bubble-group").remove();
    addBotBubble(
      "I'm having trouble reaching the records system right now. Please try again shortly."
    );
  }
}

function setStatus(state) {
  statusLine.dataset.state = state;
  statusLabel.textContent = state === "online" ? "Online · replies instantly" : "Desk offline";
}

// ---------------------------------------------------------
// Chat submit / matching pipeline
// ---------------------------------------------------------
async function handleSubmit(event) {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  addUserBubble(message);
  input.value = "";
  input.disabled = true;

  const typingBubble = addBotBubble("Typing…", true);

  try {
    const result = await answerQuestion(message);
    typingBubble.closest(".bubble-group").remove();
    renderAnswer(result);
  } catch (err) {
    console.error(err);
    typingBubble.closest(".bubble-group").remove();
    addBotBubble(
      "I'm having trouble reaching the records system right now. Please try again shortly."
    );
  } finally {
    input.disabled = false;
    input.focus();
  }
}

/**
 * Runs the full match pipeline for one student message:
 * normalize -> extract keywords -> query Supabase ->
 * score -> select best match -> log analytics.
 */
async function answerQuestion(message) {
  const language = languageSelect.value || "en";
  const tokens = tokenize(message);

  // Only retrieve keyword rows for currently active FAQs in the
  // selected language, since that's all the matcher needs.
  const { data: keywordRows, error } = await supabase
    .from("faq_keywords")
    .select(
      "keyword, weight, faq_id, faqs!inner(id, question, answer, priority, status, category_id, language, source_name, source_url, last_verified)"
    )
    .eq("faqs.status", "active")
    .eq("faqs.language", language);

  if (error) throw error;

  const priorityById = new Map();
  const faqById = new Map();
  for (const row of keywordRows) {
    priorityById.set(row.faq_id, row.faqs.priority ?? 0);
    faqById.set(row.faq_id, row.faqs);
  }

  const scores = scoreFaqs(message, keywordRows);
  const { faqId, score } = pickBestMatch(scores, priorityById);
  const matchedFaq = faqId ? faqById.get(faqId) : null;

  const logInsert = await supabase
    .from("chatbot_logs")
    .insert({
      user_question: message,
      matched_faq_id: matchedFaq ? matchedFaq.id : null,
      category_id: matchedFaq ? matchedFaq.category_id : null,
      language,
      match_score: score,
      was_answered: Boolean(matchedFaq),
    })
    .select("id")
    .single();

  if (logInsert.error) {
    console.error("Failed to write chatbot log", logInsert.error);
  }
  const chatLogId = logInsert.data ? logInsert.data.id : null;

  if (!matchedFaq) {
    const { error: unansweredError } = await supabase
      .from("unanswered_questions")
      .insert({
        question: message,
        detected_keywords: tokens,
      });
    if (unansweredError) {
      console.error("Failed to log unanswered question", unansweredError);
    }
  }

  return { matchedFaq, chatLogId };
}

function renderAnswer({ matchedFaq, chatLogId }) {
  if (!matchedFaq) {
    addBotBubble(FALLBACK_MESSAGE);
    return;
  }
  addAnswerCard(matchedFaq, chatLogId);
}

/**
 * Renders a matched FAQ as a rich card rather than a plain bubble:
 * header (avatar + "Here's what I found" + a Verified badge when
 * an admin has explicitly verified it), the answer body (with
 * light bullet-list support), a Sources block when the FAQ has a
 * source_url, and a footer with the verified date + feedback.
 */
function addAnswerCard(faq, chatLogId) {
  const card = document.createElement("div");
  card.className = "answer-card";

  const isVerified = Boolean(faq.last_verified);

  card.innerHTML = `
    <div class="answer-card__header">
      <div class="answer-card__avatar"><img src="logo-mark.svg" alt="" class="mark-icon" /></div>
      <div class="answer-card__title">
        <p class="answer-card__name">School Inquiry Assistant</p>
        <p class="answer-card__subtitle">Here's what I found:</p>
      </div>
      ${isVerified ? `<span class="verified-badge">✓ Verified</span>` : ""}
    </div>
    <div class="answer-card__body">${formatAnswerText(faq.answer)}</div>
    ${faq.source_url ? renderSources(faq) : ""}
    <div class="answer-card__footer">
      ${isVerified ? `<span class="verified-date">🕐 ${escapeHtml(formatDate(faq.last_verified))}</span>` : "<span></span>"}
      <span class="feedback-label">Was this answer helpful?</span>
    </div>
  `;

  const footer = card.querySelector(".answer-card__footer");
  const feedbackBar = buildFeedbackBar(faq.id, chatLogId);
  footer.appendChild(feedbackBar);

  chatLog.appendChild(card);
  chatLog.scrollTop = chatLog.scrollHeight;
  return card;
}

function renderSources(faq) {
  return `
    <div class="answer-card__sources">
      <p class="sources-label">📄 Sources</p>
      <a class="source-link" href="${escapeAttr(faq.source_url)}" target="_blank" rel="noopener noreferrer">
        <span class="source-icon" aria-hidden="true">🌐</span>
        <span class="source-text">
          <span class="source-name">${escapeHtml(faq.source_name || "Source")}</span>
          <span class="source-url">${escapeHtml(faq.source_url)}</span>
        </span>
        <span class="external-icon" aria-hidden="true">↗</span>
      </a>
    </div>
  `;
}

/**
 * Lightweight formatter: turns plain-text FAQ answers into HTML,
 * treating lines starting with "- " or "• " as a bullet list and
 * everything else as paragraphs. Answers with no bullet lines
 * (the common case) just render as a single paragraph, unchanged
 * from before.
 */
function formatAnswerText(text) {
  const lines = String(text).split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let html = "";
  let inList = false;

  for (const line of lines) {
    const isBullet = /^[-•]\s+/.test(line);
    if (isBullet) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.replace(/^[-•]\s+/, ""))}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";

  return html || `<p>${escapeHtml(text)}</p>`;
}

function buildFeedbackBar(faqId, chatLogId) {
  const bar = document.createElement("div");
  bar.className = "feedback-bar";

  const upBtn = makeFeedbackButton("👍", true);
  const downBtn = makeFeedbackButton("👎", false);
  bar.append(upBtn, downBtn);

  async function submitFeedback(isHelpful) {
    upBtn.disabled = true;
    downBtn.disabled = true;
    const { error } = await supabase.from("faq_feedback").insert({
      faq_id: faqId,
      chat_log_id: chatLogId,
      is_helpful: isHelpful,
    });
    bar.textContent = error ? "Feedback failed to send." : "Thanks for the feedback.";
  }

  upBtn.addEventListener("click", () => submitFeedback(true));
  downBtn.addEventListener("click", () => submitFeedback(false));
  return bar;
}

function makeFeedbackButton(label, isHelpful) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "feedback-btn";
  btn.textContent = label;
  btn.setAttribute(
    "aria-label",
    isHelpful ? "Mark answer as helpful" : "Mark answer as not helpful"
  );
  return btn;
}

// ---------------------------------------------------------
// Bubble rendering (with a timestamp under each message,
// matching the reference chat-widget design)
// ---------------------------------------------------------
function addUserBubble(text) {
  return addBubble(text, "from-user", "bubble-user", true, true);
}

function addBotBubble(text, isTyping = false) {
  return addBubble(text, "from-bot", "bubble-bot" + (isTyping ? " bubble-typing" : ""), !isTyping);
}

function addBubble(text, groupClass, bubbleClass, showTime = true, showReadReceipt = false) {
  const group = document.createElement("div");
  group.className = `bubble-group ${groupClass}`;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${bubbleClass}`;
  bubble.textContent = text;
  group.appendChild(bubble);

  if (showTime) {
    const time = document.createElement("span");
    time.className = "bubble-time";
    time.textContent = formatTime(new Date());
    if (showReadReceipt) {
      // Purely decorative "sent" indicator matching a messaging-app
      // look — there's no real delivery/read tracking behind it.
      const receipt = document.createElement("span");
      receipt.className = "read-receipt";
      receipt.setAttribute("aria-hidden", "true");
      receipt.textContent = "✓✓";
      time.appendChild(receipt);
    }
    group.appendChild(time);
  }

  chatLog.appendChild(group);
  chatLog.scrollTop = chatLog.scrollHeight;
  return bubble;
}

function formatTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}
