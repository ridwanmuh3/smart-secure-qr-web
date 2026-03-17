<script setup lang="ts">
  import { Icon } from '@iconify/vue'

  const {
    keys, isLoading, error,
    loadKeys, generateKey, deleteKey, setDefault,
    exportKey, exportPrivate, importKey,
  } = useKeyManagement()

  const showGenDialog = ref(false)
  const showImportDialog = ref(false)
  const newKeyName = ref('')
  const importKeyName = ref('')
  const importType = ref<'public' | 'secret'>('public')
  const importFile = ref<File | null>(null)

  onMounted(() => loadKeys())

  async function handleGenerate() {
    if (!newKeyName.value.trim()) return
    await generateKey(newKeyName.value.trim())
    newKeyName.value = ''
    showGenDialog.value = false
  }

  async function handleImport() {
    if (!importKeyName.value.trim() || !importFile.value) return
    await importKey(importKeyName.value.trim(), importFile.value, importType.value)
    importKeyName.value = ''
    importFile.value = null
    showImportDialog.value = false
  }

  function handleImportFile(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files?.[0]) importFile.value = target.files[0]
  }

  function formatDate(d: string) {
    try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) }
    catch { return d }
  }
</script>

<template>
  <div class="max-w-3xl mx-auto px-2 md:px-6">
    <div class="flex items-center justify-between gap-4 flex-col md:flex-row mb-8">
      <div class="w-full">
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Manage Keys</h1>
        <p class="text-sm text-gray-500 mt-1">Create, import, and manage ECDSA P-256 cryptographic keys</p>
      </div>
      <div class="w-full flex gap-4 md:gap-2">
        <button
          class="flex flex-1 md:flex-0 items-center justify-center md:justify-start gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] text-sm font-semibold transition-all duration-200 shadow-sm shadow-emerald-200 cursor-pointer"
          @click="showGenDialog = true">
          <Icon icon="lucide:plus" class="w-4 h-4" />
          Create Key
        </button>
        <button
          class="flex flex-1 md:flex-0 items-center justify-center md:justify-start gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-[0.98] text-sm font-medium transition-all duration-200 cursor-pointer "
          @click="showImportDialog = true">
          <Icon icon="lucide:import" class="w-4 h-4" />
          Import
        </button>
      </div>
    </div>

    <!-- Error -->
    <Transition name="page">
      <div v-if="error"
        class="mb-5 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center gap-2.5 shadow-sm">
        <Icon icon="lucide:alert-circle" class="w-5 h-5 shrink-0" />
        {{ error }}
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
      <div class="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <Icon icon="lucide:loader-2" class="w-7 h-7 animate-spin text-emerald-600" />
      </div>
      <p class="text-sm text-gray-500">Loading keys...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="keys.length === 0"
      class="text-center py-16 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
      <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Icon icon="lucide:key-round" class="w-8 h-8 text-gray-400" />
      </div>
      <p class="text-gray-500 text-sm">No keys yet. Create a new key to start signing documents.</p>
    </div>

    <!-- Key list -->
    <div v-else class="space-y-3">
      <div v-for="key in keys" :key="key.id"
        class="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm card-hover">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center"
            :class="key.has_private_key ? 'bg-emerald-50' : 'bg-gray-50'">
            <Icon icon="lucide:key-round" class="w-5 h-5"
              :class="key.has_private_key ? 'text-emerald-600' : 'text-gray-400'" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900 text-sm">{{ key.name }}</span>
              <span v-if="key.is_default"
                class="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">Default</span>
              <span class="px-2 py-0.5 text-xs rounded-full font-medium"
                :class="key.has_private_key ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'">
                {{ key.has_private_key ? 'Full Key' : 'Public Key' }}
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">
              <span class="font-mono">{{ key.fingerprint }}</span> · {{ formatDate(key.created_at) }}
            </p>
          </div>
          <div class="flex gap-1">
            <button v-if="!key.is_default"
              class="p-2 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
              title="Set default" @click="setDefault(key.id)">
              <Icon icon="lucide:star" class="w-4 h-4" />
            </button>
            <button
              class="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Export public" @click="exportKey(key.id)">
              <Icon icon="lucide:download" class="w-4 h-4" />
            </button>
            <button v-if="key.has_private_key"
              class="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
              title="Export private" @click="exportPrivate(key.id)">
              <Icon icon="lucide:shield" class="w-4 h-4" />
            </button>
            <button
              class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete" @click="deleteKey(key.id)">
              <Icon icon="lucide:trash-2" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showGenDialog"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          @click.self="showGenDialog = false">
          <div class="modal-content bg-white rounded-2xl p-6 w-96 shadow-2xl border border-gray-200/50">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Create New Key</h3>
            <input v-model="newKeyName" type="text" placeholder="Key name..."
              class="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none mb-4 transition-all duration-200"
              @keydown.enter="handleGenerate" />
            <div class="flex justify-end gap-2">
              <button
                class="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors cursor-pointer"
                @click="showGenDialog = false">Cancel</button>
              <button
                class="px-4 py-2.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold transition-colors cursor-pointer shadow-sm shadow-emerald-200"
                :disabled="!newKeyName.trim()" @click="handleGenerate">Create</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Import Dialog -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showImportDialog"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          @click.self="showImportDialog = false">
          <div class="modal-content bg-white rounded-2xl p-6 w-96 shadow-2xl border border-gray-200/50">
            <h3 class="text-lg font-bold text-gray-900 mb-4">Import Key</h3>
            <input v-model="importKeyName" type="text" placeholder="Key name..."
              class="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none mb-3 transition-all duration-200" />
            <div class="flex gap-4 mb-3">
              <label class="flex items-center gap-2 text-sm cursor-pointer font-medium">
                <input v-model="importType" type="radio" value="public"
                  class="text-emerald-600 focus:ring-emerald-500" /> Public Key
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer font-medium">
                <input v-model="importType" type="radio" value="secret"
                  class="text-emerald-600 focus:ring-emerald-500" /> Private Key
              </label>
            </div>
            <input type="file" accept=".pem"
              class="w-full text-sm mb-4 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              @change="handleImportFile" />
            <div class="flex justify-end gap-2">
              <button
                class="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors cursor-pointer"
                @click="showImportDialog = false">Cancel</button>
              <button
                class="px-4 py-2.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold transition-colors cursor-pointer shadow-sm shadow-emerald-200"
                :disabled="!importKeyName.trim() || !importFile" @click="handleImport">Import</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
