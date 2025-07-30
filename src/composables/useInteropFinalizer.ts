import { shallowRef, triggerRef } from 'vue';
import * as zksync from 'zksync-ethers';
import { broadcastInteropTx, getGWBlockNumber, waitForInteropRootNonZero } from '../sdk/finalizer/utils';
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

export function useInteropFinalizer() {
    const addRequest = (request: InteropRequest) => {
        const kind = request.from;
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
            await step(kind);
            await sleep(1000);
        }
    };

    const step = async (kind: ChainKind) => {
        const request = pendingRequests[kind][0];
        if (request) {
            const { wallet } = useWallet(kind, WalletKind.Finalizer);

            await finalizeRequest(request, wallet.provider, wallet);

            finalizedRequests[kind].push(request);
            pendingRequests[kind].shift();
        }
        return null;
    };

    const waitUntilFinalizedOnSourceChain = async (request: InteropRequest, provider: zksync.Provider) => {
        while (true) {
            const block = await provider.getBlock('finalized');
            if (block.number >= request.txReceipt.blockNumber) {
                console.log(`Request ${request.txReceipt.hash} is finalized on source chain`);
                return;
            }
            await sleep(500);
        }
    };

    const waitUntilFinalizedOnGateway = async (request: InteropRequest) => {
        const sourceUtilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, request.sourceProvider);
        while (true) {
            try {
                let finalizeWithdrawalParams = await sourceUtilityWallet.getFinalizeWithdrawalParams(request.txReceipt.hash, 0, 'proof_based_gw');
                return finalizeWithdrawalParams;
            } catch (error) {
                // TODO: probably some handling would be nice
            }
            await sleep(500);
        }
    };

    const finalizeRequest = async (request: InteropRequest, provider: zksync.Provider, chainMover: zksync.Wallet) => {
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.WaitingForFinalizeOnL2);

        // 1. Batch with transaction should be finalized on source chain
        await waitUntilFinalizedOnSourceChain(request, provider);
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.WaitingForFinalizeOnGateway);

        // 2. `finalizeWithdrawalParams` will only be available after the batch is finalized on the gateway.
        const finalizeWithdrawalParams = await waitUntilFinalizedOnGateway(request);
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.WaitingToAppearOnTargetL2);

        // 3. Wait for the target chain to fetch interop roots from the gateway.
        const GW_CHAIN_ID = 506n;
        const gatewayBatchNumber = getGWBlockNumber(finalizeWithdrawalParams);
        await waitForInteropRootNonZero(provider, chainMover, GW_CHAIN_ID, gatewayBatchNumber);
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.BroadcastingTxOnTargetL2);

        // 4. Finally, broadcast the transaction on the target L2 chain.
        await broadcastInteropTx(request.sourceProvider, provider, request.txReceipt.hash);
        interopState.updateRequest(request.txReceipt.hash, InteropMessageState.Finalized);
    };

    return {
        pendingRequests,
        finalizedRequests,
        addRequest,
        run
    };
}
