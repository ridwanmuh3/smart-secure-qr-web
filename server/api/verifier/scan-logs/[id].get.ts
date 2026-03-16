import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return fail('Secure ID required')

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('scan_logs')
    .select('id, secure_id, scanned_at, source_ip')
    .eq('secure_id', id)
    .order('scanned_at', { ascending: false })

  if (error) return fail(error.message)

  return ok(data)
})
