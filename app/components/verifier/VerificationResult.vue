<script setup lang="ts">
  import { Icon } from '@iconify/vue'
  import type { VerificationResult } from '#shared/types'

  const props = defineProps<{
    result: VerificationResult
  }>()

  const emit = defineEmits<{
    reset: []
  }>()

  const statusConfig = computed(() => {
    switch (props.result.status) {
      case 'authentic':
        return { icon: 'lucide:check-circle-2', label: 'VERIFIED', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-500' }
      case 'tampered':
        return { icon: 'lucide:x-circle', label: 'INVALID', color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-500' }
      case 'not_yet_valid':
        return { icon: 'lucide:clock', label: 'NOT YET VALID', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconColor: 'text-amber-500' }
      case 'expired':
        return { icon: 'lucide:alert-triangle', label: 'EXPIRED', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', iconColor: 'text-gray-500' }
      default:
        return { icon: 'lucide:alert-circle', label: 'ERROR', color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-500' }
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
  <div class="space-y-4">
    <!-- Status card -->
    <div :class="[statusConfig.bg, statusConfig.border]" class="rounded-2xl border p-8 text-center">
      <Icon :icon="statusConfig.icon" :class="statusConfig.iconColor" class="w-14 h-14 mx-auto mb-3" />
      <h3 :class="statusConfig.text" class="text-xl font-bold tracking-tight">{{ statusConfig.label }}</h3>
      <p class="text-sm mt-1.5" :class="statusConfig.text">{{ result.message }}</p>
    </div>

    <!-- Scan count warning -->
    <div v-if="result.scan_count && result.scan_count > 5"
      class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium">
      <Icon icon="lucide:alert-triangle" class="inline w-4 h-4 mr-1" />
      This QR has been scanned {{ result.scan_count }} times. Beware of potential cloning.
    </div>

    <!-- Detail info (for authentic) -->
    <div v-if="result.status === 'authentic' && result.file_name"
      class="bg-white rounded-2xl border border-gray-200/80 p-5 text-sm space-y-2.5">
      <h4 class="font-bold text-gray-900 mb-3">Document Details</h4>
      <div class="flex justify-between"><span class="text-gray-500">File Name</span><span
          class="text-gray-700 font-medium">{{ result.file_name }}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Size</span><span class="text-gray-700">{{
        formatSize(result.file_size) }}</span></div>
      <div v-if="result.issuer_id" class="flex justify-between"><span class="text-gray-500">Issuer</span><span
          class="text-gray-700">{{ result.issuer_id }}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Signed</span><span class="text-gray-700">{{
        formatDate(result.issued_at) }}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Valid From</span><span
          class="text-emerald-600 font-medium">{{ formatDate(result.valid_from) }}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Valid Until</span><span
          class="text-emerald-600 font-medium">{{ formatDate(result.valid_until) }}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Hash SHA3-256</span><span
          class="font-mono text-xs text-gray-600 truncate max-w-45" :title="result.document_hash">{{
            result.document_hash }}</span></div>
      <div v-if="result.public_key_hex" class="flex justify-between"><span class="text-gray-500">Fingerprint</span><span
          class="font-mono text-xs text-gray-600">{{ result.public_key_hex?.substring(0, 8) }}</span></div>
      <div v-if="result.metadata" class="flex justify-between"><span class="text-gray-500">Metadata</span><span
          class="text-gray-700">{{ result.metadata }}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Total Scans</span><span class="text-gray-700">{{
        result.scan_count }}</span></div>
    </div>

    <!-- Time info (for not_yet_valid / expired) -->
    <div v-if="(result.status === 'not_yet_valid' || result.status === 'expired') && result.valid_from"
      class="bg-white rounded-2xl border border-gray-200/80 p-5 text-sm">
      <h4 class="font-bold text-gray-900 mb-3">Time Information</h4>
      <div class="flex justify-between mb-2"><span class="text-gray-500">Valid From</span><span
          class="text-emerald-600 font-medium">{{ formatDate(result.valid_from) }}</span></div>
      <div class="flex justify-between"><span class="text-gray-500">Valid Until</span><span
          class="text-emerald-600 font-medium">{{ formatDate(result.valid_until) }}</span></div>
    </div>

    <div class="flex justify-center">
      <button
        class="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] text-sm font-semibold transition-all duration-200 shadow-sm shadow-emerald-200 cursor-pointer"
        @click="emit('reset')">
        Verify Another QR
      </button>
    </div>
  </div>
</template>
