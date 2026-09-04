import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMessages, deleteConversation } from "@/lib/agent/conversations";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/conversations/[id]">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await ctx.params;
  // RLS scopes this to the caller's own conversations; a foreign or
  // nonexistent id just returns an empty list rather than a 404 (both
  // look the same at the query level, and neither leaks anything).
  const messages = await getMessages(supabase, id);
  return Response.json({ messages });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/conversations/[id]">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await ctx.params;
  await deleteConversation(supabase, id);
  return Response.json({ ok: true });
}
