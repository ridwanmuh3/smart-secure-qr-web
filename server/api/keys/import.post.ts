import { serverSupabaseClient } from '#supabase/server'
import { importPublicKeyPEM, importPrivateKeyPEM, computeFingerprint } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData) return fail('Form data required')

  const nameField = formData.find(f => f.name === 'name')
  const typeField = formData.find(f => f.name === 'type')
  const fileField = formData.find(f => f.name === 'file')

  const name = nameField?.data?.toString().trim()
  const keyType = typeField?.data?.toString() || 'public'
  const pem = fileField?.data?.toString()

  if (!name) return fail('Key name is required')
  if (!pem) return fail('PEM file is required')

  let publicKeyB64: string
  let privateKeyB64: string | null = null

  if (keyType === 'private' || keyType === 'secret') {
    const imported = importPrivateKeyPEM(pem)
    publicKeyB64 = imported.publicKeyB64
    privateKeyB64 = imported.privateKeyB64
  }
  else {
    const imported = importPublicKeyPEM(pem)
    publicKeyB64 = imported.publicKeyB64
  }

  const fingerprint = computeFingerprint(publicKeyB64)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('key_pairs')
    .insert({
      name,
      public_key: publicKeyB64,
      private_key: privateKeyB64,
      fingerprint,
    })
    .select('id, name, fingerprint, is_default, created_at')
    .single()

  if (error) return fail(error.message)

  return ok({ ...data, has_private_key: !!privateKeyB64 })
})
