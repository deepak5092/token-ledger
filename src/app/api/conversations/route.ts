import { createClient } from "@/lib/supabase/server";
import { listConversations, createConversation, titleFromQuestion } from "@/lib/agent/conversations";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  const conversations = await listConversations(supabase);
  return Response.json({ conversations });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const title = body.title?.trim() ? titleFromQuestion(body.title) : "New chat";
  const conversation = await createConversation(supabase, user.id, title);
  if (!conversation) {
    return Response.json({ error: "Couldn't create conversation." }, { status: 500 });
  }
  return Response.json({ conversation });
}
