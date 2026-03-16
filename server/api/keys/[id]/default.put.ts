import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) return fail('Key ID required')

  const client = await serverSupabaseClient(event)

  // Clear all defaults
  await client.from('key_pairs').update({ is_default: false }).neq('id', '')

  // Set the new default
  const { error } = await client.from('key_pairs').update({ is_default: true }).eq('id', id)
  if (error) return fail(error.message)

  return ok({ updated: true })
})
