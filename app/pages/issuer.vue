<script setup lang="ts">
  import { Icon } from '@iconify/vue'

  const {
    fileName, fileSize, validFrom, validUntil,
    selectedKeyId, metadata, issuerID, qrPosition, qrPage, qrSize,
    isGenerating, result, error, keys, isPDF,
    setFile, setTimePreset, loadKeys, generateQR, saveQR, savePDF, reset,
  } = useIssuer()

  onMounted(() => loadKeys())
</script>

<template>
  <div class="max-w-3xl mx-auto px-2 md:px-6">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Create Document QR Code</h1>
      <p class="text-sm text-gray-500 mt-1">Sign your document and generate a secure QR code with time-lock encryption
      </p>
    </div>

    <!-- Error -->
    <Transition name="page">
      <div v-if="error"
        class="mb-5 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center gap-2.5 shadow-sm">
        <Icon icon="lucide:alert-circle" class="w-5 h-5 shrink-0" />
        {{ error }}
      </div>
    </Transition>

    <!-- Result view -->
    <Transition name="page" mode="out-in">
      <div v-if="result" class="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
        <IssuerQRCodeDisplay :qr-base64="result.qr_code_base64" :signed-pdf-base64="result.signed_pdf_base64"
          :secure-id="result.secure_id" :document-hash="result.document_hash" :file-name="result.file_name"
          :valid-from="validFrom" :valid-until="validUntil" :is-pdf="result.is_pdf" @save="saveQR" @save-pdf="savePDF"
          @reset="reset" />
      </div>

      <!-- Form view -->
      <div v-else class="space-y-5">
        <!-- 1. File -->
        <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm card-hover">
          <h2 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            Select Document
          </h2>
          <IssuerFileUploader :file-name="fileName" :file-size="fileSize" @select="setFile" />
        </div>

        <!-- 2. Time -->
        <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm card-hover">
          <h2 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            Time Window
          </h2>
          <IssuerTimeWindowConfig v-model:valid-from="validFrom" v-model:valid-until="validUntil"
            @preset="setTimePreset" />
        </div>

        <!-- 3. Key -->
        <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm card-hover">
          <h2 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Select Key
          </h2>
          <IssuerKeySelector v-model="selectedKeyId" :keys="keys" @refresh="loadKeys" />
        </div>

        <!-- 4. QR Position (PDF only) -->
        <Transition name="page">
          <div v-if="isPDF" class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm card-hover">
            <h2 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span
                class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              QR Position on PDF
            </h2>
            <IssuerQRPositionConfig :position="qrPosition" :page="qrPage" :size="qrSize" :is-pdf="isPDF"
              @update:position="qrPosition = $event" @update:page="qrPage = $event" @update:size="qrSize = $event" />
          </div>
        </Transition>

        <!-- 5. Metadata -->
        <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm card-hover">
          <h2 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span
              class="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">{{
                isPDF ? '5' : '4' }}</span>
            Additional Information
          </h2>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Issuer ID</label>
              <input v-model="issuerID" type="text" placeholder="Optional"
                class="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Metadata</label>
              <input v-model="metadata" type="text" placeholder="Optional"
                class="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200" />
            </div>
          </div>
        </div>

        <!-- Generate button -->
        <button
          class="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-sm shadow-emerald-200 hover:shadow-md hover:shadow-emerald-200"
          :disabled="isGenerating || !fileName || !selectedKeyId || !validFrom || !validUntil" @click="generateQR">
          <Icon v-if="isGenerating" icon="lucide:loader-2" class="w-5 h-5 animate-spin" />
          <Icon v-else icon="lucide:shield-check" class="w-5 h-5" />
          {{ isGenerating ? 'Processing...' : 'Generate Secure QR Code' }}
        </button>
      </div>
    </Transition>
  </div>
</template>
