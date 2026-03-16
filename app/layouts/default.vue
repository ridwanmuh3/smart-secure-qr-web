<script setup lang="ts">
</script>

<template>
  <div class="flex min-h-screen">
    <LayoutSidebarNav />
    <main class="flex-1 ml-64 py-8 transition-all duration-300">
      <slot />
    </main>
  </div>
</template>
