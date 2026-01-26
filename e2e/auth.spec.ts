// ===========================================
// E2E Tests - Authentication Flow
// ===========================================

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page).toHaveTitle(/Propnica/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should display the signup page', async ({ page }) => {
    await page.goto('/signup');
    
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for validation error messages
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/login');
    
    // Find and click the sign up link
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Verify we're on the signup page
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    
    // Navigate back to login
    await page.getByRole('link', { name: /sign in/i }).click();
    
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display forgot password page', async ({ page }) => {
    await page.goto('/reset-password');
    
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });
});

test.describe('Dashboard Access', () => {
  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated users from editor to login', async ({ page }) => {
    await page.goto('/editor/test-project');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/Propnica/);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation elements
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });
});
