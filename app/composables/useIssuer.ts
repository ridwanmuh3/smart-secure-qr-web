import type { KeyPairInfo, GenerateResult } from '#shared/types'

export function useIssuer() {
  const file = ref<File | null>(null)
  const fileName = ref('')
  const fileSize = ref(0)
  const validFrom = ref('')
  const validUntil = ref('')
  const selectedKeyId = ref('')
  const metadata = ref('')
  const issuerID = ref('')
  const qrPosition = ref('bottom-right')
  const qrPage = ref(0)
  const qrSize = ref(30)
  const isGenerating = ref(false)
  const result = ref<GenerateResult | null>(null)
  const error = ref('')
  const keys = ref<KeyPairInfo[]>([])

  const isPDF = computed(() => fileName.value.toLowerCase().endsWith('.pdf'))

  function formatDatetimeLocal(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function setTimePreset(preset: string) {
    const now = new Date()
    validFrom.value = formatDatetimeLocal(now)
    const end = new Date(now)
    switch (preset) {
      case 'hour': end.setHours(end.getHours() + 1); break
      case 'day': end.setDate(end.getDate() + 1); break
      case 'week': end.setDate(end.getDate() + 7); break
      case 'month': end.setMonth(end.getMonth() + 1); break
    }
    validUntil.value = formatDatetimeLocal(end)
  }

  function setFile(f: File) {
    file.value = f
    fileName.value = f.name
    fileSize.value = f.size
    error.value = ''
  }

  async function loadKeys() {
    try {
      const res = await $fetch<{ success: boolean; data: KeyPairInfo[] }>('/api/keys')
      keys.value = res.data
      const defaultKey = res.data.find(k => k.is_default && k.has_private_key)
      if (defaultKey && !selectedKeyId.value) {
        selectedKeyId.value = defaultKey.id
      }
    }
    catch (e: any) {
      console.error('Failed to load keys:', e)
    }
  }

  async function generateQR() {
    if (!file.value || !selectedKeyId.value || !validFrom.value || !validUntil.value) {
      error.value = 'Please fill in all required fields'
      return
    }

    isGenerating.value = true
    error.value = ''

    try {
      const formData = new FormData()
      formData.append('file', file.value)
      formData.append('key_pair_id', selectedKeyId.value)
      formData.append('valid_from', validFrom.value)
      formData.append('valid_until', validUntil.value)
      formData.append('issuer_id', issuerID.value)
      formData.append('metadata', metadata.value)
      formData.append('qr_position', qrPosition.value)
      formData.append('qr_page', qrPage.value.toString())
      formData.append('qr_size', qrSize.value.toString())

      const res = await $fetch<{ success: boolean; data: GenerateResult }>('/api/issuer/generate', {
        method: 'POST',
        body: formData,
      })

      result.value = res.data
    }
    catch (e: any) {
      error.value = e.data?.message || e.statusMessage || e.message || 'Failed to create QR code'
    }
    finally {
      isGenerating.value = false
    }
  }

  function saveQR() {
    if (!result.value?.qr_code_base64) return
    const link = document.createElement('a')
    link.href = result.value.qr_code_base64
    link.download = `qr-${result.value.secure_id}.png`
    link.click()
  }

  function savePDF() {
    if (!result.value?.signed_pdf_base64) return
    const bytes = Uint8Array.from(atob(result.value.signed_pdf_base64), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `signed-${result.value.file_name}`
    link.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    file.value = null
    fileName.value = ''
    fileSize.value = 0
    result.value = null
    error.value = ''
  }

  // Initialize with day preset
  setTimePreset('day')

  return {
    file, fileName, fileSize, validFrom, validUntil,
    selectedKeyId, metadata, issuerID, qrPosition, qrPage, qrSize,
    isGenerating, result, error, keys, isPDF,
    setFile, setTimePreset, loadKeys, generateQR, saveQR, savePDF, reset,
  }
}
