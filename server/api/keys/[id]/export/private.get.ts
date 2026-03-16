import { serverSupabaseClient } from '#supabase/server'
import { privateKeyToPEM } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return fail('Key ID required')

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('key_pairs')
    .select('private_key, name')
    .eq('id', id)
    .single()

  if (error || !data) return fail('Key not found', 404)
  if (!data.private_key) return fail('No private key available', 404)

  const pem = privateKeyToPEM(data.private_key)

  setHeader(event, 'Content-Type', 'application/x-pem-file')
  setHeader(event, 'Content-Disposition', `attachment; filename="${data.name}_private.pem"`)
  return pem
})
