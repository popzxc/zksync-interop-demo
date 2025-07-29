<template>
  <v-card
    class="mx-auto"
    color="outlined"
  >
    <v-toolbar color="cyan-darken-4">
      <v-toolbar-title>Interop requests</v-toolbar-title>
    </v-toolbar>

    <v-list>
      <v-list-item
        v-for="(item, i) in allRequests"
        :key="i"
        :title="item.title"
        :subtitle="item.subtitle"
      >
        <template v-slot:prepend>
          <v-avatar color="grey-lighten-1">
            <v-icon :color="item.color">{{ item.icon }}</v-icon>
          </v-avatar>
        </template>
      </v-list-item>
      
    </v-list>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

import { useInteropFinalizer } from '../composables/useInteropFinalizer';

const { pendingRequests, finalizedRequests } = useInteropFinalizer();

const allRequests = computed(() => {
      const allRequests = [];
      for (const [kind, r] of pendingRequests.value) {
        for (const request of r) {
          allRequests.push(
          {
            title: `(${request.from} -> ${request.to})`,
            subtitle: `${request.txReceipt.hash} (${request.status})`,
            icon: 'mdi-clock-outline',
            color: 'white'
          });
        }
      }
      for (const [kind, r] of finalizedRequests.value) {
        for (const request of r) {
          allRequests.push(
          {
            title: `(${request.from} -> ${request.to})`,
            subtitle: `${request.txReceipt.hash} (${request.status})`,
            icon: 'mdi-check-circle-outline',
            color: 'green'
          });
        }
      }

      console.log(`All requests: ${JSON.stringify(allRequests, null, 2)}`);

      return allRequests;
    }
);

</script>
