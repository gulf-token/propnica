'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

// ===========================================
// Root Page
// ===========================================
// Redirects to dashboard if logged in, otherwise to login

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
