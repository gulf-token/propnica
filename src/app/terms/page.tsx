import type { Metadata } from 'next';
import Link from 'next/link';
import { Video, ArrowLeft } from 'lucide-react';

// ===========================================
// Metadata
// ===========================================

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'propNICA Terms of Service - Read our terms and conditions for using our platform.',
};

// ===========================================
// Terms of Service Page
// ===========================================

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center space-x-2">
            <Video className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">propNICA</span>
          </Link>
          <Link
            href="/"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container max-w-4xl py-12">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using propNICA (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our Service. We reserve the right to
                update these terms at any time, and your continued use of the Service constitutes acceptance
                of any modifications.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                propNICA provides a platform for creating animated property videos with interactive maps
                and professional styling. Our Service includes tools for video editing, map animations,
                rendering, and exporting of property marketing content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed">
                To access certain features of the Service, you must create an account. You are responsible
                for maintaining the confidentiality of your account credentials and for all activities that
                occur under your account. You must provide accurate and complete information when creating
                your account and keep this information up to date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">4. User Content</h2>
              <p className="text-muted-foreground leading-relaxed">
                You retain ownership of any content you upload or create using our Service (&quot;User Content&quot;).
                By uploading content, you grant propNICA a non-exclusive, worldwide, royalty-free license to
                use, store, and process your content solely for the purpose of providing the Service to you.
                You represent that you have all necessary rights to the content you upload.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Upload content that infringes on intellectual property rights</li>
                <li>Create misleading or fraudulent property marketing materials</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">6. Subscription and Payment</h2>
              <p className="text-muted-foreground leading-relaxed">
                Certain features of the Service require a paid subscription. By subscribing, you agree to
                pay the applicable fees. Subscriptions automatically renew unless cancelled before the renewal
                date. Refunds are provided in accordance with our refund policy. We reserve the right to
                change pricing with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content (excluding User Content), features, and functionality
                are owned by propNICA and are protected by international copyright, trademark, patent,
                trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, propNICA shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, or any loss of profits or revenues,
                whether incurred directly or indirectly, or any loss of data, use, goodwill, or other
                intangible losses resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without
                prior notice or liability, for any reason, including breach of these Terms. Upon termination,
                your right to use the Service will immediately cease. You may also delete your account at
                any time through your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">10. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the United
                Arab Emirates, without regard to its conflict of law provisions. Any disputes arising from
                these Terms shall be resolved in the courts of Dubai, UAE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:legal@propnica.com" className="text-primary hover:underline">
                  legal@propnica.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} propNICA. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
