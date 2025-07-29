<script setup>
// import { ref } from 'vue'

defineProps({
  blockNumber: Number,
  hash: String,
})

function shortHash(hash) {
  return hash ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : '';
}

</script>

<template>
  <div class="block-info p-4 m-4 rounded-lg shadow-md bg-gray-600">
    <h2 class="text-xl font-semibold">Block Number: {{ blockNumber }}</h2>
    <p>Hash: {{ shortHash(hash) }}</p>
  </div>
</template>

<style scoped>
</style>
