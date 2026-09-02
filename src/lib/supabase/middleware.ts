import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];
const AUTH_PREFIXES = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // Supabase isn't configured yet (e.g. fresh clone, before .env.local is
  // filled in): let requests through unauthenticated rather than crashing
  // every route via createServerClient's hard throw on a missing URL/key.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: avoid writing logic between createServerClient and getUser().
  // A stray error here can randomly log users out (see Supabase SSR docs).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Forward the already-validated user's email to Server Components via a
  // request header, so dashboard/layout.tsx can read it via headers()
  // instead of calling getUser() again -- that's a second network round
  // trip to Supabase's Auth API for something middleware already resolved.
  // Rebuild the response with the new header while preserving any cookies
  // setAll() may have already queued, rather than guessing whether mutating
  // requestHeaders after the fact would still be picked up.
  if (user?.email) {
    requestHeaders.set("x-user-email", user.email);
    const withHeader = NextResponse.next({ request: { headers: requestHeaders } });
    supabaseResponse.cookies.getAll().forEach((cookie) => withHeader.cookies.set(cookie));
    supabaseResponse = withHeader;
  }

  return supabaseResponse;
}
