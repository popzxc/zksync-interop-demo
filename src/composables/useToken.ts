import { useStorage } from "@vueuse/core";
import { Token } from "../sdk/token/token";
import { ref } from "vue";
import { WalletKind, useWallet } from "./useWallet";
import { ChainKind } from '../types';

export default () => {
    const status = ref("Initializing token...");

    const getToken = async (chain: ChainKind): Promise<Token | null> => {
        const { wallet } = useWallet(chain, WalletKind.User);
        const name = chain.toString();
        const tokenMeta = useStorage(`tokenMeta-${name.toLowerCase()}`, '');
        if (tokenMeta.value === '') {
            return null;
        }
        const tokenMetaParsed = JSON.parse(tokenMeta.value);
        if (await wallet.provider.getCode(tokenMetaParsed.l2Address) === '0x') {
            return null;
        }
        return Token.fromMeta(wallet, tokenMetaParsed);
    };

    const deployTokenIfNeeded = async (chain: ChainKind) => {
        const maybeToken = await getToken(chain);
        if (maybeToken) {
            status.value = `Token already deployed for ${chain}`;
            return maybeToken;
        }

        const { wallet } = useWallet(chain, WalletKind.User);
        const name = chain.toString();

        status.value = `Checking token deployment for ${name}...`;
        const tokenMeta = useStorage(`tokenMeta-${name.toLowerCase()}`, '');

        status.value = `Deploying token for ${name}...`;
        const token = await Token.deploy(
            wallet,
            `InteropToken (${name})`,
            `ITK.${name.toLowerCase()}`,
            18
        );
        tokenMeta.value = JSON.stringify(token.meta);
        status.value = `Token deployed for ${name}`;

        return token;
    };

    return {
        status,
        getToken,
        deployTokenIfNeeded
    };
};
