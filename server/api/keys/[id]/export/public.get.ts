import { serverSupabaseClient } from '#supabase/server'
import { publicKeyToPEM } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return fail('Key ID required')

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('key_pairs')
    .select('public_key, name')
    .eq('id', id)
    .single()

  if (error || !data) return fail('Key not found', 404)

  const pem = publicKeyToPEM(data.public_key)

  setHeader(event, 'Content-Type', 'application/x-pem-file')
  setHeader(event, 'Content-Disposition', `attachment; filename="${data.name}_public.pem"`)
  return pem
})
