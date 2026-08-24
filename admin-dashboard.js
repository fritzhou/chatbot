import { supabase } from "./supabaseClient.js";
import { requireAdminSession, signOut } from "./auth.js";
import {
  listCategories,
  createCategory,
  toggleCategoryActive,
  deleteCategory,
} from "./categories.js";
import {
  listFaqs,
  getFaqWithKeywords,
  createFaq,
  createFaqWithAutoTranslate,
  updateFaq,
  setFaqStatus,
  markVerified,
  deleteFaq,
} from "./faqs.js";
import { listUnanswered, markReviewed, markIgnored, markConverted } from "./unanswered.js";
import { getSummary, getTopMatchedFaqs, getLowestRatedFaqs } from "./analytics.js";

let categoriesCache = [];

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------
(async function init() {
  const admin = await requireAdminSession();
  if (!admin) return; // requireAdminSession already redirected

  document.getElementById("admin-name").textContent =
    admin.full_name || admin.role || "Admin";

  document.getElementById("sign-out-btn").addEventListener("click", async () => {
    await signOut();
    window.location.href = "admin-login.html";
  });

  wireTabs();
  wireFaqDialog();
  wireCategoryForm();
  wireFilters();

  categoriesCache = await listCategories();
  populateCategorySelects();

  await refreshFaqs();
  await refreshUnansweredBadge();
})();

// ---------------------------------------------------------
// Tabs
// ---------------------------------------------------------
function wireTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.dataset.tab;
      document.getElementById(`panel-${name}`).classList.add("active");

      if (name === "faqs") await refreshFaqs();
      if (name === "categories") await refreshCategories();
      if (name === "unanswered") await refreshUnanswered();
      if (name === "analytics") await refreshAnalytics();
      if (name === "audit") await refreshAuditLog();
    });
  });
}

function populateCategorySelects() {
  const filterSelect = document.getElementById("filter-category");
  const faqSelect = document.getElementById("faq-category");
  filterSelect.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  faqSelect.innerHTML = "";
  for (const cat of categoriesCache) {
    filterSelect.appendChild(new Option(cat.name, cat.id));
    faqSelect.appendChild(new Option(cat.name, cat.id));
  }
}

// ---------------------------------------------------------
// FAQs panel
// ---------------------------------------------------------
function wireFilters() {
  ["filter-status", "filter-category", "filter-language"].forEach((id) => {
    document.getElementById(id).addEventListener("change", refreshFaqs);
  });
  document.getElementById("new-faq-btn").addEventListener("click", () => openFaqDialog());
  document.getElementById("unanswered-status").addEventListener("change", refreshUnanswered);
}

