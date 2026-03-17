<script setup lang="ts">
  import { Icon } from '@iconify/vue'

  const {
    isVerifying, verificationResult, error, activeTab,
    verifyFromDocument, verifyFromImage, verifyFromData, reset,
  } = useVerifier()

  const docInputRef = ref<HTMLInputElement | null>(null)
  const imgInputRef = ref<HTMLInputElement | null>(null)

  // Use a key to force remount the scanner when re-entering camera tab
  const scannerKey = ref(0)
  const isCameraActive = computed(() => activeTab.value === 'camera')

  watch(activeTab, (_newTab, oldTab) => {
    // When switching away from camera, increment key so next time it remounts fresh
    if (oldTab === 'camera') {
      scannerKey.value++
    }
  })

  function handleDocUpload(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      verifyFromDocument(file)
      target.value = ''
    }
  }

  function handleImgUpload(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      verifyFromImage(file)
      target.value = ''
    }
  }

  const tabs = [
    { key: 'document', label: 'Upload Document', icon: 'lucide:file-text' },
    { key: 'image', label: 'Upload QR Image', icon: 'lucide:image' },
    { key: 'camera', label: 'Camera Scan', icon: 'lucide:camera' },
  ] as const
</script>

<template>
  <div class="max-w-3xl mx-auto px-2 md:px-6">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Verify Document</h1>
      <p class="text-sm text-gray-500 mt-1">Upload a PDF document or QR code image to verify authenticity</p>
    </div>

    <input ref="docInputRef" type="file" accept=".pdf" class="hidden" @change="handleDocUpload" />
    <input ref="imgInputRef" type="file" accept=".png,.jpg,.jpeg" class="hidden" @change="handleImgUpload" />

    <!-- Error -->
    <div v-if="error"
      class="mb-5 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center gap-2.5 shadow-sm">
      <Icon icon="lucide:alert-circle" class="inline w-5 h-5 shrink-0" />
      {{ error }}
    </div>

    <!-- Result -->
    <div v-if="verificationResult" class="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
      <VerifierVerificationResult :result="verificationResult" @reset="reset" />
    </div>

    <!-- Tabs -->
    <div v-else class="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div class="flex border-b border-gray-100">
        <button v-for="tab in tabs" :key="tab.key"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-all cursor-pointer duration-200 border-b-2 -mb-px"
          :class="activeTab === tab.key
            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'" @click="activeTab = tab.key">
          <Icon :icon="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <div class="p-8">
        <!-- Loading -->
        <div v-if="isVerifying" class="flex flex-col items-center py-16 text-gray-500">
          <div class="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <Icon icon="lucide:loader-2" class="w-8 h-8 animate-spin text-emerald-600" />
          </div>
          <p class="text-sm font-medium">Verifying...</p>
        </div>

        <template v-else>
          <!-- Document tab -->
          <div v-show="activeTab === 'document'" class="text-center py-12">
            <div class="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <Icon icon="lucide:file-search" class="w-10 h-10 text-emerald-500" />
            </div>
            <p class="text-sm text-gray-600 mb-5">Upload a PDF document with an embedded QR code</p>
            <button
              class="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] text-sm font-semibold transition-all duration-200 shadow-sm shadow-emerald-200 cursor-pointer"
              @click="docInputRef?.click()">
              <Icon icon="lucide:upload" class="inline w-4 h-4 mr-1.5" />
              Select PDF Document
            </button>
          </div>

          <!-- Image tab -->
          <div v-show="activeTab === 'image'" class="text-center py-12">
            <div class="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <Icon icon="lucide:scan-line" class="w-10 h-10 text-emerald-500" />
            </div>
            <p class="text-sm text-gray-600 mb-5">Upload an image containing a QR code</p>
            <button
              class="px-8 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] text-sm font-semibold transition-all duration-200 shadow-sm shadow-emerald-200 cursor-pointer"
              @click="imgInputRef?.click()">
              <Icon icon="lucide:upload" class="inline w-4 h-4 mr-1.5" />
              Select QR Image
            </button>
          </div>

          <!-- Camera tab — v-if ensures scanner mounts/unmounts with camera -->
          <div v-if="isCameraActive">
            <VerifierQRScanner :key="scannerKey" @decoded="verifyFromData" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
