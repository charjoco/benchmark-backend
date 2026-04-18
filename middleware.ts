import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWLIST = (process.env.ADMIN_ALLOWLIST_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Login page is always reachable
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() re-validates the token with Supabase on every request —
  // safer than getSession() which only reads the local cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ALLOWLIST.includes(user.id)) {
    // Return 404 to avoid revealing the admin exists to unauthorized visitors
    return new NextResponse(null, { status: 404 });
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
