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
              <span className="font-semibold text-lg">propNICA</span>
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
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Features
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Pricing
                </span>
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
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Changelog
                </span>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Documentation
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Tutorials
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Blog
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Support
                </span>
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
                <span className="text-muted-foreground/50 cursor-not-allowed">
                  Cookie Policy
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} propNICA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
