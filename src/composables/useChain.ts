import { type Ref, ref } from 'vue';

import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';

import useInteropFinalizer, { type InteropRequest } from './useInteropFinalizer';
import { useWallet, WalletKind } from "./useWallet";
import { ChainKind } from '../types';
import useToken from './useToken';
import useCounter from './useCounter';
import { InteropTxSender } from '@/sdk/interop/sender';

const initializedChains = new Map<ChainKind, Ref<boolean>>();
initializedChains.set(ChainKind.Era, ref(false));
initializedChains.set(ChainKind.Gateway, ref(false));
initializedChains.set(ChainKind.Validium, ref(false));

export interface ChainData {
    sender: string;
    senderBalance: bigint;
    latestBlock: number;
    finalizedBlock: number;
}

export default function useChain(kind: ChainKind) {
    const interopWallet = useWallet(kind, WalletKind.User);
    const finalizerWallet = (kind === ChainKind.Era || kind === ChainKind.Validium) ? useWallet(kind, WalletKind.Finalizer).wallet : null;

    const interopFinalizer = useInteropFinalizer();

    const isInitialized = () => {
        const initializedRef = initializedChains.get(kind);
        if (!initializedRef) {
            return false;
        }
        return initializedRef.value;
    }

    const init = async () => {
        if (isInitialized()) {
            return;
        }

        await interopWallet.depositIfNeeded();

        if (finalizerWallet !== null) {
            await interopWallet.transferIfNeeded(finalizerWallet);
        }

        const { deployTokenIfNeeded } = useToken();
        await deployTokenIfNeeded(kind);

        const { deployCounterIfNeeded } = useCounter();
        await deployCounterIfNeeded(kind);

        if (finalizerWallet !== null) {
            interopFinalizer.run(kind);
        }

        initializedChains.get(kind)!.value = true;
    }

    const getData = async (): Promise<ChainData> => {
        const latestBlock = await interopWallet.wallet.provider.getBlock('latest');
        const finalizedBlock = await interopWallet.wallet.provider.getBlock('finalized');
        const balance = await interopWallet.wallet.provider.getBalance(interopWallet.wallet.address);
        return {
            sender: interopWallet.wallet.address,
            senderBalance: balance,
            latestBlock: latestBlock.number,
            finalizedBlock: finalizedBlock.number
        };
    };

    const addInteropRequest = (request: InteropRequest) => {
        if (interopFinalizer) {
            interopFinalizer.addRequest(request);
        } else {
            throw new Error("Interop finalizer is not initialized for this chain.");
        }
    };

    const sendTokenToAnotherChain = async (
        to: ChainKind,
    ): Promise<zksync.types.TransactionReceipt> => {
        const toChain = useChain(to);
        const targetNetwork = await toChain.interopWallet.provider.getNetwork();

        const { getToken } = useToken();
        const token = await getToken(kind);
        if (!token) {
            throw new Error("Token is not initialized for this chain.");
        }

        if (kind !== ChainKind.Era && kind !== ChainKind.Validium) {
            throw new Error("This method is only available for L2 chains.");
        }

        const transferAmount = ethers.parseEther('1');

        const sender = new InteropTxSender(interopWallet.wallet);

        return await sender.initiateInteropTransfer(
            token.meta.l2Address,
            transferAmount,
            targetNetwork.chainId,
            toChain.interopWallet.provider
        );
    };

    const callCounterOnAnotherChain = async (to: ChainKind): Promise<zksync.types.TransactionReceipt> => {
        const toChain = useChain(to);
        const targetNetwork = await toChain.interopWallet.provider.getNetwork();

        const { getCounter } = useCounter();
        const counter = await getCounter(to);
        if (!counter) {
            throw new Error("Counter is not initialized for the target chain.");
        }
        const incrementCalldata = counter.incrementCalldata();

        const sender = new InteropTxSender(interopWallet.wallet);

        return await sender.callContract(
            targetNetwork.chainId,
            counter.meta.l2Address,
            incrementCalldata,
        );
    }

    return {
        name: kind.toString(),
        kind,
        interopWallet: interopWallet.wallet,
        init,
        getData,
        addInteropRequest,
        isInitialized,
        sendTokenToAnotherChain,
        callCounterOnAnotherChain
    };
}
