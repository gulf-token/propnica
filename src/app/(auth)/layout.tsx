import { Video } from 'lucide-react';
import Link from 'next/link';

// ===========================================
// Auth Layout
// ===========================================

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="flex items-center space-x-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">PropertyClips</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} PropertyClips. All rights reserved.
      </footer>
    </div>
  );
}
