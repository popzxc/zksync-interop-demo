import * as zksync from 'zksync-ethers';
import * as ethers from "ethers";
import { ChainKind } from '../types';

import { ETH_ADDRESS_IN_CONTRACTS } from "../sdk/constants";

export enum WalletKind {
    User = 'user',
    Finalizer = 'finalizer'
}

const walletCache = new Map<string, zksync.Wallet>();

const privateKeys = {
    user: '0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110',
    finalizer: '0xcf3cc0ef7b1c92c090180bf1eed93f17ef3f2a32b98f201adfe9688a6fea9a24'
};

const providers = {
    [ChainKind.L1]: new zksync.Provider('http://127.0.1:8545'),
    [ChainKind.Gateway]: new zksync.Provider('http://127.0.0.1:3150'),
    [ChainKind.Era]: new zksync.Provider('http://127.0.0.1:3050'),
    [ChainKind.Validium]: new zksync.Provider('http://127.0.0.1:3250')
};

export function useWallet(chain: ChainKind, kind: WalletKind) {
    const getWallet = (chain: ChainKind, kind: WalletKind): zksync.Wallet => {
        const cacheKey = `${chain}-${kind}`;

        if (walletCache.has(cacheKey)) {
            return walletCache.get(cacheKey)!;
        }

        const privateKey = privateKeys[kind];
        const provider = providers[chain];

        if (!privateKey || !provider) {
            throw new Error(`Invalid chain (${chain}) or wallet kind (${kind})`);
        }

        const wallet = new zksync.Wallet(privateKey, provider, providers[ChainKind.L1]);
        walletCache.set(cacheKey, wallet);
        return wallet;
    }
    const wallet = getWallet(chain, kind);

    return {
        wallet,
        depositIfNeeded: async () => {
            const PER_RICH_WALLET_BALANCE = ethers.parseEther("1000");
            const balance = await wallet.provider.getBalance(wallet.address);
            if (balance < (PER_RICH_WALLET_BALANCE / 2n)) {
                await (
                    await wallet.deposit({
                        token: ETH_ADDRESS_IN_CONTRACTS,
                        amount: PER_RICH_WALLET_BALANCE,
                        to: wallet.address,
                        approveERC20: true,
                        approveBaseERC20: true,
                    })
                ).wait();
            }
        },
        transferIfNeeded: async (to: zksync.Wallet): Promise<void> => {
            const PER_WALLET_BALANCE = ethers.parseEther("2");
            const balance = await wallet.provider.getBalance(to.address);
            if (balance < (PER_WALLET_BALANCE / 2n)) {
                await (await wallet.sendTransaction({
                    to: to.address,
                    value: PER_WALLET_BALANCE
                })).wait();
            }
        }
    };
}
