/**
 * Teste E2E Completo: Verificar Fix "Dia 3"
 *
 * Este teste verifica que novos usuários veem "Dia 1" (não "Dia 3")
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP_URL = 'https://sempremagras.online'
const TEST_EMAIL = `e2e-fix-dia3-${Date.now()}@example.com`

let supabase: ReturnType<typeof createClient>
let userId: string | null = null

test.describe('Fix Dia 3: Novo usuário deve ver Dia 1', () => {
  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    console.log(`\n🧪 Teste E2E: Fix "Dia 3"`)
    console.log(`📧 Email: ${TEST_EMAIL}\n`)
  })

  test.afterAll(async () => {
    if (userId) {
      console.log('\n🧹 Limpando dados de teste...')
      await supabase.from('users').delete().eq('id', userId)
      await supabase.from('purchase_activations').delete().eq('email', TEST_EMAIL)
      console.log('✅ Dados limpos\n')
    }
  })

  test('1. Verificar migração aplicada', async () => {
    console.log('\n📊 STEP 1: Verificando coluna program_start_date...')

    const { error } = await supabase
      .from('users')
      .select('program_start_date')
      .limit(1)

    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      throw new Error('❌ Coluna program_start_date não existe! Execute: node scripts/execute-migration-direct.mjs')
    }

    console.log('✅ Coluna exists!')
  })

  test('2. Inserir compra de teste', async () => {
    console.log('\n🛒 STEP 2: Inserindo compra...')

    const orderId = `E2E-FIX-${Date.now()}`

    const { error } = await supabase.from('purchase_activations').insert({
      email: TEST_EMAIL,
      transaction_id: orderId,
      status: 'pending',
      webhook_payload: {
        order_id: orderId,
        order_status: 'paid',
        customer_email: TEST_EMAIL,
      },
    })

    expect(error).toBeNull()
    console.log(`✅ Compra inserida: ${orderId}`)
  })

  test('3. Login + Onboarding + Dashboard', async ({ page }) => {
    console.log('\n🔑 STEP 3: Testando fluxo completo...\n')

    // LOGIN
    console.log('   🔑 Login...')
    await page.goto(`${APP_URL}/login`)
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await emailInput.fill(TEST_EMAIL)

    const loginButton = page.locator('button:has-text("Entrar")')
    await loginButton.click()

    await page.waitForURL('**/onboarding', { timeout: 15000 })
    console.log('   ✅ Redirecionado para /onboarding')

    // Verificar banco após login
    const { data: userAfterLogin } = await supabase
      .from('users')
      .select('*')
      .eq('email', TEST_EMAIL)
      .single()

    expect(userAfterLogin).not.toBeNull()
    expect(userAfterLogin?.profile_completed).toBe(false)
    expect(userAfterLogin?.program_start_date).toBeNull()
    userId = userAfterLogin?.id || null

    console.log('   📊 Banco após login:')
    console.log(`      - program_start_date: ${userAfterLogin?.program_start_date || 'NULL ✅'}`)
    console.log(`      - profile_completed: false ✅`)

    // ONBOARDING
    console.log('\n   📝 Onboarding...')
    await page.locator('input[name="name"]').fill('E2E Test Fix Dia 3')
    await page.locator('input[name="age"]').fill('30')
    await page.locator('input[name="weight"]').fill('70')
    await page.locator('input[name="targetWeight"]').fill('65')

    const activitySelect = page.locator('select[name="activityLevel"]')
    await activitySelect.selectOption('moderate')

    const proteinSelect = page.locator('select[name="proteinPreference"]')
    await proteinSelect.selectOption('chicken')

    await page.locator('input[name="fastingStart"]').fill('20')
    await page.locator('input[name="fastingEnd"]').fill('12')

    const submitButton = page.locator('button[type="submit"]:has-text("Começar")')
    await submitButton.click()

    await page.waitForURL('**/dashboard', { timeout: 15000 })
    console.log('   ✅ Redirecionado para /dashboard')

    // Aguardar atualização do banco
    await page.waitForTimeout(2000)

    // Verificar banco após onboarding
    const { data: userAfterOnboarding } = await supabase
      .from('users')
      .select('*')
      .eq('email', TEST_EMAIL)
      .single()

    expect(userAfterOnboarding?.profile_completed).toBe(true)
    expect(userAfterOnboarding?.program_start_date).not.toBeNull()

    console.log('\n   📊 Banco após onboarding:')
    console.log(`      - program_start_date: ${userAfterOnboarding?.program_start_date} ✅`)
    console.log(`      - profile_completed: true ✅`)

    // Calcular dia
    const startDate = new Date(userAfterOnboarding!.program_start_date)
    const daysSince = Math.floor((Date.now() - startDate.getTime()) / 86400000)
    const programDay = (daysSince % 7) + 1

    console.log(`      - Dias desde início: ${daysSince}`)
    console.log(`      - Dia calculado: ${programDay}`)

    expect(programDay).toBe(1)
    console.log('   ✅ Cálculo correto: Dia 1!')

    // DASHBOARD
    console.log('\n   🎯 Verificando dashboard...')
    await page.waitForTimeout(2000)

    const content = await page.content()

    const hasDia1 = content.includes('Dia 1') || content.includes('dia 1')
    const hasSemana1 = content.includes('Semana 1') || content.includes('semana 1')
    const hasDia3 = content.includes('Dia 3') || content.includes('dia 3')
    const hasTresDias = content.includes('Três dias') || content.includes('três dias')

    console.log(`      - Contém "Dia 1": ${hasDia1 ? '✅' : '❌'}`)
    console.log(`      - Contém "Semana 1": ${hasSemana1 ? '✅' : '❌'}`)
    console.log(`      - Contém "Dia 3": ${hasDia3 ? '❌ ERRO!' : '✅'}`)
    console.log(`      - Contém "Três dias": ${hasTresDias ? '❌ ERRO!' : '✅'}`)

    expect(hasDia1 || hasSemana1).toBe(true)
    expect(hasDia3).toBe(false)
    expect(hasTresDias).toBe(false)

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/fix-dia-3-dashboard.png',
      fullPage: true,
    })
    console.log('   📸 Screenshot salvo!')

    console.log('\n🎉 TESTE PASSOU! Dashboard mostra "Dia 1" corretamente! 🎉\n')
  })
})
