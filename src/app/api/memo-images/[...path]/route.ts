import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (path.length < 3 || path[0] !== user.id || path.some((part) => !part || part === "." || part === "..")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data, error } = await supabase.storage.from("memo-images").download(path.join("/"));
  if (error || !data) return new NextResponse("Image not found", { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": data.type || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
