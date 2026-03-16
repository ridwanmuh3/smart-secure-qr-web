<script setup lang="ts">
  import { Icon } from '@iconify/vue'

  const props = defineProps<{
    position: string
    page: number
    size: number
    isPdf?: boolean
  }>()

  const emit = defineEmits<{
    'update:position': [val: string]
    'update:page': [val: number]
    'update:size': [val: number]
  }>()

  const positions = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
  ]

  const sizes = [20, 30, 40, 50]

  const posLabel = computed(() => positions.find(p => p.value === props.position)?.label || props.position)

  const qrStyle = computed(() => {
    const s: Record<string, string> = { position: 'absolute', width: '24px', height: '24px' }
    if (props.position.includes('top')) s.top = '8px'
    else s.bottom = '8px'
    if (props.position.includes('left')) s.left = '8px'
    else s.right = '8px'
    return s
  })
</script>

<template>
  <div class="space-y-4">
    <div v-if="!isPdf" class="text-sm text-gray-500 p-3 bg-gray-50 rounded-xl">
      <Icon icon="lucide:info" class="inline w-4 h-4 mr-1" />
      Position settings only apply to PDF files.
    </div>

    <template v-else>
      <!-- Position diagram -->
      <div class="flex gap-4">
        <div class="relative w-40 h-52 bg-white border-2 border-gray-200 rounded-xl overflow-hidden shrink-0">
          <div class="absolute top-4 left-3 right-3 space-y-1.5">
            <div class="h-1.5 bg-gray-200 rounded w-4/5" />
            <div class="h-1.5 bg-gray-200 rounded w-full" />
            <div class="h-1.5 bg-gray-200 rounded w-3/5" />
            <div class="h-1.5 bg-gray-200 rounded w-4/5 mt-3" />
            <div class="h-1.5 bg-gray-200 rounded w-full" />
          </div>
          <div :style="qrStyle"
            class="border-2 border-dashed border-emerald-500 bg-emerald-50 rounded flex items-center justify-center">
            <Icon icon="lucide:qr-code" class="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>

        <div class="flex-1 space-y-3">
          <!-- Corner buttons -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Position</label>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="pos in positions" :key="pos.value"
                class="px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium cursor-pointer"
                :class="position === pos.value ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'border-gray-200 hover:bg-gray-50'"
                @click="emit('update:position', pos.value)">
                {{ pos.label }}
              </button>
            </div>
          </div>

          <!-- Page -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Page</label>
            <div class="flex gap-1.5">
              <button
                class="px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium cursor-pointer"
                :class="page === 1 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'border-gray-200 hover:bg-gray-50'"
                @click="emit('update:page', 1)">First</button>
              <button
                class="px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium cursor-pointer"
                :class="page === 0 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'border-gray-200 hover:bg-gray-50'"
                @click="emit('update:page', 0)">Last</button>
            </div>
          </div>

          <!-- Size -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Size</label>
            <div class="flex gap-1.5">
              <button v-for="s in sizes" :key="s"
                class="px-2 py-1.5 text-xs rounded-lg border transition-all duration-200 font-medium cursor-pointer"
                :class="size === s ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'border-gray-200 hover:bg-gray-50'"
                @click="emit('update:size', s)">{{ s }}mm</button>
            </div>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-500">
        {{ posLabel }} · {{ size }}mm · Page {{ page === 0 ? 'Last' : 'First' }}
      </p>
    </template>
  </div>
</template>
