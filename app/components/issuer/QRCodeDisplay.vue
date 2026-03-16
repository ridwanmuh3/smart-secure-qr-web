<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps<{
  qrBase64: string
  signedPdfBase64?: string | null
  secureId: string
  documentHash: string
  fileName: string
  validFrom: string
  validUntil: string
  isPdf?: boolean
}>()

const emit = defineEmits<{
  save: []
  savePdf: []
  reset: []
}>()

const pdfUrl = computed(() => {
  if (!props.signedPdfBase64) return ''
  try {
    const bytes = Uint8Array.from(atob(props.signedPdfBase64), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }
  catch { return '' }
})

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
  }
  catch { return d }
}

onUnmounted(() => {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Success badge -->
    <div class="flex justify-center">
      <span class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">
        <Icon icon="lucide:check-circle-2" class="w-5 h-5" />
        QR Code Created Successfully
      </span>
    </div>

    <!-- PDF preview -->
    <div v-if="pdfUrl" class="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <object :data="pdfUrl" type="application/pdf" class="w-full h-[500px]">
        <p class="p-4 text-sm text-gray-500">Your browser does not support PDF preview.</p>
      </object>
    </div>

    <!-- QR image -->
    <div v-if="!pdfUrl" class="flex justify-center">
      <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <img :src="qrBase64" alt="QR Code" class="w-64 h-64" />
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex justify-center gap-3">
      <button v-if="pdfUrl" class="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] text-sm font-semibold transition-all duration-200 shadow-sm shadow-emerald-200" @click="emit('savePdf')">
        <Icon icon="lucide:download" class="w-4 h-4" />
        Download Signed PDF
      </button>
      <button class="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200" :class="pdfUrl ? 'border border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200'" @click="emit('save')">
        <Icon icon="lucide:download" class="w-4 h-4" />
        Save QR Image
      </button>
      <button class="flex items-center gap-2 px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all duration-200" @click="emit('reset')">
        Create New
      </button>
    </div>

    <!-- Info card -->
    <div class="bg-gray-50/80 rounded-2xl p-5 text-sm space-y-2.5 border border-gray-200/80">
      <div class="flex justify-between">
        <span class="text-gray-500">Secure ID</span>
        <span class="font-mono text-xs text-gray-700">{{ secureId }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">File</span>
        <span class="text-gray-700 font-medium">{{ fileName }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Hash SHA3-256</span>
        <span class="font-mono text-xs text-gray-700 truncate max-w-[200px]" :title="documentHash">{{ documentHash }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Valid</span>
        <span class="text-gray-700 text-xs">{{ formatDate(validFrom) }} — {{ formatDate(validUntil) }}</span>
      </div>
      <div v-if="isPdf" class="flex justify-between">
        <span class="text-gray-500">Type</span>
        <span class="text-gray-700">PDF {{ signedPdfBase64 ? 'with embedded QR' : '(separate QR)' }}</span>
      </div>
    </div>
  </div>
</template>
