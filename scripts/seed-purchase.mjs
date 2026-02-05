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

async function seedPurchase() {
  const testEmail = 'teste@gmail.com'
  const transactionId = 'KIWIFY_TEST_' + Date.now()

  // Insert test purchase activation
  const { data, error } = await supabase
    .from('purchase_activations')
    .insert({
      email: testEmail,
      transaction_id: transactionId,
      status: 'pending',
      webhook_payload: {
        source: 'kiwify',
        order_id: transactionId,
        buyer_name: 'Maria Teste',
        Customer: {
          email: testEmail,
          full_name: 'Maria Teste'
        },
        Product: {
          product_name: 'Queima Intermitente'
        }
      }
    })
    .select()

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('✅ Purchase activation created for:', testEmail)
  console.log(JSON.stringify(data, null, 2))
}

seedPurchase()
