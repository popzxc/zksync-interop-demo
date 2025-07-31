<script setup>
import { onMounted, ref } from 'vue';

import { ChainKind } from '../../types';
import useChain from '../../composables/useChain';
import useHelpState from '../../composables/useHelpState';

import Chain from './Chain.vue'
import RequestList from '../RequestList.vue';

const era = useChain(ChainKind.Era);
const validium = useChain(ChainKind.Validium);
const gateway = useChain(ChainKind.Gateway);

const isReady = ref(false);
const status = ref('Initializing chains...');

const { toggleHelp } = useHelpState();

onMounted(async () => {
  status.value = 'Initializing gateway chain';
  await gateway.init();
  status.value = 'Initializing era chain';
  await era.init();
  status.value = 'Initializing validium chain';
  await validium.init();
  isReady.value = true;
  status.value = 'All chains initialized';
})

</script>

<template>
  <v-container class="fill-height" max-width="900">
    <div>
      <div class="mb-8 text-center">
        <div class="text-body-2 font-weight-light mb-n1">Welcome to</div>
        <h1 class="text-h2 font-weight-bold">ZKsync Interop Demo</h1>
        <v-btn @click=toggleHelp>Toggle help</v-btn>
      </div>
      
      <v-row>
        <v-col cols="12">
          <RequestList />
        </v-col>

        <v-col cols="6" v-if="isReady">
          <Chain :chain="ChainKind.Era" :connected-chain="ChainKind.Validium" />
        </v-col>
        <v-col cols="6" v-if="isReady">
          <Chain :chain="ChainKind.Validium" :connected-chain="ChainKind.Era" />
        </v-col>
        <v-col cols="12" v-if="!isReady">
          <v-card><p>{{ status }}</p></v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>
