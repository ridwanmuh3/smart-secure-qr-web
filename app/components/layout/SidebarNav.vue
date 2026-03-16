<script setup lang="ts">
import { Icon } from '@iconify/vue'

const route = useRoute()

const navItems = [
  { path: '/issuer', label: 'Create Document QR', icon: 'lucide:file-signature' },
  { path: '/verifier', label: 'Verify Document', icon: 'lucide:shield-check' },
  { path: '/keys', label: 'Manage Keys', icon: 'lucide:key-round' },
]
</script>

<template>
  <aside class="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-emerald-900 to-emerald-800 text-white flex flex-col z-50 shadow-xl">
    <div class="px-5 py-6 border-b border-emerald-700/50">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-emerald-500/20 rounded-lg flex items-center justify-center">
          <Icon icon="lucide:qr-code" class="w-5 h-5 text-emerald-300" />
        </div>
        <div>
          <h1 class="text-base font-bold leading-tight tracking-tight">Smart Secure</h1>
          <p class="text-xs text-emerald-400">QR-Code System</p>
        </div>
      </div>
    </div>

    <nav class="flex-1 py-4 px-3 space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
        :class="route.path === item.path
          ? 'bg-white/15 text-white font-medium shadow-sm backdrop-blur-sm'
          : 'text-emerald-200 hover:bg-white/8 hover:text-white'"
      >
        <Icon :icon="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="px-5 py-4 border-t border-emerald-700/50 text-xs text-emerald-500">
      <p>&copy; 2026 Smart QR-Code</p>
    </div>
  </aside>
</template>
