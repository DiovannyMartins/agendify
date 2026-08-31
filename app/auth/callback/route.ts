import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Only allow same-origin paths to avoid an open redirect (mirrors login).
  const requested = searchParams.get("next") ?? "/dashboard";
  const next = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\")
    ? requested
    : "/dashboard";

  const supabase = await createClient();
  let error: { message?: string } | null = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
    }));
  }

  if (!error) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocal = process.env.NODE_ENV === "development";
    if (isLocal) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
