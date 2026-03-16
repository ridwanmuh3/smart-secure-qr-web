import { serverSupabaseClient } from '#supabase/server'
import { verify as ecdsaVerify } from '~~/server/utils/crypto'
import { tlockDecrypt } from '~~/server/utils/tlock'
import type { VerificationResult } from '#shared/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  let secureId = body?.secure_id?.trim() || ''

  // Parse secure_id from URL format: /verify/UUID, /r/UUID, or full URL
  const urlMatch = secureId.match(/\/(?:verify|r)\/([0-9a-f-]{36})/i)
  if (urlMatch) secureId = urlMatch[1]

  // Also try raw UUID pattern
  const uuidMatch = secureId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (uuidMatch) secureId = uuidMatch[1]

  if (!secureId) return fail('secure_id is required')

  const sourceIP = getClientIP(event)
  return await verifySecureId(event, secureId, sourceIP)
})

export async function verifySecureId(event: any, secureId: string, sourceIP: string) {
  const client = await serverSupabaseClient(event)

  // Log scan
  await client.from('scan_logs').insert({ secure_id: secureId, source_ip: sourceIP })

  // Get payload
  const { data: payload, error } = await client
    .from('qr_payloads')
    .select('*')
    .eq('secure_id', secureId)
    .single()

  if (error || !payload) {
    return ok<VerificationResult>({
      status: 'error',
      message: 'QR code not found in database',
    })
  }

  // Get public key
  const { data: keyRow } = await client
    .from('key_pairs')
    .select('public_key')
    .eq('id', payload.key_pair_id)
    .single()

  if (!keyRow) {
    return ok<VerificationResult>({
      status: 'error',
      message: 'Public key not found',
    })
  }

  // Get scan count
  const { count } = await client
    .from('scan_logs')
    .select('*', { count: 'exact', head: true })
    .eq('secure_id', secureId)

  const scanCount = count || 0
  const now = new Date()
  const validFrom = new Date(payload.valid_from)
  const validUntil = new Date(payload.valid_until)

  const baseInfo = {
    document_hash: payload.document_hash,
    file_name: payload.file_name,
    file_size: payload.file_size,
    issuer_id: payload.issuer_id,
    issued_at: payload.created_at,
    valid_from: payload.valid_from,
    valid_until: payload.valid_until,
    metadata: payload.metadata,
    public_key_hex: Buffer.from(payload.public_key || keyRow.public_key, 'base64').toString('hex'),
    scan_count: scanCount,
  }

  // Check time window
  if (now < validFrom) {
    return ok<VerificationResult>({
      status: 'not_yet_valid',
      message: 'Document is not yet valid',
      ...baseInfo,
    })
  }

  if (now > validUntil) {
    return ok<VerificationResult>({
      status: 'expired',
      message: 'Document has expired',
      ...baseInfo,
    })
  }

  // Verify outer signature
  const timestampBuf = Buffer.alloc(8)
  timestampBuf.writeBigInt64LE(BigInt(payload.timestamp))
  const encPayload = Buffer.from(payload.encrypted_payload, 'utf-8')
  const outerData = Buffer.concat([timestampBuf, encPayload])
  const outerSig = Buffer.from(payload.outer_signature, 'base64')

  if (!ecdsaVerify(keyRow.public_key, outerData, outerSig)) {
    return ok<VerificationResult>({
      status: 'tampered',
      message: 'Outer signature is invalid — document may have been modified',
    })
  }

  // Decrypt time-locked payload
  let decrypted: Buffer
  try {
    decrypted = await tlockDecrypt(payload.encrypted_payload)
  }
  catch {
    return ok<VerificationResult>({
      status: 'not_yet_valid',
      message: 'Document cannot be verified yet — time-lock key has not been released',
      ...baseInfo,
    })
  }

  // Parse inner payload: UUID(16) + Hash(32) + SigLen(2) + InnerSig(variable) + FileName
  if (decrypted.length < 50) {
    return ok<VerificationResult>({
      status: 'tampered',
      message: 'Inner payload is too short — data may be corrupted',
    })
  }

  const innerHash = decrypted.subarray(16, 48)
  const sigLen = decrypted.readUInt16BE(48)
  const innerSig = decrypted.subarray(50, 50 + sigLen)

  // Verify inner signature
  if (!ecdsaVerify(keyRow.public_key, innerHash, innerSig)) {
    return ok<VerificationResult>({
      status: 'tampered',
      message: 'Inner signature is invalid — document may have been modified',
    })
  }

  // Verify hash match
  if (innerHash.toString('hex') !== payload.document_hash) {
    return ok<VerificationResult>({
      status: 'tampered',
      message: 'Document hash mismatch — document content has been altered',
    })
  }

  return ok<VerificationResult>({
    status: 'authentic',
    message: 'Document is verified and authentic',
    ...baseInfo,
  })
}
