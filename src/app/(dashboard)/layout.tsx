import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Header, Footer } from '@/components/layout';

// ===========================================
// Dashboard Layout
// ===========================================
// Protected layout that requires authentication

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">{children}</main>
      <Footer />
    </div>
  );
}
