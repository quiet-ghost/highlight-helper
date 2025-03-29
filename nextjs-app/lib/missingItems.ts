import { supabase } from "./supabaseClient";

export interface MissingItem {
  id: number;
  initials: string;
  cart_number: string;
  order_number: string;
  cart_location: string;
  bin_location: string;
  on_hand_qty: number; 
  qty_missing: number;
  description?: string;
  page_type: "tackle" | "tennis" | "running";
  timestamp: string;
  completed: boolean;
}

export async function saveMissingItem(item: Omit<MissingItem, "id" | "timestamp" | "completed">) {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  console.log("Session:", session);
  if (authError) throw authError;
  const { error } = await supabase.from("missing_items").insert([item]);
  if (error) throw error;
}

export async function getMissingItems(pageType: "tackle" | "tennis" | "running"): Promise<MissingItem[]> {
  const { data, error } = await supabase
    .from("missing_items")
    .select("*")
    .eq("page_type", pageType)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateMissingItem(pageType: "tackle" | "tennis" | "running", id: number, completed: boolean) {
  const { error } = await supabase
    .from("missing_items")
    .update({ completed })
    .eq("id", id)
    .eq("page_type", pageType);
  if (error) throw error;
}

export async function clearMissingItems(pageType: "tackle" | "tennis" | "running") {
  const { error } = await supabase
    .from("missing_items")
    .delete()
    .eq("page_type", pageType)
    .eq("completed", true);
  if (error) throw error;
}