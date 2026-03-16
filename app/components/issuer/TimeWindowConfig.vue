<script setup lang="ts">
  const validFrom = defineModel<string>('validFrom', { required: true })
  const validUntil = defineModel<string>('validUntil', { required: true })

  const emit = defineEmits<{
    preset: [value: string]
  }>()

  const presets = [
    { label: '1 Hour', value: 'hour' },
    { label: '24 Hours', value: 'day' },
    { label: '7 Days', value: 'week' },
    { label: '30 Days', value: 'month' },
  ]
</script>

<template>
  <div class="space-y-3">
    <div class="flex gap-2 flex-wrap">
      <button v-for="p in presets" :key="p.value"
        class="px-3.5 py-1.5 text-xs rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium transition-all duration-200 active:scale-95 cursor-pointer"
        @click="emit('preset', p.value)">
        {{ p.label }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">Valid From</label>
        <input v-model="validFrom" type="datetime-local"
          class="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1.5">Valid Until</label>
        <input v-model="validUntil" type="datetime-local"
          class="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200" />
      </div>
    </div>
  </div>
</template>
