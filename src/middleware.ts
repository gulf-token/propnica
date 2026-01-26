import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

// ===========================================
// Middleware
// ===========================================
// Handles authentication, session refresh, and
// route protection for the application

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Debug: log all cookies
  const allCookies = request.cookies.getAll();
  console.log(`[Middleware] Path: ${pathname}, Cookies:`, allCookies.map(c => c.name));

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() for secure server-side authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log(`[Middleware] User:`, user?.id ?? 'null');
  if (userError) {
    console.log(`[Middleware] User error:`, userError.message);
  }

  // For now, bypass server-side auth check due to SSR cookie issues
  // Auth will be checked client-side in protected pages
  // TODO: Fix SSR cookie handling for proper middleware auth

  // Just refresh the session and return
  return supabaseResponse;
}

// ===========================================
// Middleware Configuration
// ===========================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
