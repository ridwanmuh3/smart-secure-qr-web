<script setup lang="ts">
  import { Icon } from '@iconify/vue'

  const props = defineProps<{
    fileName: string
    fileSize: number
  }>()

  const emit = defineEmits<{
    select: [file: File]
  }>()

  const inputRef = ref<HTMLInputElement | null>(null)
  const isDragging = ref(false)

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (files?.length) {
      emit('select', files[0] as File)
      target.value = ''
    }
  }

  function handleDrop(e: DragEvent) {
    isDragging.value = false
    const files = e.dataTransfer?.files
    if (files?.length) emit('select', files[0] as File)
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(2)} MB`
  }
</script>

<template>
  <div>
    <input ref="inputRef" type="file" accept=".pdf,.png,.jpg,.jpeg" class="hidden" @change="handleChange" />

    <div v-if="!fileName"
      class="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200"
      :class="isDragging ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]' : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30'"
      @click="inputRef?.click()" @dragover.prevent="isDragging = true" @dragleave="isDragging = false"
      @drop.prevent="handleDrop">
      <div class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
        <Icon icon="lucide:cloud-upload" class="w-7 h-7 text-emerald-500" />
      </div>
      <p class="text-sm font-semibold text-gray-700">Click or drag to select a document</p>
      <p class="text-xs text-gray-400 mt-1.5">PDF, PNG, JPG (Max. 50MB)</p>
    </div>

    <div v-else class="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Icon icon="lucide:file-text" class="w-5 h-5 text-emerald-600" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-800 truncate">{{ fileName }}</p>
          <p class="text-xs text-gray-500">{{ formatSize(fileSize) }}</p>
        </div>
        <button
          class="text-xs text-emerald-600 hover:text-emerald-800 font-semibold px-3 py-1.5 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
          @click="inputRef?.click()">
          Change
        </button>
      </div>
    </div>
  </div>
</template>
