import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return fail('Key ID required')

  const client = await serverSupabaseClient(event)
  const { error } = await client.from('key_pairs').delete().eq('id', id)
  if (error) return fail(error.message)

  return ok({ deleted: true })
})
