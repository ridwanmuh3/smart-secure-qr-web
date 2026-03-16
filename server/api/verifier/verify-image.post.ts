import { readQRFromImage } from '~~/server/utils/qr'
import { verifySecureId } from '~~/server/api/verifier/verify.post'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const fileField = formData?.find(f => f.name === 'file')
  if (!fileField?.data) return fail('Image file is required')

  const qrData = await readQRFromImage(Buffer.from(fileField.data))
  if (!qrData) return fail('Could not read QR code from image', 422)

  // Parse secure_id from QR data
  let secureId = qrData
  const urlMatch = qrData.match(/\/(?:verify|r)\/([0-9a-f-]{36})/i)
  if (urlMatch) secureId = urlMatch[1]
  const uuidMatch = secureId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (uuidMatch) secureId = uuidMatch[1]

  const sourceIP = getClientIP(event)
  return await verifySecureId(event, secureId, sourceIP)
})
