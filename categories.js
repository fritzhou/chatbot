import { supabase } from "./supabaseClient.js";
import { logAction } from "./auditLog.js";

export async function listCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description, is_active, created_at")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createCategory({ name, description }) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, description })
    .select()
    .single();
  if (error) throw error;
  await logAction("CATEGORY_CREATED", "categories", data.id, { name });
  return data;
}

export async function updateCategory(id, updates) {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logAction("CATEGORY_UPDATED", "categories", id, updates);
  return data;
}

export async function toggleCategoryActive(id, isActive) {
  return updateCategory(id, { is_active: isActive });
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
  await logAction("CATEGORY_DELETED", "categories", id, {});
}