async function refreshFaqs() {
  const status = document.getElementById("filter-status").value || undefined;
  const categoryId = document.getElementById("filter-category").value || undefined;
  const language = document.getElementById("filter-language").value || undefined;

  let rows;
  try {
    rows = await listFaqs({ status, categoryId, language });
  } catch (err) {
    console.error(err);
    return;
  }

  const tbody = document.querySelector("#faq-table tbody");
  tbody.innerHTML = "";
  for (const faq of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(truncate(faq.question, 70))}</td>
      <td>${escapeHtml(faq.categories?.name ?? "—")}</td>
      <td>${faq.language}</td>
      <td>${faq.priority}</td>
      <td><span class="status-chip" data-status="${faq.status}">${faq.status}</span></td>
      <td>${faq.is_machine_translated ? '<span class="mt-badge">🌐 MT</span>' : "—"}</td>
      <td>${faq.last_verified ?? "—"}</td>
      <td></td>
    `;
    const actionsCell = tr.lastElementChild;

    const editBtn = makeTextButton("Edit", () => openFaqDialog(faq.id));
    const verifyBtn = makeTextButton("Verify", async () => {
      await markVerified(faq.id);
      refreshFaqs();
    });
    const toggleBtn = makeTextButton(
      faq.status === "active" ? "Deactivate" : "Activate",
      async () => {
        await setFaqStatus(faq.id, faq.status === "active" ? "inactive" : "active");
        refreshFaqs();
      }
    );
    const deleteBtn = makeTextButton("Delete", async () => {
      if (
        !confirm(
          `Permanently delete "${truncate(faq.question, 60)}"? This removes the FAQ, its keywords, and any 👍/👎 feedback on it — none of that can be undone. Chat logs that mention this FAQ are kept (they just lose the link to it).\n\nTip: use "Deactivate" instead if you just want to hide it from students while keeping the option to bring it back.`
        )
      )
        return;
      await deleteFaq(faq.id, { hardDelete: true });
      refreshFaqs();
    });

    actionsCell.append(editBtn, verifyBtn, toggleBtn, deleteBtn);
    tbody.appendChild(tr);
  }
}

function makeTextButton(label, handler) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "text-btn";
  btn.textContent = label;
  btn.addEventListener("click", handler);
  return btn;
}

// ---------------------------------------------------------
// FAQ dialog (create / edit / convert-from-unanswered)
// ---------------------------------------------------------
function wireFaqDialog() {
  document.getElementById("faq-cancel-btn").addEventListener("click", () => {
    document.getElementById("faq-dialog").close();
  });
  document.getElementById("add-keyword-row").addEventListener("click", () => addKeywordRow());
  document.getElementById("faq-form").addEventListener("submit", handleFaqSubmit);
  document.getElementById("faq-language").addEventListener("change", updateAutoTranslateVisibility);
}

/**
 * The auto-translate option only makes sense when creating a
 * brand-new English FAQ — editing an existing FAQ, or writing
 * directly in Filipino/Cebuano, shouldn't spawn extra rows.
 */
function updateAutoTranslateVisibility() {
  const isNewFaq = !document.getElementById("faq-id").value;
  const isEnglish = document.getElementById("faq-language").value === "en";
  document.getElementById("auto-translate-row").hidden = !(isNewFaq && isEnglish);
}

function addKeywordRow(keyword = "", weight = 2) {
  const container = document.getElementById("keyword-rows");
  const row = document.createElement("div");
  row.className = "keyword-row";
  row.innerHTML = `
    <input type="text" class="kw-keyword" placeholder="keyword or phrase" value="${escapeAttr(keyword)}" />
    <input type="number" class="kw-weight" min="1" max="5" value="${weight}" />
    <button type="button" class="text-btn kw-remove">✕</button>
  `;
  row.querySelector(".kw-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

async function openFaqDialog(faqId = null, { prefillQuestion, unansweredId } = {}) {
  const dialog = document.getElementById("faq-dialog");
  const form = document.getElementById("faq-form");
  form.reset();
  document.getElementById("keyword-rows").innerHTML = "";
  document.getElementById("faq-form-error").hidden = true;
  document.getElementById("faq-id").value = "";
  document.getElementById("faq-source-unanswered-id").value = unansweredId ?? "";

  if (faqId) {
    document.getElementById("faq-dialog-title").textContent = "Edit FAQ";
    const { faq, keywords } = await getFaqWithKeywords(faqId);
    document.getElementById("faq-id").value = faq.id;
    document.getElementById("faq-question").value = faq.question;
    document.getElementById("faq-answer").value = faq.answer;
    document.getElementById("faq-category").value = faq.category_id ?? "";
    document.getElementById("faq-language").value = faq.language;
    document.getElementById("faq-priority").value = faq.priority;
    document.getElementById("faq-status").value = faq.status;
    document.getElementById("faq-source-name").value = faq.source_name ?? "";
    document.getElementById("faq-source-url").value = faq.source_url ?? "";
    document.getElementById("faq-last-verified").value = faq.last_verified ?? "";
    if (keywords.length) {
      keywords.forEach((k) => addKeywordRow(k.keyword, k.weight));
    } else {
      addKeywordRow();
    }
  } else {
    document.getElementById("faq-dialog-title").textContent = "New FAQ";
    document.getElementById("faq-question").value = prefillQuestion ?? "";
    addKeywordRow();
    addKeywordRow();
  }

  updateAutoTranslateVisibility();
  dialog.showModal();
}

async function handleFaqSubmit(event) {
  event.preventDefault();
  const errorEl = document.getElementById("faq-form-error");
  errorEl.hidden = true;

  const faqId = document.getElementById("faq-id").value || null;
  const unansweredId = document.getElementById("faq-source-unanswered-id").value || null;

  const faqFields = {
    question: document.getElementById("faq-question").value.trim(),
    answer: document.getElementById("faq-answer").value.trim(),
    category_id: document.getElementById("faq-category").value || null,
    language: document.getElementById("faq-language").value,
    priority: Number(document.getElementById("faq-priority").value) || 0,
    status: document.getElementById("faq-status").value,
    source_name: document.getElementById("faq-source-name").value.trim() || null,
    source_url: document.getElementById("faq-source-url").value.trim() || null,
    last_verified: document.getElementById("faq-last-verified").value || null,
  };

  const keywords = [...document.querySelectorAll(".keyword-row")].map((row) => ({
    keyword: row.querySelector(".kw-keyword").value,
    weight: row.querySelector(".kw-weight").value,
  }));

  const saveBtn = document.getElementById("faq-save-btn");
  saveBtn.disabled = true;
  try {
    let faq;
    const wantsAutoTranslate =
      !faqId &&
      !document.getElementById("auto-translate-row").hidden &&
      document.getElementById("faq-auto-translate").checked;

    if (faqId) {
      faq = await updateFaq(faqId, faqFields, keywords);
    } else if (wantsAutoTranslate) {
      const result = await createFaqWithAutoTranslate(faqFields, keywords, ["fil", "ceb"]);
      faq = result.primary;
    } else {
      faq = await createFaq(faqFields, keywords);
    }
    if (unansweredId) {
      await markConverted(unansweredId, faq.id);
    }
    document.getElementById("faq-dialog").close();
    await refreshFaqs();
    await refreshUnansweredBadge();
    if (document.getElementById("panel-unanswered").classList.contains("active")) {
      await refreshUnanswered();
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = friendlyFaqError(err);
    errorEl.hidden = false;
  } finally {
    saveBtn.disabled = false;
  }
}

// ---------------------------------------------------------
// Categories panel
// ---------------------------------------------------------
function wireCategoryForm() {
  document.getElementById("category-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("category-name").value.trim();
    const description = document.getElementById("category-description").value.trim();
    if (!name) return;
    await createCategory({ name, description: description || null });
    document.getElementById("category-form").reset();
    categoriesCache = await listCategories();
    populateCategorySelects();
    await refreshCategories();
  });
}

async function refreshCategories() {
  categoriesCache = await listCategories();
  populateCategorySelects();

  const tbody = document.querySelector("#category-table tbody");
  tbody.innerHTML = "";
  for (const cat of categoriesCache) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(cat.name)}</td>
      <td>${escapeHtml(cat.description ?? "—")}</td>
      <td><input type="checkbox" ${cat.is_active ? "checked" : ""} class="cat-active" /></td>
      <td></td>
    `;
    tr.querySelector(".cat-active").addEventListener("change", async (e) => {
      await toggleCategoryActive(cat.id, e.target.checked);
    });
    const deleteBtn = makeTextButton("Delete", async () => {
      if (!confirm(`Delete category "${cat.name}"? FAQs in it will become uncategorized.`)) return;
      try {
        await deleteCategory(cat.id);
        await refreshCategories();
      } catch (err) {
        alert(err.message);
      }
    });
    tr.lastElementChild.appendChild(deleteBtn);
    tbody.appendChild(tr);
  }
}

