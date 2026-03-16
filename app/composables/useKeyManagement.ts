import type { KeyPairInfo } from '#shared/types'

export function useKeyManagement() {
  const keys = ref<KeyPairInfo[]>([])
  const isLoading = ref(false)
  const error = ref('')

  async function loadKeys() {
    isLoading.value = true
    try {
      const res = await $fetch<{ success: boolean; data: KeyPairInfo[] }>('/api/keys')
      keys.value = res.data
    }
    catch (e: any) {
      error.value = e.message || 'Failed to load keys'
    }
    finally {
      isLoading.value = false
    }
  }

  async function generateKey(name: string) {
    try {
      await $fetch('/api/keys', { method: 'POST', body: { name } })
      await loadKeys()
    }
    catch (e: any) {
      error.value = e.data?.message || 'Failed to create key'
    }
  }

  async function deleteKey(id: string) {
    try {
      await $fetch(`/api/keys/${id}`, { method: 'DELETE' })
      await loadKeys()
    }
    catch (e: any) {
      error.value = e.data?.message || 'Failed to delete key'
    }
  }

  async function setDefault(id: string) {
    try {
      await $fetch(`/api/keys/${id}/default`, { method: 'PUT' })
      await loadKeys()
    }
    catch (e: any) {
      error.value = e.data?.message || 'Failed to set default key'
    }
  }

  async function exportKey(id: string) {
    try {
      const blob = await $fetch<Blob>(`/api/keys/${id}/export/public`, { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'public_key.pem'
      link.click()
      URL.revokeObjectURL(url)
    }
    catch (e: any) {
      error.value = e.data?.message || 'Failed to export key'
    }
  }

  async function exportPrivate(id: string) {
    try {
      const blob = await $fetch<Blob>(`/api/keys/${id}/export/private`, { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'private_key.pem'
      link.click()
      URL.revokeObjectURL(url)
    }
    catch (e: any) {
      error.value = e.data?.message || 'Failed to export private key'
    }
  }

  async function importKey(name: string, file: File, keyType: string = 'public') {
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('type', keyType)
      formData.append('file', file)
      await $fetch('/api/keys/import', { method: 'POST', body: formData })
      await loadKeys()
    }
    catch (e: any) {
      error.value = e.data?.message || 'Failed to import key'
    }
  }

  return {
    keys, isLoading, error,
    loadKeys, generateKey, deleteKey, setDefault,
    exportKey, exportPrivate, importKey,
  }
}
