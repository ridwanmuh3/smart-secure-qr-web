<script setup lang="ts">
</script>

<template>
  <div class="flex min-h-screen">
    <LayoutSidebarNav />
    <main class="flex-1 md:ml-70 mb-16 md:mb-0 py-8 px-6 transition-all duration-300">
      <slot />
    </main>
  </div>
</template>
