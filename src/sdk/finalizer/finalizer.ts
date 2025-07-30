import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';
import { ArtifactL2InteropRootStorage, L2_INTEROP_ROOT_STORAGE_ADDRESS } from '../constants';
import { ETH_ADDRESS } from 'zksync-ethers/build/utils';
import { broadcastInteropTx } from './utils';


/**
 * Represents a class that can finalize a concrete interop request
 * on a specific L2 chain.
 * 
 * This class assumes the proof-based interop (e.g. the request must be 
 * finalized on both source and gateway chains before it can be finalized on the target chain).
 * 
 * This class will unlikely be user-facing, most likely it'll be a part of some
 * back-end responsible for automatic interop request finalization.
 */
export class InteropRequestFinalizer {
    /**
     * Instantiates a new InteropRequestFinalizer.
     * 
     * @param targetProvider provider for the target (receiver) chain
     * @param sourceProvider provider for the source (sender) chain
     * @param sourceReceipt receipt of the interop init transaction on the source chain
     * @param targetChainMover optional wallet to force block creation on the target chain
     *   This is useful for development purposes, as it ensures that interop roots are fetched
     *   from the gateway chain even if there is no activity on the target chain.
     */
    constructor(
        public targetProvider: zksync.Provider,
        public sourceProvider: zksync.Provider,
        public sourceReceipt: zksync.types.TransactionReceipt,
        public targetChainMover?: zksync.Wallet,
    ) {
    }

    /**
     * Checks if the request is finalized on the source chain (e.g. whether 
     * it's already available on the gateway chain).
     */
    async isRequestFinalizedOnSourceChain(): Promise<boolean> {
        const block = await this.sourceProvider.getBlock('finalized');
        return block.number >= this.sourceReceipt.blockNumber;
    }

    /**
     * Tries to get parameters to finalize interop request.
     * Since this class is built for proof-based interop, it will
     * not return anything until the request is finalized on the gateway chain.
     */
    async getFinalizeWithdrawalParams(): Promise<zksync.types.FinalizeWithdrawalParams | null> {
        const sourceUtilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, this.sourceProvider);
        try {
            // TODO: index is not guaranteed to be 0.
            const finalizeWithdrawalParams = await sourceUtilityWallet.getFinalizeWithdrawalParams(this.sourceReceipt.hash, 0, 'proof_based_gw');
            return finalizeWithdrawalParams;
        } catch {
            // TODO: we should differentiate between different error cases
            return null;
        }
    }

    /**
     * Assuming that you already have `finalizeWithdrawalParams` available,
     * checks if the request can be finalized on the target chain.
     * This will check if the interop root is available on the target chain.
     * 
     * Note that target chain will only pick up interop roots if new blocks are
     * being created there, so if you're interacting with a low-activity chain,
     * you might need to use `devMoveChain` method to force block creation.
     */
    async canFinalize(finalizeWithdrawalParams: zksync.types.FinalizeWithdrawalParams): Promise<boolean> {
        // Check if the interop root is available on the target chain.
        const gwChainId = 506; // Gateway chain ID (TODO: should not be hardcoded)
        const gatewayBatchNumber = getGWBlockNumber(finalizeWithdrawalParams);

        const l2InteropRootStorage = new zksync.Contract(
            L2_INTEROP_ROOT_STORAGE_ADDRESS,
            ArtifactL2InteropRootStorage.abi,
            this.targetProvider,
        );

        const currentRoot = await l2InteropRootStorage.interopRoots(gwChainId, gatewayBatchNumber);

        return currentRoot !== ethers.ZeroHash;
    }

    /**
     * If target chain mover is provided, this will trigger a transaction on the target chain
     * to cause block creation and ensure that interop roots are fetched from the gateway chain.
     */
    async devMoveChain(): Promise<void> {
        if (!this.targetChainMover) {
            throw new Error('Target chain mover is not set');
        }

        try {
            const tx = await this.targetChainMover.transfer({
                to: this.targetChainMover.address,
                amount: 0,
                token: ETH_ADDRESS
            });
            await tx.wait();
        } catch (error) {
            console.error('Failed to move chain:', error);
        }
    }

    /**
     * Will broadcast the interop request.
     */
    async finalize(): Promise<void> {
        await broadcastInteropTx(this.sourceProvider, this.targetProvider, this.sourceReceipt.hash);
    }
}

function getGWBlockNumber(params: zksync.types.FinalizeWithdrawalParams): number {
    /// see hashProof in MessageHashing.sol for this logic.
    let gwProofIndex =
        1 + parseInt(params.proof[0].slice(4, 6), 16) + 1 + parseInt(params.proof[0].slice(6, 8), 16);
    return parseInt(params.proof[gwProofIndex].slice(2, 34), 16);
}
