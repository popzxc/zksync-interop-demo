import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';
import { ArtifactInteropCenter, ArtifactInteropHandler, ArtifactNativeTokenVault, L2_INTEROP_CENTER_ADDRESS, L2_INTEROP_HANDLER_ADDRESS, L2_NATIVE_TOKEN_VAULT_ADDRESS } from '../constants';


export class InteropContracts {
    // Contract that is used to initiate interop requests.
    public interopCenter: zksync.Contract;
    // Manages native token assets, can be used e.g. to know the token address on the target chain.
    public nativeTokenVault: zksync.Contract;
    // Contract that is used to finalize interop requests.
    public interopHandler: zksync.Contract;


    public constructor(runner: ethers.ContractRunner) {
        this.interopCenter = new zksync.Contract(L2_INTEROP_CENTER_ADDRESS, ArtifactInteropCenter.abi, runner);
        this.nativeTokenVault = new zksync.Contract(L2_NATIVE_TOKEN_VAULT_ADDRESS, ArtifactNativeTokenVault.abi, runner);
        this.interopHandler = new zksync.Contract(L2_INTEROP_HANDLER_ADDRESS, ArtifactInteropHandler.abi, runner);
    }

    /**
     * Returns the aliased account address for the given address on the target chain.
     * `InteropContracts` should be instantiated with the provider of the *target* chain,
     * but address and chainId are provided from the *source* chain.
     */
    public async aliasedAccount(address: string, chainId: bigint): Promise<string> {
        return await this.interopHandler.getAliasedAccount(address, chainId);
    }

}
