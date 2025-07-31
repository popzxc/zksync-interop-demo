import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';
import { InteropContracts } from './contracts';
import { ArtifactMintableERC20, L2_ASSET_ROUTER_ADDRESS, L2_NATIVE_TOKEN_VAULT_ADDRESS, L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS, REQUIRED_L2_GAS_PRICE_PER_PUBDATA } from '../constants';
import type { Address } from 'zksync-ethers/build/types';


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

    /**
     * Will initiate the interop token transfer to another chain.
     * 
     * @param tokenAddress address of the token on the _source_ chain
     * @param amount amount of token to transfer
     * @param targetChainId chain ID of the target chain
     * @param targetProvider target provider (used to calculate aliased account on the target chain)
     * @returns 
     */
    async initiateInteropTransfer(
        tokenAddress: string,
        amount: bigint,
        targetChainId: bigint,
        targetProvider: zksync.Provider
    ): Promise<zksync.types.TransactionReceipt> {
        const erc20 = new zksync.Contract(tokenAddress, ArtifactMintableERC20.abi, this.wallet);
        if (await erc20.allowance(this.wallet.address, L2_NATIVE_TOKEN_VAULT_ADDRESS) < amount) {
            // Mint more than needed to avoid repeated transactions on each submission.
            const mintAmount = ethers.parseEther('5000');
            const approveTx = await erc20.approve(L2_NATIVE_TOKEN_VAULT_ADDRESS, mintAmount);
            await approveTx.wait();

            // Minting is obviously not a part of the logic, it's here just because it's a demo.
            const mintTx = await erc20.mint(this.wallet.address, mintAmount);
            await mintTx.wait();
        }

        const assetId = await this.interopContracts.nativeTokenVault.assetId(tokenAddress);
        const aliasedAddress = await this.aliasedAccount(targetProvider);

        const feeValue = ethers.parseEther('0.2');
        const txReceipt = await fromInterop1RequestInterop(
            this.wallet.address,
            this.interopContracts.interopCenter,
            targetChainId,
            [
                {
                    directCall: true,
                    nextContract: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
                    data: '0x',
                    value: 0n,
                    requestedInteropCallValue: feeValue
                }
            ],
            [
                {
                    directCall: false,
                    nextContract: L2_ASSET_ROUTER_ADDRESS,
                    data: getTokenTransferSecondBridgeData(
                        assetId,
                        amount,
                        aliasedAddress
                    ),
                    value: 0n,
                    requestedInteropCallValue: 0n
                }
            ]
        );
        return txReceipt;
    }

    /**
     * Calls any contract on the target chain using interop.
     * The call will be performed from the *aliased account* on the target chain.
     * 
     * @param targetChainId target chain ID
     * @param targetAddress address of the contract on the target chain (doesn't have to be interop-aware)
     * @param targetCalldata calldata to be used in call
     * @returns 
     */
    async callContract(targetChainId: bigint, targetAddress: string, targetCalldata: string): Promise<zksync.types.TransactionReceipt> {
        const feeValue = ethers.parseEther('0.2');
        console.log(`Calling contract on target chain ${targetChainId} at address ${targetAddress} with calldata ${targetCalldata}`);
        const txReceipt = await fromInterop1RequestInterop(
            this.wallet.address,
            this.interopContracts.interopCenter,
            targetChainId,
            [
                {
                    directCall: true,
                    nextContract: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
                    data: '0x',
                    value: 0n,
                    requestedInteropCallValue: feeValue
                }
            ],
            [
                {
                    directCall: true,
                    nextContract: targetAddress,
                    data: targetCalldata,
                    value: 0n,
                    requestedInteropCallValue: 0n
                }
            ]
        );
        return txReceipt;
    }
}


async function fromInterop1RequestInterop(
    from: string,
    interopCenter: zksync.Contract,
    targetChainId: bigint,
    feeCallStarters: InteropCallStarter[],
    execCallStarters: InteropCallStarter[]
): Promise<zksync.types.TransactionReceipt> {
    const tx = await interopCenter.requestInterop(
        targetChainId,
        L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
        feeCallStarters,
        execCallStarters,
        {
            gasLimit: 30000000n,
            gasPerPubdataByteLimit: REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
            refundRecipient: from,
            paymaster: ethers.ZeroAddress,
            paymasterInput: '0x'
        },
        {
            value: [...feeCallStarters, ...execCallStarters].reduce(
                (total, item) => total + BigInt(item.requestedInteropCallValue),
                0n
            )
        }
    );
    const txReceipt: zksync.types.TransactionReceipt = await tx.wait();
    console.log(`Interop request sent: ${txReceipt.hash}`);
    return txReceipt;
}

function getTokenTransferSecondBridgeData(assetId: string, amount: bigint, recipient: string) {
    return ethers.concat([
        '0x01',
        new ethers.AbiCoder().encode(
            ['bytes32', 'bytes'],
            [
                assetId,
                new ethers.AbiCoder().encode(
                    ['uint256', 'address', 'address'],
                    [amount, recipient, ethers.ZeroAddress]
                )
            ]
        )
    ]);
}

interface InteropCallStarter {
    directCall: boolean;
    nextContract: string;
    data: string;
    value: bigint;
    requestedInteropCallValue: bigint;
}
