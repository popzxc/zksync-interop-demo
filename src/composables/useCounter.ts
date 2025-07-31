import { useStorage } from "@vueuse/core";
import { Counter } from "../sdk/counter/counter";
import { ref } from "vue";
import { WalletKind, useWallet } from "./useWallet";
import { ChainKind } from '../types';

export default () => {
    const status = ref("Initializing counter...");

    const getCounter = async (chain: ChainKind): Promise<Counter | null> => {
        const { wallet } = useWallet(chain, WalletKind.User);
        const name = chain.toString();
        const counterMeta = useStorage(`counterMeta-${name.toLowerCase()}`, '');
        if (counterMeta.value === '') {
            return null;
        }
        const counterMetaParsed = JSON.parse(counterMeta.value);
        if (await wallet.provider.getCode(counterMetaParsed.l2Address) === '0x') {
            return null;
        }
        return Counter.fromMeta(wallet, counterMetaParsed);
    };

    const deployCounterIfNeeded = async (chain: ChainKind) => {
        const maybeCounter = await getCounter(chain);
        if (maybeCounter) {
            status.value = `Counter already deployed for ${chain}`;
            return maybeCounter;
        }

        const { wallet } = useWallet(chain, WalletKind.User);
        const name = chain.toString();

        status.value = `Checking counter deployment for ${name}...`;
        const counterMeta = useStorage(`counterMeta-${name.toLowerCase()}`, '');

        status.value = `Deploying counter for ${name}...`;
        const counter = await Counter.deploy(
            wallet,
        );
        counterMeta.value = JSON.stringify(counter.meta);
        status.value = `Counter deployed for ${name}`;

        return counter;
    };

    return {
        status,
        getCounter,
        deployCounterIfNeeded
    };
};
