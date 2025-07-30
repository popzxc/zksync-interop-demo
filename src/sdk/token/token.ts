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
};

/**
 * Represents a token on the source chain.
 * This class is a wrapper around the MintableERC20 contract,
 * which also has metadata associated with interop.
 */
export class Token {
    private constructor(
        public owner: string,
        public meta: InteropTokenMeta,
        private contract: zksync.Contract,
    ) {
    }

    public static fromMeta(wallet: zksync.Wallet, meta: InteropTokenMeta): Token {
        const contract = new zksync.Contract(meta.l2Address, ArtifactMintableERC20.abi, wallet);
        return new Token(wallet.address, meta, contract);
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
        const meta = {
            name,
            symbol,
            decimals,
            l2Address,
            assetId
        };
        const token = new Token(wallet.address, meta, contract);
        return token;
    }

    public async name(): Promise<string> {
        return await this.contract.name();
    }

    public async symbol(): Promise<string> {
        return await this.contract.symbol();
    }

    public async mint(address: string, amount: bigint): Promise<void> {
        await (await this.contract.mint(address, amount)).wait()
    }

    public async approve(spender: string, amount: bigint): Promise<void> {
        await (await this.contract.approve(spender, amount)).wait();
    }

    public async allowance(spender: string): Promise<bigint> {
        return await this.contract.allowance(this.owner, spender);
    }

    public async getBalance(address: string): Promise<bigint> {
        return await this.contract.balanceOf(address);
    }

    /**
     * Returns the interop token interface for the destination chain.
     */
    public async asInteropToken(provider: zksync.Provider): Promise<InteropToken | null> {
        const targetInteropContracts = new InteropContracts(provider);
        const l2AddressSecondChain = await targetInteropContracts.nativeTokenVault.tokenAddress(this.meta.assetId);
        if (l2AddressSecondChain === '0x0000000000000000000000000000000000000000') {
            return null;
        }

        return new InteropToken(provider, l2AddressSecondChain);
    }
};

/**
 * Represents an interop token interface on another chain.
 * It is assumed to be already deployed and registered.
 */
export class InteropToken {
    private contract: zksync.Contract;

    public constructor(
        private provider: zksync.Provider,
        public address: string,
    ) {
        this.contract = new zksync.Contract(this.address, ArtifactMintableERC20.abi, this.provider);

    }

    public async getBalance(address: string): Promise<bigint> {
        return await this.contract.balanceOf(address);
    }

    public async name(): Promise<string> {
        return await this.contract.name();
    }

    public async symbol(): Promise<string> {
        return await this.contract.symbol();
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
