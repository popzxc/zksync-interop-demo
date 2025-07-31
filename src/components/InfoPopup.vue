<script setup>

import useHelpState from '@/composables/useHelpState';

const props = defineProps({
  mainText: String,
  helpText: String,
})

const { helpEnabled } = useHelpState();

</script>

<template>

    <v-tooltip interactive :open-on-hover="true" max-width="400px" v-if="helpEnabled">
      <template v-slot:activator="{ props: activatorProps }">
        <v-badge icon="mdi-information-outline"  color="black" text-color="white" floating=true height="5px" width="10px" v-bind="activatorProps">{{props.mainText}}</v-badge>
      </template>
      <div>
        {{ props.helpText }}
      </div>
    </v-tooltip>

    <span v-else>
      {{ props.mainText }}
    </span>

</template>

