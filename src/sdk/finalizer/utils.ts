import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';

import {
    L2_ASSET_ROUTER_ADDRESS,
    L2_NATIVE_TOKEN_VAULT_ADDRESS,
    L2_INTEROP_HANDLER_ADDRESS,
    L2_INTEROP_CENTER_ADDRESS,
    L2_INTEROP_ROOT_STORAGE_ADDRESS,
    L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
    REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
    ETH_ADDRESS_IN_CONTRACTS,
    ArtifactInteropCenter,
    ArtifactInteropHandler,
    ArtifactNativeTokenVault,
    ArtifactMintableERC20,
    ArtifactL2InteropRootStorage
} from '../constants';
import { FinalizeWithdrawalParams } from 'zksync-ethers/build/types';
import { ETH_ADDRESS, sleep } from 'zksync-ethers/build/utils';
import { getInteropBundleData, getInteropTriggerData } from '../tempSdk';



export function getGWBlockNumber(params: FinalizeWithdrawalParams): number {
    /// see hashProof in MessageHashing.sol for this logic.
    let gwProofIndex =
        1 + parseInt(params.proof[0].slice(4, 6), 16) + 1 + parseInt(params.proof[0].slice(6, 8), 16);
    console.log('params', params, gwProofIndex, parseInt(params.proof[gwProofIndex].slice(2, 34), 16));
    return parseInt(params.proof[gwProofIndex].slice(2, 34), 16);
}

export async function waitForInteropRootNonZero(
    provider: zksync.Provider,
    alice: zksync.Wallet,
    chainId: bigint,
    l1BatchNumber: number
) {
    const l2InteropRootStorage = new zksync.Contract(
        L2_INTEROP_ROOT_STORAGE_ADDRESS,
        ArtifactL2InteropRootStorage.abi,
        provider
    );
    let currentRoot = ethers.ZeroHash;
    let count = 0;
    while (currentRoot === ethers.ZeroHash && count < 20) {
        const tx = await alice.transfer({
            to: alice.address,
            amount: 1,
            token: ETH_ADDRESS
        });
        await tx.wait();

        currentRoot = await l2InteropRootStorage.interopRoots(parseInt(chainId.toString()), l1BatchNumber);
        console.log('currentRoot', currentRoot, count);
        count++;
    }
    console.log('Interop root is non-zero', currentRoot, l1BatchNumber);
}

/**
 * Reads an interop transaction from the sender chain, constructs a new transaction,
 * and broadcasts it on the receiver chain.
 */
export async function readAndBroadcastInteropTx(
    txHash: string,
    senderProvider: zksync.Provider,
    receiverProvider: zksync.Provider,
    receiverRichWallet: zksync.Wallet
) {
    console.log('*Reading and broadcasting interop tx initiated by txHash*', txHash);
    const senderUtilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, senderProvider);
    const txReceipt = await senderProvider.getTransactionReceipt(txHash);
    await waitUntilBlockFinalized(senderUtilityWallet, txReceipt!.blockNumber);

    /// kl todo figure out what we need to wait for here. Probably the fact that we need to wait for the GW block finalization.
    console.log(`Sleeping...`);
    for (let i = 0; i < 5; i++) {
        console.log(`Sleeping... ${i + 1}/5`);
        await sleep(5000);
    }
    console.log(`Woke up!`);
    const params = await senderUtilityWallet.getFinalizeWithdrawalParams(txHash, 0, 'proof_based_gw');
    const GW_CHAIN_ID = 506n;
    await waitForInteropRootNonZero(receiverProvider, receiverRichWallet, GW_CHAIN_ID, getGWBlockNumber(params));


}

export async function broadcastInteropTx(senderProvider: zksync.Provider, receiverProvider: zksync.Provider, txHash: string) {
    // Get interop trigger and bundle data from the sender chain.
    const triggerDataBundle = await getInteropTriggerData(senderProvider, txHash, 2);
    const feeBundle = await getInteropBundleData(senderProvider, txHash, 0);
    const executionBundle = await getInteropBundleData(senderProvider, txHash, 1);
    if (triggerDataBundle.output == null) return;

    // ABI-encode execution data along with its proof.
    const txData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes', 'bytes'],
        [executionBundle.rawData, executionBundle.fullProof]
    );

    // Construct the interop transaction for the receiver chain.
    const nonce = await receiverProvider.getTransactionCount(L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS);
    const feeData = await receiverProvider.getFeeData();
    let interopTx = {
        from: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
        to: L2_INTEROP_HANDLER_ADDRESS,
        chainId: (await receiverProvider.getNetwork()).chainId.toString(),
        data: txData,
        nonce: nonce,
        customData: {
            paymasterParams: {
                paymaster: triggerDataBundle.output.gasFields.paymaster,
                paymasterInput: triggerDataBundle.output.gasFields.paymasterInput
            },
            gasPerPubdata: triggerDataBundle.output.gasFields.gasPerPubdataByteLimit,
            customSignature: ethers.AbiCoder.defaultAbiCoder().encode(
                ['bytes', 'bytes', 'address', 'address', 'bytes'],
                [
                    feeBundle.rawData,
                    feeBundle.fullProof,
                    triggerDataBundle.output.sender,
                    triggerDataBundle.output.gasFields.refundRecipient,
                    triggerDataBundle.fullProof
                ]
            )
        },
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        gasLimit: triggerDataBundle.output.gasFields.gasLimit,
        value: 0
    };

    // Serialize and broadcast the transaction
    const hexTx = zksync.utils.serializeEip712(interopTx);
    const broadcastTx = await receiverProvider.broadcastTransaction(hexTx);
    await broadcastTx.wait();

    // console.log(broadcastTx.realInteropHash);
    console.log(broadcastTx.hash);

    // Recursive broadcast
    // await readAndBroadcastInteropTx(broadcastTx.realInteropHash!, receiverProvider, senderProvider);
}

/**
 * Retrieves the token balance for a given address.
 */
export async function getTokenBalance({
    provider,
    tokenAddress,
    address
}: {
    provider: zksync.Provider;
    tokenAddress: string;
    address: string;
}): Promise<bigint> {
    if (!tokenAddress) {
        throw new Error('Token address is not provided');
    }
    if (tokenAddress === ethers.ZeroAddress) {
        // Happens when token wasn't deployed yet. Therefore there is no balance.
        return 0n;
    }
    const tokenContract = new zksync.Contract(tokenAddress, ArtifactMintableERC20.abi, provider);
    return await tokenContract.balanceOf(address);
}

async function waitUntilBlockFinalized(wallet: zksync.Wallet, blockNumber: number) {
    // console.log('Waiting for block to be finalized...', blockNumber);
    while (true) {
        const block = await wallet.provider.getBlock('finalized');
        if (blockNumber <= block.number) {
            break;
        } else {
            await zksync.utils.sleep(wallet.provider.pollingInterval);
        }
    }
}
