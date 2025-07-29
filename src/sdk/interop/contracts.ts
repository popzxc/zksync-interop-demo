import * as zksync from 'zksync-ethers';
import { ArtifactInteropCenter, ArtifactInteropHandler, ArtifactNativeTokenVault, L2_INTEROP_CENTER_ADDRESS, L2_INTEROP_HANDLER_ADDRESS, L2_NATIVE_TOKEN_VAULT_ADDRESS } from '../constants';


export class InteropContracts {
    public interopCenter: zksync.Contract;
    public nativeTokenVault: zksync.Contract;
    public interopHandler: zksync.Contract;


    public constructor(wallet: zksync.Wallet) {
        this.interopCenter = new zksync.Contract(L2_INTEROP_CENTER_ADDRESS, ArtifactInteropCenter.abi, wallet);
        this.nativeTokenVault = new zksync.Contract(L2_NATIVE_TOKEN_VAULT_ADDRESS, ArtifactNativeTokenVault.abi, wallet);
        this.interopHandler = new zksync.Contract(L2_INTEROP_HANDLER_ADDRESS, ArtifactInteropHandler.abi, wallet);
    }

    public async aliasedAccount(address: string, chainId: bigint): Promise<string> {
        return await this.interopHandler.getAliasedAccount(address, chainId);
    }

}
