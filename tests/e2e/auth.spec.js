/**
 * Authentication E2E Tests
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to login page (root shows marketing page)
    await page.goto('/auth/login');
  });

  test('shows login page when not authenticated', async ({ page }) => {
    // Should show login form
    await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('displays email and password fields', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await expect(passwordInput).toBeEnabled();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder(/email/i).fill('invalid@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');

    // Click sign in button
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should show error message - check for error container (red background) or error text
    // Supabase returns various error messages like "Invalid login credentials"
    const errorContainer = page.locator('.bg-red-50');
    await expect(errorContainer).toBeVisible({ timeout: 10000 });
  });

  test('has sign up link or option', async ({ page }) => {
    // Should have option to create account
    const signUpLink = page.getByText(/sign up|create.*account|register/i);
    await expect(signUpLink).toBeVisible();
  });

  test('has forgot password link', async ({ page }) => {
    const forgotLink = page.getByText(/forgot.*password|reset.*password/i);
    await expect(forgotLink).toBeVisible();
  });
});
