<script setup>
import { ChainKind } from '../../types';
import useChain from '../../composables/useChain';

const props = defineProps({
    from: ChainKind,
    to: ChainKind,
});

const from = useChain(props.from);
const to = useChain(props.to);

async function sendTx() {
    console.log(`Init`);
    const targetNetwork = await to.interopWallet.provider.getNetwork();
    const tx = await from.sendTokenToAnotherChain(targetNetwork.chainId, to.interopWallet);
    console.log(`Sent token: ${tx.hash}`);
    to.addInteropRequest({
        from: props.from,
        to: props.to,
        txReceipt: tx,
        sourceProvider: from.interopWallet.provider,
    });
}

</script>

<template>
    <v-btn variant="outlined" @click="sendTx">
      Submit interop tx to {{ to.name }}
    </v-btn>

</template>

<style scoped>

</style>
