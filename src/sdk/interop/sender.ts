import * as zksync from 'zksync-ethers';
import { InteropContracts } from './contracts';


/**
 * Represents a class to submit interop transactions.
 * This class represents the user-facing part of the interop process,
 * allowing users to send interop requests to the target chain.
 */
export class InteropTxSender {
    private interopContracts: InteropContracts;

    constructor(private wallet: zksync.Wallet) {
        this.interopContracts = new InteropContracts(wallet);
    }

    /**
     * Returns the aliased account address for the given address on the target chain.
     */
    async aliasedAccount(targetProvider: zksync.Provider): Promise<string> {
        const chain2Contracts = new InteropContracts(targetProvider);
        const sourceNetwork = await this.wallet.provider.getNetwork();
        return await chain2Contracts.aliasedAccount(
            this.wallet.address,
            sourceNetwork.chainId
        );
    }

    async transferErc20(): Promise<void> { }

    async callContract(): Promise<void> { }
}
