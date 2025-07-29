<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
import * as ethers from 'ethers';

import useChain from '../../composables/useChain';
import { ChainKind } from '../../types';

import SubmitInteropTxButton from '../buttons/SubmitInteropTxButton.vue';
import RequestList from '../RequestList.vue';

const props = defineProps({
  chain: ChainKind,
  connectedChain: ChainKind,
});

const chain = useChain(props.chain);
const connectedChain = useChain(props.connectedChain);

const data = ref({
    blockNumber: 0,
    sender: '',
    senderBalance: 0n,
});

let intervalId;
let isRunning = false;


async function fetchData() {
  if (!chain.isInitialized()) {
    return;
  }

  if (isRunning) return;  // prevent overlapping calls
  isRunning = true;

  try {
    data.value = await chain.getData();
  } catch (e) {
    console.error('Fetch failed', e);
  } finally {
    isRunning = false;
  }
}

onMounted(() => {
  fetchData() // optional: run immediately
  intervalId = setInterval(fetchData, 500)
})

onUnmounted(() => {
  clearInterval(intervalId)
})

</script>

<template>
  <v-card class="mx-auto " color="outlined">
    
    <v-toolbar color="cyan-darken-4">
      <v-toolbar-title>{{ chain.name }}</v-toolbar-title>
    </v-toolbar>

    <v-card-item> Current Block Number: {{ data.blockNumber }}</v-card-item>
    <v-card-item> Sender Balance: {{ ethers.formatEther(data.senderBalance) }} ETH</v-card-item>
    <v-card-item>
      <SubmitInteropTxButton :from="chain.kind" :to="connectedChain.kind" />
    </v-card-item>
  </v-card>

</template>

<style scoped>

</style>
