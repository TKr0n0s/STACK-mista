import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
config({ path: resolve(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createTestUser() {
  const testEmail = 'teste@gmail.com'
  const testPassword = 'teste123'

  console.log('Creating user:', testEmail)

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  })

  let userId
  if (authError) {
    if (authError.message.includes('already been registered')) {
      // User exists, get their ID
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === testEmail)
      if (existing) {
        userId = existing.id
        console.log('User already exists:', userId)
        // Update password
        await supabase.auth.admin.updateUserById(userId, { password: testPassword })
      } else {
        console.error('Could not find existing user')
        process.exit(1)
      }
    } else {
      console.error('Auth error:', authError)
      process.exit(1)
    }
  } else {
    userId = authData.user.id
    console.log('User created:', userId)
  }

  // 2. Create profile (empty, will be filled during onboarding)
  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: testEmail,
      profile_completed: false,
    })

  if (profileError) {
    console.error('Profile error:', profileError)
  }

  // 3. Mark purchase as activated
  const { error: activationError } = await supabase
    .from('purchase_activations')
    .update({
      status: 'activated',
      activated_at: new Date().toISOString(),
      user_id: userId,
    })
    .eq('email', testEmail)

  if (activationError) {
    console.error('Activation error:', activationError)
  }

  console.log('\n✅ Test user created successfully!')
  console.log('Email:', testEmail)
  console.log('Password:', testPassword)
  console.log('User ID:', userId)
  console.log('\nYou can now login at: https://sempremagras.online/login')
}

createTestUser()
