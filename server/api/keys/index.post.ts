import { serverSupabaseClient } from '#supabase/server'
import { generateKeyPair, computeFingerprint } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = body?.name?.trim()
  if (!name) return fail('Key name is required')

  const keys = generateKeyPair()
  const fingerprint = computeFingerprint(keys.publicKeyB64)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('key_pairs')
    .insert({
      name,
      public_key: keys.publicKeyB64,
      private_key: keys.privateKeyB64,
      fingerprint,
    })
    .select('id, name, fingerprint, is_default, created_at')
    .single()

  if (error) return fail(error.message)

  return ok({ ...data, has_private_key: true })
})
