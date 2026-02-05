import { test, expect } from '@playwright/test'

test.describe('Onboarding flow', () => {
  test('login page shows activation button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Queima Intermitente')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ativar Minha Conta' })).toBeVisible()
  })

  test('activation page shows email input', async ({ page }) => {
    await page.goto('/ativar')
    await expect(page.getByText('Bem-vinda ao Queima Intermitente')).toBeVisible()
    await expect(page.getByLabel('Email da compra')).toBeVisible()
  })

  test('privacy policy page is accessible', async ({ page }) => {
    await page.goto('/privacidade')
    await expect(page.getByText('Politica de Privacidade')).toBeVisible()
    await expect(page.getByText('Dados Coletados')).toBeVisible()
  })

  test('offline page shows message', async ({ page }) => {
    await page.goto('/offline')
    await expect(page.getByText('offline')).toBeVisible()
  })
})

test.describe('Protected routes redirect', () => {
  test('dashboard redirects to login when unauthenticated', async ({
    page,
  }) => {
    await page.goto('/dashboard')
    // Should redirect to login
    await page.waitForURL(/\/login/)
    await expect(page.getByText('Queima Intermitente')).toBeVisible()
  })
})
