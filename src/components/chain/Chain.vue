<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
import * as ethers from 'ethers';

import useChain from '../../composables/useChain';
import useToken from '../../composables/useToken';
import useCounter from '../../composables/useCounter';
import { ChainKind, ButtonAction } from '../../types';

import { InteropTxSender } from '../../sdk/interop/sender';

import SubmitInteropTxButton from '../buttons/SubmitInteropTxButton.vue';
import RequestList from '../RequestList.vue';

const props = defineProps({
  chain: ChainKind,
  connectedChain: ChainKind,
});

const chain = useChain(props.chain);
const connectedChain = useChain(props.connectedChain);
const { getToken } = useToken();
const { getCounter } = useCounter(); 

const data = ref({
    latestBlock: 0,
    finalizedBlock: 0,
    sender: '',
    aliasedSender: '',
    senderBalance: 0n,

    erc20Address: '',
    erc20Symbol: '',
    erc20Balance: 0n,

    aliasedErc20Status: 'not deployed',
    aliasedErc20Address: '',
    aliasedErc20Symbol: '',
    erc20BalanceOnConnectedChain: 0n,

    counterAddress: '',
    counterValue: 0n,
    counterLastCaller: '',
});

let intervalId;
let isRunning = false;


async function fetchData() {
  if (!chain.isInitialized()) {
    return;
  }

  if (isRunning) return;  // prevent overlapping calls
  isRunning = true;

  const token = await getToken(chain.kind);
  const counter = await getCounter(chain.kind);
  const interopSender = new InteropTxSender(chain.interopWallet);
  const interopToken = await token.asInteropToken(connectedChain.interopWallet.provider);


  try {
    const chainData = await chain.getData();
    data.value.latestBlock = chainData.latestBlock;
    data.value.finalizedBlock = chainData.finalizedBlock;
    data.value.sender = chainData.sender;
    data.value.senderBalance = chainData.senderBalance;
    data.value.erc20Balance = await token.getBalance(chain.interopWallet.address);
    data.value.erc20Symbol = await token.symbol();
    data.value.erc20Address = token.meta.l2Address;

    data.value.counterAddress = counter.meta.l2Address;
    data.value.counterValue = await counter.number();
    data.value.counterLastCaller = await counter.lastCaller();

    const aliasedAddress = await interopSender.aliasedAccount(connectedChain.interopWallet.provider);
    data.value.aliasedSender = aliasedAddress;
    if (interopToken) {
      data.value.aliasedErc20Status = 'deployed';
      data.value.aliasedErc20Address = interopToken.address;
      data.value.aliasedErc20Symbol = await interopToken.symbol();
      data.value.erc20BalanceOnConnectedChain = await interopToken.getBalance(aliasedAddress);
    }
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

    <v-card-item> Block (latest/finalized): {{ data.latestBlock }} / {{ data.finalizedBlock }} </v-card-item>
    
    <v-divider></v-divider>
    
    <v-card-item>
      <InfoPopup mainText="Sender address:" helpText="This is the address of the interop wallet on this chain. All the transactions initiated on this chain will be sent from this account." />
      {{ data.sender }}
    </v-card-item>
    <v-card-item> Balance: {{ ethers.formatEther(data.senderBalance) }} ETH</v-card-item>
    <v-card-item> 
      {{ data.erc20Symbol }}
      <InfoPopup mainText="address:" helpText="Native ERC20 token on this chain." />
      {{ data.erc20Address }}
    </v-card-item>
    <v-card-item>
      {{ data.erc20Symbol }}
      <InfoPopup mainText="balance:" helpText="Token will be automatically minted when you will initiate your first interop tx." />
      {{ ethers.formatEther(data.erc20Balance) }}
    </v-card-item>

    <v-divider></v-divider>
    
    <v-card-item>
      <InfoPopup mainText="Aliased address" helpText="When you're sending an interop tx, it will not be initiated from the account you sent it from; instead an 'aliased' account will be deployed using a deterministic algorithm and it will be an initiator of transaction on the target chain" />
       on {{ connectedChain.name }}: {{ data.aliasedSender }}
    </v-card-item>
    <v-card-item>
      <InfoPopup mainText="Aliased token" helpText="When you transfer interop token to another chain, an 'aliased' version of this token will be automatically deployed there upon first interop transfer _finalization_. Before that, aliased token doesn't exist on the destination chain." />
      on {{ connectedChain.name }} is {{ data.aliasedErc20Status }}
    </v-card-item>
    <v-card-item v-if="aliasedErc20Status == 'deployed'"> {{ data.aliasedErc20Symbol }} address on {{ connectedChain.name }}: {{ data.aliasedErc20Address }}</v-card-item>
    <v-card-item v-if="aliasedErc20Status == 'deployed'"> {{ data.aliasedErc20Symbol }} Balance on {{ connectedChain.name }} (aliased): {{ ethers.formatEther(data.erc20BalanceOnConnectedChain) }}</v-card-item>
    
    
    <v-divider></v-divider>

    <v-card-item>
      <InfoPopup mainText="Counter" helpText="Just a simple counter contract. Can be called from any chain, doesn't have any interop specific functionality" />
      
      address: {{ data.counterAddress }}
    </v-card-item>
    <v-card-item> Counter value: {{ data.counterValue }}</v-card-item>
    <v-card-item>
      <InfoPopup mainText="Last caller:" helpText="The last account that called the counter contract. When calling through interop, you can see that this will be an aliased account from the corresponding chain." />
      {{ data.counterLastCaller }}
    </v-card-item>

    <v-card-item>
      <SubmitInteropTxButton :action="ButtonAction.TransferToken" :from="chain.kind" :to="connectedChain.kind" />
    </v-card-item>
    
    <v-card-item>
      <SubmitInteropTxButton :action="ButtonAction.IncrementCounter" :from="chain.kind" :to="connectedChain.kind" />
    </v-card-item>
    
    <v-card-item>
      <SubmitInteropTxButton :action="ButtonAction.IncrementCounterSameChain" :from="chain.kind" :to="connectedChain.kind" />
    </v-card-item>
    
  </v-card>
</template>

<style scoped>

</style>
