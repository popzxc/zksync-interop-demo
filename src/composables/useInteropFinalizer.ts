import { ref, shallowRef, triggerRef } from 'vue';
import * as zksync from 'zksync-ethers';
import { broadcastInteropTx, getGWBlockNumber, waitForInteropRootNonZero } from '../sdk/finalizer/utils';
import { sleep } from 'zksync-ethers/build/utils';

import { ChainKind } from '../types';
import { useWallet, WalletKind } from './useWallet';

export interface InteropRequest {
    from: ChainKind;
    to: ChainKind;
    txReceipt: zksync.types.TransactionReceipt;
    sourceProvider: zksync.Provider;
    status?: string;
}

const pendingRequests = shallowRef(new Map<ChainKind, InteropRequest[]>());
const finalizedRequests = shallowRef(new Map<ChainKind, InteropRequest[]>());

export function useInteropFinalizer() {
    const addRequest = (request: InteropRequest) => {
        const kind = request.from;
        if (!pendingRequests.value.has(kind)) {
            pendingRequests.value.set(kind, []);
        }
        request.status = 'pending'; // Initialize status
        pendingRequests.value.get(kind)?.push(request);
        triggerRef(pendingRequests); // Notify Vue of the update
        console.log(`Request added for ${kind}: ${request.txReceipt.hash}`);
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
        console.log(`Running finalizer step for ${kind}`);
        const requests = pendingRequests.value.get(kind) || [];
        const request = requests[0];
        if (request) {
            const { wallet } = useWallet(kind, WalletKind.Finalizer);
            const provider = wallet.provider;
            const chainMover = wallet;
            request.status = 'processing'; // Update status to processing
            triggerRef(pendingRequests); // Notify Vue of the update

            console.log(`Processing request for ${kind}: ${request.txReceipt.hash}`);
            const canFinalize = await canFinalizeRequest(request, provider, chainMover);
            if (canFinalize) {
                request.status = 'finalizing'; // Update status to finalizing
                triggerRef(pendingRequests); // Notify Vue of the update
                await finalizeRequest(request, provider);
                if (!finalizedRequests.value.has(kind)) {
                    finalizedRequests.value.set(kind, []);
                }
                finalizedRequests.value.get(kind)?.push(request);
                request.status = 'finalized'; // Update status to finalized
                triggerRef(finalizedRequests); // Notify Vue of the update
                console.log(`Request finalized for ${kind}: ${request.txReceipt.hash}`);

                requests.shift(); // Remove the processed request
                triggerRef(pendingRequests); // Notify Vue of the update
            } else {
                console.log(`Request not finalized yet for ${kind}: ${request.txReceipt.hash}`);
            }
        }
        pendingRequests.value.set(kind, requests);
        return null;
    };

    const canFinalizeRequest = async (request: InteropRequest, provider: zksync.Provider, chainMover: zksync.Wallet) => {
        const sourceUtilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, request.sourceProvider);

        const block = await request.sourceProvider.getBlock('finalized');
        if (block.number < request.txReceipt.blockNumber) {
            return false;
        }
        console.log(`Block is finalized`);

        let finalizeWithdrawalParams;
        try {
            finalizeWithdrawalParams = await sourceUtilityWallet.getFinalizeWithdrawalParams(request.txReceipt.hash, 0, 'proof_based_gw');
        } catch (error) {
            return false;
        }
        console.log(`Can finalize`);

        const GW_CHAIN_ID = 506n;
        const gatewayBatchNumber = getGWBlockNumber(finalizeWithdrawalParams);
        await waitForInteropRootNonZero(provider, chainMover, GW_CHAIN_ID, gatewayBatchNumber);

        return true;
    };

    const finalizeRequest = async (request: InteropRequest, provider: zksync.Provider) => {
        await broadcastInteropTx(request.sourceProvider, provider, request.txReceipt.hash);
    };

    return {
        pendingRequests,
        finalizedRequests,
        addRequest,
        run
    };
}
