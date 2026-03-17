import crypto from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import { hashSHA3, sign } from '~~/server/utils/crypto'
import { tlockEncrypt } from '~~/server/utils/tlock'
import { generateQRBase64, generateQRBuffer } from '~~/server/utils/qr'
import { embedQRInPDF } from '~~/server/utils/pdf'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData) return fail('Multipart form data required')

  // Parse fields
  const field = (name: string) => formData.find(f => f.name === name)?.data?.toString() || ''
  const keyPairId = field('key_pair_id')
  const validFrom = field('valid_from')
  const validUntil = field('valid_until')
  const issuerId = field('issuer_id')
  const metadata = field('metadata')
  const qrPosition = field('qr_position') || 'bottom-right'
  const qrPage = parseInt(field('qr_page') || '0', 10)
  const qrSize = parseInt(field('qr_size') || '30', 10)
  const fileField = formData.find(f => f.name === 'file')

  if (!keyPairId) return fail('key_pair_id is required')
  if (!validFrom || !validUntil) return fail('valid_from and valid_until are required')
  if (!fileField?.data) return fail('File is required')

  const fileData = fileField.data
  const fileName = fileField.filename || 'unknown'
  const isPdf = fileName.toLowerCase().endsWith('.pdf')

  // Get key pair from Supabase
  const client = await serverSupabaseClient(event)
  const { data: keyRow, error: keyErr } = await client
    .from('key_pairs')
    .select('public_key, private_key')
    .eq('id', keyPairId)
    .single()

  if (keyErr || !keyRow) return fail('Key pair not found', 404)
  if (!keyRow.private_key) return fail('Key pair has no private key')

  // 1. Hash document (SHA3-256)
  const documentHash = hashSHA3(Buffer.from(fileData))

  // 2. Inner signature: sign the hash
  const hashBytes = Buffer.from(documentHash, 'hex')
  const innerSig = sign(keyRow.private_key, hashBytes)

  // 3. Build inner payload: UUID(16) + Hash(32) + SigLen(2) + InnerSig(variable) + FileName
  const secureId = crypto.randomUUID()
  const uuidBytes = Buffer.from(secureId.replace(/-/g, ''), 'hex')
  const sigLenBuf = Buffer.alloc(2)
  sigLenBuf.writeUInt16BE(innerSig.length)
  const innerPayload = Buffer.concat([
    uuidBytes,
    hashBytes,
    sigLenBuf,
    innerSig,
    Buffer.from(fileName, 'utf-8'),
  ])

  // 4. Time-lock encrypt inner payload (unlocks at valid_from)
  const validFromDate = new Date(validFrom)
  const encryptResult = await tlockEncrypt(innerPayload, validFromDate)

  // 5. Outer signature: sign(timestamp + encrypted_payload)
  const timestamp = Math.floor(validFromDate.getTime() / 1000)
  const timestampBuf = Buffer.alloc(8)
  timestampBuf.writeBigInt64LE(BigInt(timestamp))

  const outerData = Buffer.concat([timestampBuf, Buffer.from(encryptResult.ciphertext, 'utf-8')])
  const outerSig = sign(keyRow.private_key, outerData)

  // 6. Store in Supabase
  const { error: insertErr } = await client.from('qr_payloads').insert({
    secure_id: secureId,
    document_hash: documentHash,
    file_name: fileName,
    file_size: fileData.length,
    encrypted_payload: encryptResult.ciphertext,
    outer_signature: outerSig.toString('base64'),
    timestamp,
    key_pair_id: keyPairId,
    issuer_id: issuerId,
    metadata,
    valid_from: validFromDate.toISOString(),
    valid_until: new Date(validUntil).toISOString(),
  })

  if (insertErr) return fail(insertErr.message)

  // 7. Generate QR code (content = verification URL with redirect)
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || getRequestURL(event).origin
  const qrContent = `${baseUrl}/r/${secureId}`
  const qrBase64 = await generateQRBase64(qrContent)

  // 8. Embed in PDF if applicable
  let signedPdfBase64: string | null = null
  if (isPdf) {
    try {
      const qrPng = await generateQRBuffer(qrContent)
      const signedPdf = await embedQRInPDF(Buffer.from(fileData), qrPng, {
        position: qrPosition,
        page: qrPage,
        sizeMM: qrSize,
        secureId,
      })
      signedPdfBase64 = signedPdf.toString('base64')
    }
    catch (e: any) {
      console.error('PDF embed error:', e.message)
    }
  }

  return ok({
    secure_id: secureId,
    qr_code_base64: qrBase64,
    signed_pdf_base64: signedPdfBase64,
    document_hash: documentHash,
    file_name: fileName,
    file_size: fileData.length,
    is_pdf: isPdf,
    public_key: keyRow.public_key,
  })
})
