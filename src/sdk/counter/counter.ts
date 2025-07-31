import * as zksync from 'zksync-ethers';
import { ArtifactCounter, } from '../constants';

export interface CounterContractMeta {
    l2Address: string,
};

/**
 * Represents a counter contract.
 */
export class Counter {
    private constructor(
        public owner: string,
        public meta: CounterContractMeta,
        private contract: zksync.Contract,
    ) {
    }

    public static fromMeta(wallet: zksync.Wallet, meta: CounterContractMeta): Counter {
        const contract = new zksync.Contract(meta.l2Address, ArtifactCounter.abi, wallet);
        return new Counter(wallet.address, meta, contract);
    }

    public static async deploy(wallet: zksync.Wallet): Promise<Counter> {
        const contract = await deployContract(wallet, ArtifactCounter, []);
        const l2Address = await contract.getAddress();

        const meta: CounterContractMeta = {
            l2Address
        };

        const counter = new Counter(wallet.address, meta, contract);
        return counter;
    }

    public incrementCalldata(): string {
        return this.contract.interface.encodeFunctionData('increment');
    }

    public async increment(): Promise<void> {
        return await (await this.contract.increment()).wait();
    }

    public async number(): Promise<bigint> {
        return await this.contract.number();
    }

    public async lastCaller(): Promise<string> {
        return await this.contract.lastCaller();
    }
};

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
