import type { VerificationResult } from '#shared/types'

export function useVerifier() {
  const isVerifying = ref(false)
  const verificationResult = ref<VerificationResult | null>(null)
  const error = ref('')
  const activeTab = ref<'document' | 'image' | 'camera'>('document')

  async function verifyFromDocument(file: File) {
    isVerifying.value = true
    error.value = ''
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await $fetch<{ success: boolean; data: VerificationResult }>('/api/verifier/verify-document', {
        method: 'POST',
        body: formData,
      })
      verificationResult.value = res.data
    }
    catch (e: any) {
      error.value = e.data?.message || e.statusMessage || 'Failed to verify document'
    }
    finally {
      isVerifying.value = false
    }
  }

  async function verifyFromImage(file: File) {
    isVerifying.value = true
    error.value = ''
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await $fetch<{ success: boolean; data: VerificationResult }>('/api/verifier/verify-image', {
        method: 'POST',
        body: formData,
      })
      verificationResult.value = res.data
    }
    catch (e: any) {
      error.value = e.data?.message || e.statusMessage || 'Failed to read QR code from image'
    }
    finally {
      isVerifying.value = false
    }
  }

  async function verifyFromData(qrData: string) {
    isVerifying.value = true
    error.value = ''
    try {
      // Parse secure_id from QR data
      let secureId = qrData
      const urlMatch = qrData.match(/\/(?:verify|r)\/([0-9a-f-]{36})/i)
      if (urlMatch) secureId = urlMatch[1]

      const res = await $fetch<{ success: boolean; data: VerificationResult }>('/api/verifier/verify', {
        method: 'POST',
        body: { secure_id: secureId },
      })
      verificationResult.value = res.data
    }
    catch (e: any) {
      error.value = e.data?.message || e.statusMessage || 'Failed to verify QR code'
    }
    finally {
      isVerifying.value = false
    }
  }

  function reset() {
    verificationResult.value = null
    error.value = ''
  }

  return {
    isVerifying, verificationResult, error, activeTab,
    verifyFromDocument, verifyFromImage, verifyFromData, reset,
  }
}
