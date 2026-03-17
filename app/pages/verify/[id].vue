<script setup lang="ts">
  import { Icon } from '@iconify/vue'
  import type { VerificationResult } from '#shared/types'

  definePageMeta({
    layout: false,
  })

  const route = useRoute()
  const secureId = route.params.id as string

  const isLoading = ref(true)
  const result = ref<VerificationResult | null>(null)
  const error = ref('')

  onMounted(async () => {
    try {
      const res = await $fetch<{ success: boolean; data: VerificationResult }>('/api/verifier/verify', {
        method: 'POST',
        body: { secure_id: secureId },
      })
      result.value = res.data
    }
    catch (e: any) {
      error.value = e.data?.message || e.statusMessage || 'Verification failed'
    }
    finally {
      isLoading.value = false
    }
  })

  const statusConfig = computed(() => {
    if (!result.value) return null
    switch (result.value.status) {
      case 'authentic': return { icon: 'lucide:check-circle-2', label: 'VERIFIED', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-500' }
      case 'tampered': return { icon: 'lucide:x-circle', label: 'INVALID', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-500' }
      case 'not_yet_valid': return { icon: 'lucide:clock', label: 'EARLY ACCESS DENIED', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconColor: 'text-amber-500' }
      case 'expired': return { icon: 'lucide:alert-triangle', label: 'ACCESS REJECTED', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', iconColor: 'text-gray-500' }
      case 'replay_blocked': return { icon: 'lucide:shield-off', label: 'REPLAY BLOCKED', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-500' }
      default: return { icon: 'lucide:alert-circle', label: 'ERROR', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-500' }
    }
  })

  function formatDate(d?: string) {
    if (!d) return '-'
    try { return new Date(d).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) }
    catch { return d }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(2)} MB`
  }
</script>

<template>
  <div
    class="min-h-screen bg-linear-to-br from-emerald-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center gap-2 text-emerald-700 mb-2">
          <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Icon icon="lucide:qr-code" class="w-5 h-5" />
          </div>
          <span class="font-bold text-lg tracking-tight">Smart Secure QR</span>
        </div>
        <p class="text-xs text-gray-500">Document Authenticity Verification</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-10 text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:loader-2" class="w-8 h-8 animate-spin text-emerald-500" />
        </div>
        <p class="text-sm text-gray-500 font-medium">Verifying document...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-10 text-center">
        <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Icon icon="lucide:alert-circle" class="w-8 h-8 text-red-400" />
        </div>
        <p class="text-sm text-red-600 font-medium">{{ error }}</p>
      </div>

      <!-- Result -->
      <div v-else-if="result && statusConfig" class="space-y-4">
        <!-- Status card -->
        <div :class="[statusConfig.bg, statusConfig.border]" class="rounded-2xl border p-10 text-center shadow-sm">
          <Icon :icon="statusConfig.icon" :class="statusConfig.iconColor" class="w-16 h-16 mx-auto mb-3" />
          <h2 :class="statusConfig.text" class="text-2xl font-bold tracking-tight">{{ statusConfig.label }}</h2>
          <p :class="statusConfig.text" class="text-sm mt-1.5 opacity-80">{{ result.message }}</p>
        </div>

        <!-- QR Cloning Detection Warning -->
        <div v-if="result.cloning_suspected"
          class="p-3.5 bg-orange-50 border border-orange-300 rounded-xl text-sm text-orange-800 text-center font-medium">
          <Icon icon="lucide:copy-check" class="inline w-4 h-4 mr-1" />
          QR cloning detected — scanned from {{ result.unique_ip_count }} unique sources ({{ result.scan_count }} total scans)
        </div>

        <!-- High scan count warning -->
        <div v-else-if="result.scan_count && result.scan_count > 5"
          class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center font-medium">
          <Icon icon="lucide:alert-triangle" class="inline w-4 h-4 mr-1" />
          Scanned {{ result.scan_count }} times
        </div>

        <!-- Details -->
        <div v-if="result.file_name"
          class="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 text-sm space-y-3">
          <div v-if="result.file_name" class="flex justify-between"><span class="text-gray-500">File</span><span
              class="text-gray-700 font-medium">{{ result.file_name }}</span></div>
          <div v-if="result.file_size" class="flex justify-between"><span class="text-gray-500">Size</span><span
              class="text-gray-700">{{ formatSize(result.file_size) }}</span></div>
          <div v-if="result.issuer_id" class="flex justify-between"><span class="text-gray-500">Issuer</span><span
              class="text-gray-700">{{ result.issuer_id }}</span></div>
          <div v-if="result.valid_from" class="flex justify-between"><span class="text-gray-500">Valid From</span><span
              class="text-xs" :class="result.status === 'not_yet_valid' ? 'text-amber-600 font-medium' : 'text-gray-700'">{{ formatDate(result.valid_from) }}</span></div>
          <div v-if="result.valid_until" class="flex justify-between"><span class="text-gray-500">Valid
              Until</span><span class="text-xs" :class="result.status === 'expired' ? 'text-red-600 font-medium' : 'text-gray-700'">{{ formatDate(result.valid_until) }}</span></div>
          <div v-if="result.document_hash" class="flex justify-between"><span class="text-gray-500">Hash</span><span
              class="font-mono text-xs text-gray-600 truncate max-w-40" :title="result.document_hash">{{
                result.document_hash }}</span></div>
          <div v-if="result.scan_count" class="flex justify-between"><span class="text-gray-500">Total Scans</span><span
              class="text-gray-700">{{ result.scan_count }}</span></div>
          <div v-if="result.unique_ip_count" class="flex justify-between"><span class="text-gray-500">Unique Sources</span><span
              :class="result.cloning_suspected ? 'text-orange-600 font-medium' : 'text-gray-700'">{{ result.unique_ip_count }}</span></div>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-400 mt-8">&copy; 2026 Smart Secure QR-Code</p>
    </div>
  </div>
</template>
