import { serverSupabaseClient } from '#supabase/server'
import type { KeyPairRow } from '#shared/types'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('key_pairs')
    .select('id, name, fingerprint, is_default, private_key, created_at')
    .order('created_at', { ascending: false })

  if (error) return fail(error.message)

  return ok(
    (data as KeyPairRow[]).map(k => ({
      id: k.id,
      name: k.name,
      fingerprint: k.fingerprint,
      is_default: k.is_default,
      has_private_key: !!k.private_key,
      created_at: k.created_at,
    })),
  )
})
