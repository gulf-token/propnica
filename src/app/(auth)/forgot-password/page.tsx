import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

// ===========================================
// Metadata
// ===========================================

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your propNICA account password.',
};

// ===========================================
// Forgot Password Page
// ===========================================
// Redirects to /reset-password which handles
// the password reset flow

export default function ForgotPasswordPage() {
  redirect('/reset-password');
}
