import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';
import { ArtifactMintableERC20, } from '../constants';
import { InteropContracts } from '../interop/contracts';

export interface InteropTokenMeta {
    name: string,
    symbol: string,
    decimals: number,
    l2Address: string,
    assetId: string,
    l2AddressSecondChain: string,
};

/**
 * Represents a token on the source chain.
 */
export class Token {
    private constructor(
        public meta: InteropTokenMeta,
        private contract: zksync.Contract,
    ) {
    }

    public static fromMeta(wallet: zksync.Wallet, meta: InteropTokenMeta): Token {
        const contract = new zksync.Contract(meta.l2Address, ArtifactMintableERC20.abi, wallet);
        return new Token(meta, contract);
    }

    public static async deploy(wallet: zksync.Wallet, name: string, symbol: string, decimals: number): Promise<Token> {
        const interopContracts = new InteropContracts(wallet);
        const contract = await deployContract(wallet, ArtifactMintableERC20, [
            name,
            symbol,
            decimals
        ]);
        const l2Address = await contract.getAddress();


        await (await interopContracts.nativeTokenVault.registerToken(l2Address)).wait();
        const assetId = await interopContracts.nativeTokenVault.assetId(l2Address);
        const l2AddressSecondChain = await interopContracts.nativeTokenVault.tokenAddress(assetId);
        const meta = {
            name,
            symbol,
            decimals,
            l2Address,
            assetId,
            l2AddressSecondChain
        };
        const token = new Token(meta, contract);
        return token;
    }

    public async mint(address: string, amount: bigint): Promise<void> {
        await (await this.contract.mint(address, amount)).wait()
    }

    public async approve(spender: string, amount: bigint): Promise<void> {
        await (await this.contract.approve(spender, amount)).wait();
    }

    /**
     * Returns the interop token interface for the destination chain.
     */
    public asInteropToken(provider: zksync.Provider): InteropToken {
        return new InteropToken(provider, this.meta.l2AddressSecondChain);
    }
};

/**
 * Represents an interop token interface on another chain.
 * It is assumed to be already deployed and registered.
 */
export class InteropToken {
    public constructor(
        private provider: zksync.Provider,
        private tokenAddress: string,
    ) { }

    public async getBalance(address: string): Promise<bigint> {
        if (!this.tokenAddress) {
            throw new Error('Token address is not provided');
        }
        if (this.tokenAddress === ethers.ZeroAddress) {
            // Happens when token wasn't deployed yet. Therefore there is no balance.
            return 0n;
        }
        const tokenContract = new zksync.Contract(this.tokenAddress, ArtifactMintableERC20.abi, this.provider);
        return await tokenContract.balanceOf(address);
    }
}


async function deployContract(
    initiator: zksync.Wallet,
    artifact: any,
    args: any[],
    deploymentType?: zksync.types.DeploymentType,
    overrides: any = {}
): Promise<zksync.Contract> {
    const contractFactory = new zksync.ContractFactory(artifact.abi, artifact.bytecode, initiator, deploymentType);
    const contract = (await contractFactory.deploy(...args, overrides)) as zksync.Contract;
    await contract.waitForDeployment();
    return contract;
}
