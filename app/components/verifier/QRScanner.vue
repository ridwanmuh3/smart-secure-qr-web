<script setup lang="ts">
import { Icon } from '@iconify/vue'

const emit = defineEmits<{
  decoded: [data: string]
}>()

const scannerRef = ref<any>(null)
const isStarting = ref(true)
const errorMsg = ref('')

async function startScanner() {
  try {
    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.value = scanner

    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded: string) => {
        scanner.stop().catch(() => {})
        emit('decoded', decoded)
      },
      () => {},
    )
    isStarting.value = false
  }
  catch (err: any) {
    isStarting.value = false
    if (err?.message?.includes('Permission')) {
      errorMsg.value = 'Camera access denied. Please allow camera access in your browser settings.'
    }
    else {
      errorMsg.value = `Failed to access camera: ${err?.message || err}`
    }
  }
}

onMounted(() => {
  startScanner()
})

onBeforeUnmount(() => {
  if (scannerRef.value) {
    scannerRef.value.stop().catch(() => {})
    scannerRef.value.clear().catch(() => {})
    scannerRef.value = null
  }
})
</script>

<template>
  <div>
    <div v-if="errorMsg" class="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
      <Icon icon="lucide:alert-circle" class="inline w-4 h-4 mr-1.5" />
      {{ errorMsg }}
    </div>

    <div v-if="isStarting" class="flex flex-col items-center py-12 text-gray-500">
      <div class="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <Icon icon="lucide:loader-2" class="w-7 h-7 animate-spin text-emerald-600" />
      </div>
      <p class="text-sm font-medium">Starting camera...</p>
    </div>

    <div id="qr-reader" class="rounded-xl overflow-hidden" />
  </div>
</template>
