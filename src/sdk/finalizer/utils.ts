import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';

import {
    L2_INTEROP_HANDLER_ADDRESS,
    L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
    INTEROP_BUNDLE_ABI,
    INTEROP_TRIGGER_ABI,
    MESSAGE_INCLUSION_PROOF_ABI,
    L2_INTEROP_CENTER_ADDRESS,
    ArtifactMintableERC20,
} from '../constants';

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

interface Output {
    output: any;
    rawData: any;
    l1BatchNumber: number;
    l2TxNumberInBlock: number;
    l2MessageIndex: number;
    fullProof: string;
}

async function getInteropBundleData(
    provider: zksync.Provider,
    withdrawalHash: ethers.BytesLike,
    index = 0
): Promise<Output> {
    const response = await tryGetMessageData(provider, withdrawalHash, index);
    if (!response)
        return {
            rawData: null,
            output: null,
            l1BatchNumber: 0,
            l2TxNumberInBlock: 0,
            l2MessageIndex: 0,
            fullProof: ''
        };
    const { message } = response!;

    // Decode the interop message
    // console.log("message", message)
    const decodedRequest = ethers.AbiCoder.defaultAbiCoder().decode([INTEROP_BUNDLE_ABI], '0x' + message.slice(4));
    let calls: any[] = [];
    for (let i = 0; i < decodedRequest[0][1].length; i++) {
        calls.push({
            directCall: decodedRequest[0][1][i][0],
            to: decodedRequest[0][1][i][1],
            from: decodedRequest[0][1][i][2],
            value: decodedRequest[0][1][i][3],
            data: decodedRequest[0][1][i][4]
        });
    }
    // console.log(decodedRequest);

    const xl2Input = {
        destinationChainId: decodedRequest[0][0],
        calls: calls,
        executionAddress: decodedRequest[0][2]
    };
    // console.log("response.proof", proof_fee)
    const rawData = ethers.AbiCoder.defaultAbiCoder().encode([INTEROP_BUNDLE_ABI], [xl2Input]);
    let proofEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        [MESSAGE_INCLUSION_PROOF_ABI],
        [
            {
                chainId: (await provider.getNetwork()).chainId,
                l1BatchNumber: response.l1BatchNumber,
                l2MessageIndex: response.l2MessageIndex,
                message: [response.l2TxNumberInBlock, L2_INTEROP_CENTER_ADDRESS, rawData],
                proof: response.proof
            }
        ]
    );
    let output: Output = {
        rawData: rawData,
        output: xl2Input,
        l1BatchNumber: response.l1BatchNumber,
        l2TxNumberInBlock: response.l2TxNumberInBlock,
        l2MessageIndex: response.l2MessageIndex,
        fullProof: proofEncoded
    };
    return output;
}

