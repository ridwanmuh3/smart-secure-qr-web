import { PDFDocument } from 'pdf-lib'

interface EmbedOptions {
  position: string  // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  page: number      // 0 = last, 1+ = specific
  sizeMM: number    // size in mm
  secureId: string  // stored in metadata for extraction
}

/**
 * Embed QR code PNG into a PDF at specified position.
 * Also stores secure_id in PDF metadata for easy extraction.
 */
export async function embedQRInPDF(
  pdfData: Buffer,
  qrPng: Buffer,
  options: EmbedOptions,
): Promise<Buffer> {
  const pdf = await PDFDocument.load(pdfData)
  const qrImage = await pdf.embedPng(qrPng)

  // Store secure_id in metadata
  pdf.setSubject(`secure_id:${options.secureId}`)

  // Determine target page
  const pageCount = pdf.getPageCount()
  let pageIdx = options.page === 0 ? pageCount - 1 : Math.min(options.page - 1, pageCount - 1)
  if (pageIdx < 0) pageIdx = 0
  const page = pdf.getPage(pageIdx)

  // Calculate QR size in points (1mm ≈ 2.835pt)
  const sizePt = options.sizeMM * 2.835
  const margin = 30 // points

  const { width: pageW, height: pageH } = page.getSize()

  let x: number
  let y: number

  switch (options.position) {
    case 'top-left':
      x = margin
      y = pageH - margin - sizePt
      break
    case 'top-right':
      x = pageW - margin - sizePt
      y = pageH - margin - sizePt
      break
    case 'bottom-left':
      x = margin
      y = margin
      break
    case 'bottom-right':
    default:
      x = pageW - margin - sizePt
      y = margin
      break
  }

  page.drawImage(qrImage, { x, y, width: sizePt, height: sizePt })

  const pdfBytes = await pdf.save()
  return Buffer.from(pdfBytes)
}

/**
 * Extract secure_id from PDF metadata.
 */
export async function extractSecureIdFromPDF(pdfData: Buffer): Promise<string | null> {
  try {
    const pdf = await PDFDocument.load(pdfData)
    const subject = pdf.getSubject()
    if (subject?.startsWith('secure_id:')) {
      return subject.slice('secure_id:'.length)
    }
    return null
  }
  catch {
    return null
  }
}