// ---------------------------------------------------------
// Unanswered panel
// ---------------------------------------------------------
async function refreshUnanswered() {
  const status = document.getElementById("unanswered-status").value;
  const rows = await listUnanswered(status);
  const tbody = document.querySelector("#unanswered-table tbody");
  tbody.innerHTML = "";

  for (const q of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(q.question)}</td>
      <td class="mono-small">${(q.detected_keywords || []).join(", ")}</td>
      <td>${new Date(q.created_at).toLocaleDateString()}</td>
      <td></td>
    `;
    const actionsCell = tr.lastElementChild;

    if (q.status === "new") {
      actionsCell.append(
        makeTextButton("Convert to FAQ", () =>
          openFaqDialog(null, { prefillQuestion: q.question, unansweredId: q.id })
        ),
        makeTextButton("Mark reviewed", async () => {
          await markReviewed(q.id);
          refreshUnanswered();
          refreshUnansweredBadge();
        }),
        makeTextButton("Ignore", async () => {
          await markIgnored(q.id);
          refreshUnanswered();
          refreshUnansweredBadge();
        })
      );
    }
    tbody.appendChild(tr);
  }
}

async function refreshUnansweredBadge() {
  const newOnes = await listUnanswered("new");
  const badge = document.getElementById("unanswered-badge");
  if (newOnes.length > 0) {
    badge.hidden = false;
    badge.textContent = newOnes.length;
  } else {
    badge.hidden = true;
  }
}

// ---------------------------------------------------------
// Analytics panel
// ---------------------------------------------------------
async function refreshAnalytics() {
  const [summary, topMatched, lowRated] = await Promise.all([
    getSummary(),
    getTopMatchedFaqs(),
    getLowestRatedFaqs(),
  ]);

  const statGrid = document.getElementById("stat-grid");
  statGrid.innerHTML = "";
  const stats = [
    ["Active FAQs", `${summary.activeFaqs}/${summary.totalFaqs}`],
    ["Chat messages", summary.totalLogs],
    ["Answer rate", summary.answerRate !== null ? `${summary.answerRate}%` : "—"],
    ["New unanswered", summary.newUnanswered],
  ];
  for (const [label, value] of stats) {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `<span class="value">${value}</span><span class="label">${label}</span>`;
    statGrid.appendChild(card);
  }

  const topBody = document.getElementById("top-matched-body");
  topBody.innerHTML = topMatched
    .map((r) => `<tr><td>${escapeHtml(r.question)}</td><td class="mono-small">${r.count}×</td></tr>`)
    .join("") || `<tr><td>No chat activity yet.</td></tr>`;

  const lowBody = document.getElementById("low-rated-body");
  lowBody.innerHTML = lowRated
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.question)}</td><td class="mono-small">👍 ${r.up} · 👎 ${r.down}</td></tr>`
    )
    .join("") || `<tr><td>No negative feedback yet.</td></tr>`;
}

// ---------------------------------------------------------
// Audit log panel
// ---------------------------------------------------------
async function refreshAuditLog() {
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("action, table_name, record_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const tbody = document.querySelector("#audit-table tbody");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="4">Could not load audit log.</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (row) => `
      <tr>
        <td class="mono-small">${new Date(row.created_at).toLocaleString()}</td>
        <td>${escapeHtml(row.action)}</td>
        <td>${escapeHtml(row.table_name)}</td>
        <td class="mono-small">${row.record_id ?? "—"}</td>
      </tr>`
    )
    .join("");
}

// ---------------------------------------------------------
// Small utilities
// ---------------------------------------------------------
function friendlyFaqError(err) {
  const message = err?.message || "";
  if (message.includes("uq_faq_keyword")) {
    return "Two of your keywords are the same (matching is case-insensitive, so \"Hi\" and \"hi\" count as one) — remove the duplicate and save again.";
  }
  return message || "Could not save this FAQ.";
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}
