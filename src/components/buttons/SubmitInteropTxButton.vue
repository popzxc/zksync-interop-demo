<script  setup>
import { ChainKind } from '../../types';
import useChain from '../../composables/useChain';
import useCounter from '../../composables/useCounter';
import { ButtonAction } from '../../types';

const props = defineProps({
    action: ButtonAction,
    from: ChainKind,
    to: ChainKind,
});

const from = useChain(props.from);
const to = useChain(props.to);
const { getCounter } = useCounter();

function getActionLabel(action, to) {
    switch (action) {
        case ButtonAction.TransferToken:
            return `Transfer Token to ${to}`;
        case ButtonAction.IncrementCounter:
            return `Counter++ on ${to} (interop)`;
        case ButtonAction.IncrementCounterSameChain:
            return `Counter++ on ${from.kind} (same chain)`;
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

function getHelpText(action) {
    switch (action) {
        case ButtonAction.TransferToken:
            return `Transfer native token to ${props.to} chain. The amount is automatically chosen`;
        case ButtonAction.IncrementCounter:
            return `Increment counter on ${props.to} chain using interop`;
        case ButtonAction.IncrementCounterSameChain:
            return `Increment counter on ${from.kind} chain. This will call the counter contract directly on the same chain (no interop involved).`;
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

const actionLabel = getActionLabel(props.action, props.to);
const helpText = getHelpText(props.action);

async function transferToken() {
    console.log(`Transfer token init`);
    const tx = await from.sendTokenToAnotherChain(props.to);
    console.log(`Sent token: ${tx.hash}`);
    to.addInteropRequest({
        from: props.from,
        to: props.to,
        txReceipt: tx,
        sourceProvider: from.interopWallet.provider,
    });
}

async function incrementCounter() {
    console.log(`Increment counter init`);
    const tx = await from.callCounterOnAnotherChain(props.to);
    console.log(`Sent increment counter tx: ${tx.hash}`);
    to.addInteropRequest({
        from: props.from,
        to: props.to,
        txReceipt: tx,
        sourceProvider: from.interopWallet.provider,
    });
}

async function incrementCounterSameChain() {
    console.log(`Increment counter on same chain init`);
    const counter = await getCounter(from.kind);
    await counter.increment();
    console.log(`Incremented counter on same chain`);
}

async function sendTx() {
    switch (props.action) {
        case ButtonAction.TransferToken:
            await transferToken();
            break;
        case ButtonAction.IncrementCounter:
            await incrementCounter();
            break;
        case ButtonAction.IncrementCounterSameChain:
            await incrementCounterSameChain();
            break;
        default:
            throw new Error(`Unknown action: ${props.action}`);
    }
}

</script>

<template>
    <v-btn variant="outlined" @click="sendTx">
      <InfoPopup :mainText="actionLabel" :helpText="helpText" />
    </v-btn>

</template>

<style scoped>

</style>
