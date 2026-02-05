import { db } from '@/lib/db/schema'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

export async function logout() {
  // 1. Clear IndexedDB
  try {
    await db.delete()
  } catch (e) {
    console.error('Failed to clear IndexedDB', e)
  }

  // 2. Clear SW cache
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'LOGOUT' })
  } catch (e) {
    console.error('Failed to clear SW cache', e)
  }

  // 3. Clear Zustand
  try {
    useStore.getState().reset()
  } catch (e) {
    console.error('Failed to reset store', e)
  }

  // 4. Signout Supabase
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch (e) {
    console.error('Failed to sign out', e)
  }

  // 5. Redirect
  window.location.href = '/login'
}
