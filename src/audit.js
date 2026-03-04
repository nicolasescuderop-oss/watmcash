import { supabase } from "./supabase";

export async function logAction({ action, entity, entityId, monsterCode, monsterName, detail }) {
  try {
    await supabase.from("audit_log").insert({
      action,
      entity,
      entity_id: entityId || null,
      monster_code: monsterCode || null,
      monster_name: monsterName || null,
      detail: detail || null,
    });
  } catch (e) {
    console.warn("audit_log error:", e);
  }
}