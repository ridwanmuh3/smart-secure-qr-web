import QRCode from 'qrcode'
import jsQR from 'jsqr'
import sharp from 'sharp'

/**
 * Generate QR code as base64 PNG data URI.
 */
export async function generateQRBase64(content: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(content, {
    errorCorrectionLevel: 'Q',
    margin: 2,
    width: 400,
    color: { dark: '#000000', light: '#ffffff' },
  })
  return dataUrl
}

/**
 * Generate QR code as PNG buffer.
 */
export async function generateQRBuffer(content: string): Promise<Buffer> {
  return await QRCode.toBuffer(content, {
    errorCorrectionLevel: 'Q',
    margin: 2,
    width: 400,
    type: 'png',
  })
}

/**
 * Build verification URL from secure_id.
 * Uses /r/:id redirect endpoint so QR destination can be changed dynamically.
 */
export function buildVerifyURL(secureId: string): string {
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || ''
  if (baseUrl) return `${baseUrl}/r/${secureId}`
  return secureId
}

/**
 * Read QR code from image buffer. Returns decoded text or null.
 */
export async function readQRFromImage(imageBuffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const result = jsQR(new Uint8ClampedArray(data), info.width, info.height)
  return result?.data ?? null
}
