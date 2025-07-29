import { ref, shallowRef, type ShallowRef, triggerRef } from "vue";

import { ChainKind } from '../types';
import useChain from "./useChain";


const chains = new Map<string, ShallowRef<ChainKind | null>>();
chains.set("era", shallowRef(null));
chains.set("gateway", shallowRef(null));
chains.set("validium", shallowRef(null));

const status = ref("Initializing chains...");
const isReady = ref(false);

export default () => {
    const createChain = async (chain: ChainKind) => {
        const { init } = useChain(chain);
        await init();
        status.value = `Chain ${chain} initialized`;
    }

    const init = async () => {
        status.value = "Creating chains...";
        await createChain(ChainKind.Era);
        await createChain(ChainKind.Gateway);
        await createChain(ChainKind.Validium);
        status.value = "Chains created";
        isReady.value = true;
    }

    return {
        status,
        chains,
        isReady,
        init,
    }
}
