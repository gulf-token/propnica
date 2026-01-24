import * as React from 'react';
import Link from 'next/link';
import { Video } from 'lucide-react';

// ===========================================
// Footer Component
// ===========================================

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Video className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">PropertyClips</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Create stunning animated property videos with interactive maps and
              professional styling.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/features"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/templates"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Templates
                </Link>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/tutorials"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tutorials
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} PropertyClips. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
