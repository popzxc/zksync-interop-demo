import { type Ref, ref } from 'vue';

import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';

import { useInteropFinalizer, type InteropRequest } from './useInteropFinalizer';
import { InteropContracts } from '../sdk/interop/contracts';
import { L2_ASSET_ROUTER_ADDRESS, L2_NATIVE_TOKEN_VAULT_ADDRESS, L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS, REQUIRED_L2_GAS_PRICE_PER_PUBDATA } from '../sdk/constants';
import { useWallet, WalletKind } from "./useWallet";
import { ChainKind } from '../types';
import useToken from './useToken';

const initializedChains = new Map<ChainKind, Ref<boolean>>();
initializedChains.set(ChainKind.Era, ref(false));
initializedChains.set(ChainKind.Gateway, ref(false));
initializedChains.set(ChainKind.Validium, ref(false));

export interface ChainData {
    sender: string;
    senderBalance: bigint;
    latestBlock: number;
    finalizedBlock: number;
}

export default function useChain(kind: ChainKind) {
    const interopWallet = useWallet(kind, WalletKind.User);
    const finalizerWallet = (kind === ChainKind.Era || kind === ChainKind.Validium) ? useWallet(kind, WalletKind.Finalizer).wallet : null;

    const interopContracts = new InteropContracts(interopWallet.wallet);
    const interopFinalizer = useInteropFinalizer();

    const isInitialized = () => {
        const initializedRef = initializedChains.get(kind);
        if (!initializedRef) {
            return false;
        }
        return initializedRef.value;
    }

    const init = async () => {
        if (isInitialized()) {
            return;
        }

        await interopWallet.depositIfNeeded();

        if (finalizerWallet !== null) {
            await interopWallet.transferIfNeeded(finalizerWallet);
        }

        const { deployTokenIfNeeded } = useToken();
        await deployTokenIfNeeded(kind);

        if (finalizerWallet !== null) {
            interopFinalizer.run(kind);
        }

        initializedChains.get(kind)!.value = true;
    }

    const getData = async (): Promise<ChainData> => {
        const latestBlock = await interopWallet.wallet.provider.getBlock('latest');
        const finalizedBlock = await interopWallet.wallet.provider.getBlock('finalized');
        const balance = await interopWallet.wallet.provider.getBalance(interopWallet.wallet.address);
        return {
            sender: interopWallet.wallet.address,
            senderBalance: balance,
            latestBlock: latestBlock.number,
            finalizedBlock: finalizedBlock.number
        };
    };

    const addInteropRequest = (request: InteropRequest) => {
        if (interopFinalizer) {
            interopFinalizer.addRequest(request);
        } else {
            throw new Error("Interop finalizer is not initialized for this chain.");
        }
    };

    const sendTokenToAnotherChain = async (
        targetChainId: bigint,
        targetChainRichWallet: zksync.Wallet
    ): Promise<zksync.types.TransactionReceipt> => {
        const { getToken } = useToken();
        const token = await getToken(kind);
        if (!token) {
            throw new Error("Token is not initialized for this chain.");
        }

        if (kind !== ChainKind.Era && kind !== ChainKind.Validium) {
            throw new Error("This method is only available for L2 chains.");
        }

        const transferAmount = ethers.parseEther('1');

        if (await token.allowance(L2_NATIVE_TOKEN_VAULT_ADDRESS) < transferAmount) {
            // Mint more than needed to avoid repeated transactions on each submission.
            const mintAmount = ethers.parseEther('5000');
            await token.approve(L2_NATIVE_TOKEN_VAULT_ADDRESS, mintAmount);
            await token.mint(interopWallet.wallet.address, mintAmount);
        }


        const sourceNetwork = await interopWallet.wallet.provider.getNetwork();
        const chain2Contracts = new InteropContracts(targetChainRichWallet);
        const aliasedInterop1WalletAddress = await chain2Contracts.aliasedAccount(
            interopWallet.wallet.address,
            sourceNetwork.chainId
        );
        console.log('aliasedInterop1WalletAddress', aliasedInterop1WalletAddress);

        const feeValue = ethers.parseEther('0.2');
        const txReceipt = await fromInterop1RequestInterop(
            interopWallet.wallet.address,
            interopContracts.interopCenter,
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
                        token.meta.assetId!,
                        transferAmount,
                        aliasedInterop1WalletAddress
                    ),
                    value: 0n,
                    requestedInteropCallValue: 0n
                }
            ]
        );
        console.log(`Interop request sent: ${txReceipt.hash}`);
        return txReceipt;
    };

    return {
        name: kind.toString(),
        kind,
        interopWallet: interopWallet.wallet,
        init,
        getData,
        addInteropRequest,
        isInitialized,
        sendTokenToAnotherChain
    };
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
