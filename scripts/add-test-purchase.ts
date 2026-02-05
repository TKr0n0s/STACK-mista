import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function addTestPurchase() {
  const email = 'thetraderkronos@gmail.com'
  const transactionId = `TEST-${Date.now()}`

  console.log(`Adding test purchase for: ${email}`)

  const { data, error } = await supabase.from('purchase_activations').insert({
    email,
    transaction_id: transactionId,
    status: 'pending',
    webhook_payload: {
      source: 'test',
      buyer_name: 'Test User',
      order_id: transactionId,
      created_at: new Date().toISOString(),
    },
  }).select()

  if (error) {
    if (error.code === '23505') {
      console.log('Email already has a pending activation. Checking status...')

      const { data: existing } = await supabase
        .from('purchase_activations')
        .select('*')
        .eq('email', email)
        .single()

      console.log('Existing activation:', existing)
      return
    }

    console.error('Error:', error)
    return
  }

  console.log('Success! Purchase activation created:')
  console.log(data)
  console.log(`\nNow go to: https://sempremagras.online/ativar`)
  console.log(`Enter email: ${email}`)
  console.log(`You should receive an OTP code at this email.`)
}

addTestPurchase()
