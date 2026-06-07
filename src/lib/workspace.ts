import { createClient } from "@/lib/supabase/server";

// Returns the current user's workspace_id, or throws if unauthenticated.
// Used by server actions to satisfy RLS insert checks.
export async function getWorkspaceId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (error || !data) throw new Error("No workspace for user");
  return data.workspace_id;
}
