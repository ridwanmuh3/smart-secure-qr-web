<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { KeyPairInfo } from '#shared/types'

const modelValue = defineModel<string>({ required: true })

const props = defineProps<{
  keys: KeyPairInfo[]
}>()

const emit = defineEmits<{
  refresh: []
}>()

const signingKeys = computed(() => props.keys.filter(k => k.has_private_key))
</script>

<template>
  <div>
    <div v-if="keys.length === 0" class="text-sm text-gray-500 p-4 bg-amber-50 rounded-xl border border-amber-200">
      <p>No keys yet. <NuxtLink to="/keys" class="text-emerald-600 font-semibold hover:underline">Create a key</NuxtLink> first.</p>
    </div>

    <div v-else-if="signingKeys.length === 0" class="text-sm text-amber-700 p-4 bg-amber-50 rounded-xl border border-amber-200">
      <p>No keys with private key found. Import or create a new key.</p>
    </div>

    <div v-else class="flex gap-2">
      <select
        :value="modelValue"
        class="flex-1 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-200 bg-white"
        @change="modelValue = ($event.target as HTMLSelectElement).value"
      >
        <option value="" disabled>Select a key...</option>
        <option v-for="key in signingKeys" :key="key.id" :value="key.id">
          {{ key.name }} ({{ key.fingerprint }}) {{ key.is_default ? ' ★' : '' }}
        </option>
      </select>

      <button class="px-3 py-2 text-gray-500 hover:text-emerald-600 border border-gray-200 rounded-xl hover:bg-emerald-50 transition-colors" @click="emit('refresh')">
        <Icon icon="lucide:refresh-cw" class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
