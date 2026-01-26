import { Header, Footer } from '@/components/layout';
import { AuthGuard } from '@/components/auth/auth-guard';

// ===========================================
// Dashboard Layout
// ===========================================
// Protected layout that requires authentication (client-side)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-muted/30">{children}</main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