async function getInteropTriggerData(
    provider: zksync.Provider,
    withdrawalHash: ethers.BytesLike,
    index = 0
): Promise<Output> {
    // console.log("index", index)
    const response = await tryGetMessageData(provider, withdrawalHash, index);
    if (!response)
        return {
            rawData: null,
            output: null,
            l1BatchNumber: 0,
            l2TxNumberInBlock: 0,
            l2MessageIndex: 0,
            fullProof: ''
        };
    const { message } = response!;

    // Decode the interop message
    // console.log("trigger message", message)
    // console.log("withdrawalHash", withdrawalHash)
    // console.log("message", message)
    let decodedRequest = ethers.AbiCoder.defaultAbiCoder().decode([INTEROP_TRIGGER_ABI], '0x' + message.slice(4));

    // console.log("decodedRequest", decodedRequest)

    let trigger = false;
    if (decodedRequest[0][5]) {
        if (decodedRequest[0][5][1] == 800n) {
            trigger = true;
        }
    }
    if (!trigger) {
        throw new Error('Trigger is not found');
    }

    // let decodedCallRequest = ethers.AbiCoder.defaultAbiCoder().decode(
    //   [INTEROP_BUNDLE_ABI],
    //   '0x' + message.slice(2)
    // )
    // console.log("trigger", trigger)
    // console.log("decodedCallRequest", decodedRequest)
    // console.log("decodedCallRequest[0][0]", decodedRequest[0][2])
    let output = {
        destinationChainId: decodedRequest[0][0],
        sender: decodedRequest[0][1],
        recipient: decodedRequest[0][2],
        feeBundleHash: decodedRequest[0][3],
        executionBundleHash: decodedRequest[0][4],
        gasFields: {
            gasLimit: decodedRequest[0][5][0],
            gasPerPubdataByteLimit: decodedRequest[0][5][1],
            refundRecipient: decodedRequest[0][5][2],
            paymaster: decodedRequest[0][5][3],
            paymasterInput: decodedRequest[0][5][4]
        }
    };
    // console.log("output", output)
    const rawData = ethers.AbiCoder.defaultAbiCoder().encode([INTEROP_TRIGGER_ABI], [output]);
    let proofEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        [MESSAGE_INCLUSION_PROOF_ABI],
        [
            {
                chainId: (await provider.getNetwork()).chainId,
                l1BatchNumber: response.l1BatchNumber,
                l2MessageIndex: response.l2MessageIndex,
                message: [response.l2TxNumberInBlock, L2_INTEROP_CENTER_ADDRESS, rawData],
                proof: response.proof
            }
        ]
    );
    return {
        rawData: rawData,
        output: output,
        l1BatchNumber: response.l1BatchNumber,
        l2TxNumberInBlock: response.l2TxNumberInBlock,
        l2MessageIndex: response.l2MessageIndex,
        fullProof: proofEncoded
    };
}

async function tryGetMessageData(provider: zksync.Provider, withdrawalHash: ethers.BytesLike, index = 0) {
    let { l1BatchNumber, l2TxNumberInBlock, message, l2MessageIndex, proof } = {
        l1BatchNumber: 0,
        l2TxNumberInBlock: 0,
        message: '',
        l2MessageIndex: 0,
        proof: ['']
    };

    try {
        // console.log("Reading interop message");
        // `getFinalizeWithdrawalParamsWithoutProof` is only available for wallet instance but not provider
        const sender_chain_utilityWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, provider);
        // const { l2ToL1LogIndex, l2ToL1Log } = await sender_chain_utilityWallet._getWithdrawalL2ToL1Log(
        //     withdrawalHash,
        //     index
        // );
        const gatewayChainId = 506;
        const {
            l1BatchNumber: l1BatchNumberRead,
            l2TxNumberInBlock: l2TxNumberInBlockRead,
            message: messageRead,
            l2MessageIndex: l2MessageIndexRead,
            proof: proofRead
        } = await sender_chain_utilityWallet.getFinalizeWithdrawalParams(withdrawalHash, index, 'proof_based_gw');
        // const logProof = await sender_chain_utilityWallet.provider.getLogProof(
        //     withdrawalHash,
        //     index,
        //     0,
        //     gatewayChainId
        // );
        // console.log({
        //     l2ToL1Log: l2ToL1Log,
        //     l2ToL1LogIndex: l2ToL1LogIndex,
        //     l1BatchNumberRead: l1BatchNumberRead,
        //     l2TxNumberInBlockRead: l2TxNumberInBlockRead,
        //     l2MessageIndexRead: l2MessageIndexRead,
        //     // "proofRead": proofRead,
        //     logProof: logProof
        // });

        // } = await getFinalizeWithdrawalParamsWithoutProof(provider, withdrawalHash, index);
        // console.log("Finished reading interop message");

        l1BatchNumber = l1BatchNumberRead || 0;
        l2TxNumberInBlock = l2TxNumberInBlockRead || 0;
        message = messageRead || '';
        l2MessageIndex = l2MessageIndexRead || 0;
        proof = proofRead || [''];

        if (!message) return;
    } catch (e) {
        console.log('Error reading interop message:', e); // note no error here, since we run out of txs sometime
        return;
    }
    return { l1BatchNumber, l2TxNumberInBlock, message, l2MessageIndex, proof };
}
