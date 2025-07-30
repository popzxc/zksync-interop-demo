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

<script lang="ts" setup>
import useInteropState, { InteropMessageState, type InteropRequestForDisplay } from '@/composables/useInteropState';


const { interopRequests } = useInteropState();

const statusMapping = {
  [InteropMessageState.Initiated]: {
    text: 'Initiated',
    color: 'white',
    icon: 'mdi-clock-outline'
  },
  [InteropMessageState.WaitingForFinalizeOnL2]: {
    text: 'Waiting for finalize on L2',
    color: 'white',
    icon: 'mdi-clock-outline'
  },
  [InteropMessageState.WaitingForFinalizeOnGateway]: {
    text: 'Waiting for finalize on Gateway',
    color: 'white',
    icon: 'mdi-clock-outline'
  },
  [InteropMessageState.WaitingToAppearOnTargetL2]: {
    text: 'Waiting to appear on Target L2',
    color: 'white',
    icon: 'mdi-clock-outline'
  },
  [InteropMessageState.BroadcastingTxOnTargetL2]: {
    text: 'Broadcasting transaction on Target L2',
    color: 'white',
    icon: 'mdi-clock-outline'
  },
  [InteropMessageState.Finalized]: {
    text: 'Finalized',
    color: 'green',
    icon: 'mdi-check-circle-outline'
  },
};

const requestToListItem = (request: InteropRequestForDisplay) => {
  return {
    title: `(${request.from} -> ${request.to}) ${request.txHash}`,
    subtitle: statusMapping[request.status].text,
    icon: statusMapping[request.status].icon,
    color: statusMapping[request.status].color
  };
};

const allRequests = computed(
  () => interopRequests.value.map(requestToListItem)
);

</script>
