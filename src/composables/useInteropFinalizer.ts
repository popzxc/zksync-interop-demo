import { shallowRef, triggerRef } from 'vue';
import * as zksync from 'zksync-ethers';
import { InteropRequestFinalizer } from '../sdk/finalizer/finalizer';
import { sleep } from 'zksync-ethers/build/utils';

import { ChainKind } from '../types';
import { useWallet, WalletKind } from './useWallet';
import useInteropState, { InteropMessageState } from './useInteropState';

export interface InteropRequest {
    from: ChainKind;
    to: ChainKind;
    txReceipt: zksync.types.TransactionReceipt;
    sourceProvider: zksync.Provider;
}

const instances: any = {};

const pendingRequests = {
    [ChainKind.Era]: [] as InteropRequest[],
    [ChainKind.Validium]: [] as InteropRequest[],
    [ChainKind.Gateway]: [] as InteropRequest[],
    [ChainKind.L1]: [] as InteropRequest[],
};
const finalizedRequests = {
    [ChainKind.Era]: [] as InteropRequest[],
    [ChainKind.Validium]: [] as InteropRequest[],
    [ChainKind.Gateway]: [] as InteropRequest[],
    [ChainKind.L1]: [] as InteropRequest[],
};

const interopState = useInteropState();

export default function useInteropFinalizer() {
    const addRequest = (request: InteropRequest) => {
        const kind = request.to;
        pendingRequests[kind]?.push(request);
        console.log(`Request added for ${kind}: ${request.txReceipt.hash}`);
        interopState.addRequest({
            from: request.from,
            to: request.to,
            txHash: request.txReceipt.hash,
            status: InteropMessageState.Initiated,
        });
    };

    const run = async (kind: ChainKind) => {
        if (kind == ChainKind.L1 || kind == ChainKind.Gateway) {
            throw new Error(`Finalizer is not supported for ${kind} chain`);
        }

        while (true) {
            await processNextRequest(kind);
            await sleep(1000);
        }
    };

    const processNextRequest = async (kind: ChainKind) => {
        const request = pendingRequests[kind][0];
        if (request) {
            const { wallet } = useWallet(kind, WalletKind.Finalizer);

            try {
                await finalizeRequest(request, wallet.provider, wallet);
            } catch (error: any) {
                // TODO: right now there is a race condition where `run` function can be called multiple times
                // because of hot reload. This is a dirty hack to not overwrite the status from finalized to failed.
                if (interopState.requestStatus(request.txReceipt.hash) !== InteropMessageState.Finalized) {
                    console.error(`Failed to finalize request for ${kind}:`, error);
                    interopState.updateRequest(request.txReceipt.hash, InteropMessageState.Failed, error.toString());
                }
            }

            finalizedRequests[kind].push(request);
            pendingRequests[kind].shift();
        }
        return null;
    };

    const finalizeRequest = async (request: InteropRequest, provider: zksync.Provider, chainMover: zksync.Wallet) => {
        const finalizer = new InteropRequestFinalizer(
            provider,
            request.sourceProvider,
            request.txReceipt,
            chainMover,
        );

        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.WaitingForFinalizeOnL2);

        // 1. Batch with transaction should be finalized on source chain
        while (!await finalizer.isRequestFinalizedOnSourceChain()) {
            await sleep(500);
        };
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.WaitingForFinalizeOnGateway);

        // 2. `finalizeWithdrawalParams` will only be available after the batch is finalized on the gateway.
        let finalizeWithdrawalParams = await finalizer.getFinalizeWithdrawalParams();
        while (!finalizeWithdrawalParams) {
            await sleep(500);
            finalizeWithdrawalParams = await finalizer.getFinalizeWithdrawalParams();
        }
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.WaitingToAppearOnTargetL2);

        // 3. Wait for the target chain to fetch interop roots from the gateway.
        while (!await finalizer.canFinalize(finalizeWithdrawalParams)) {
            await sleep(5000);
            if (finalizer.targetChainMover) {
                await finalizer.devMoveChain();
            }
        }
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.BroadcastingTxOnTargetL2);

        // 4. Finally, broadcast the transaction on the target L2 chain.
        await finalizer.finalize();
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.Finalized);
    };

    return {
        pendingRequests,
        finalizedRequests,
        addRequest,
        processNextRequest,
        run
    };
}
