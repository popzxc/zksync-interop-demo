import * as zksync from 'zksync-ethers';
import * as ethers from 'ethers';
import { ArtifactInteropCenter, ArtifactInteropHandler, ArtifactMintableERC20, ArtifactNativeTokenVault, L2_ASSET_ROUTER_ADDRESS, L2_INTEROP_CENTER_ADDRESS, L2_INTEROP_HANDLER_ADDRESS, L2_NATIVE_TOKEN_VAULT_ADDRESS, L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS } from './constants';


import { Token } from './token/token';
import { InteropContracts } from './interop/contracts';

export class InteropSender {
    interopWallet: zksync.Wallet;
    contracts: InteropContracts;
    token: Token;

    constructor(
        public richWallet: zksync.Wallet,
    ) {
        this.richWallet = richWallet;
        this.interopWallet = new zksync.Wallet(zksync.Wallet.createRandom().privateKey, richWallet.provider);
        this.contracts = new InteropContracts(this.interopWallet);
    }

    public async init() {
        await (await this.richWallet.sendTransaction({
            to: this.interopWallet.address,
            value: ethers.parseEther("2")
        })).wait();

        this.token = await Token.deploy(
            this.interopWallet,
            this.contracts,
            'InteropToken',
            'ITK',
            18n
        );
    }

    // public async sendToken(
    //     targetChainId: bigint,
    //     targetChainRichWallet: zksync.Wallet,
    // ): Promise<zksync.types.TransactionReceipt> {
    // const transferAmount = 100n;
    // const chain2Contracts = new InteropContracts(targetChainRichWallet);

    // // Approve token transfer on Interop1
    // await this.token.approve(L2_NATIVE_TOKEN_VAULT_ADDRESS, transferAmount);

    // // Mint tokens for the test wallet on Interop1 for the transfer
    // await this.token.mint(this.interopWallet.address, transferAmount);

    // // Get the aliased address for interop calls on the first chain.
    // const aliasedInterop1WalletAddress = await chain2Contracts.aliasedAccount(
    //     this.interopWallet.address,
    //     0n // <- Chain ID, right? Why does it work with any value right now...
    // );
    // console.log('aliasedInterop1WalletAddress', aliasedInterop1WalletAddress);

    // // Compose and send the interop request transaction
    // const feeValue = ethers.parseEther('0.2');
    // const txReceipt = await fromInterop1RequestInterop(
    //     this.interopWallet.address,
    //     this.contracts.interopCenter,
    //     targetChainId,
    //     // Fee payment call starters
    //     [
    //         {
    //             directCall: true,
    //             nextContract: L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS,
    //             data: '0x',
    //             value: 0n,
    //             requestedInteropCallValue: feeValue
    //         }
    //     ],
    //     // Execution call starters for token transfer
    //     [
    //         {
    //             directCall: false,
    //             nextContract: L2_ASSET_ROUTER_ADDRESS,
    //             data: getTokenTransferSecondBridgeData(
    //                 this.token.meta.assetId!,
    //                 transferAmount,
    //                 aliasedInterop1WalletAddress
    //             ),
    //             value: 0n,
    //             requestedInteropCallValue: 0n
    //         }
    //     ]
    // );
    // console.log(`Interop request sent: ${txReceipt.hash}`);
    // return txReceipt;
    // }

    // public async broadcastTx(tx: zksync.types.TransactionReceipt, targetChainRichWallet: zksync.Wallet) {
    //     const transferAmount = 100n;
    //     const chain2Contracts = new InteropContracts(targetChainRichWallet);
    //     // Get the aliased address for interop calls on the first chain.
    //     const aliasedInterop1WalletAddress = await chain2Contracts.aliasedAccount(
    //         this.interopWallet.address,
    //         0n // <- Chain ID, right? Why does it work with any value right now...
    //     );

    //     // Broadcast interop transaction from Interop1 to Interop2
    //     await readAndBroadcastInteropTx(tx.hash, this.interopWallet.provider, targetChainRichWallet.provider, targetChainRichWallet);


    //     // Assert that the token balance on chain2
    //     // const interop1WalletSecondChainBalance = await getTokenBalance({
    //     //     provider: targetChainRichWallet.provider,
    //     //     tokenAddress: this.token.meta.l2AddressSecondChain!,
    //     //     address: aliasedInterop1WalletAddress
    //     // });

    //     const interop1WalletSecondChainBalance = await this.token.asInteropToken(targetChainRichWallet.provider).getBalance(aliasedInterop1WalletAddress);
    //     if (interop1WalletSecondChainBalance !== transferAmount) {
    //         throw new Error('Token balance on chain2 is not as expected');
    //     }
    //     console.log('test succeeded');
    // }
}
