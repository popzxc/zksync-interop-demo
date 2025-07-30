import type { ChainKind } from "@/types";

export enum InteropMessageState {
    Initiated = 'initiated',
    WaitingForFinalizeOnL2 = 'waitingForFinalizeOnL2',
    WaitingForFinalizeOnGateway = 'waitingForFinalizeOnGateway',
    WaitingToAppearOnTargetL2 = 'waitingToAppearOnTargetL2',
    BroadcastingTxOnTargetL2 = 'broadcastingTxOnTargetL2',
    Finalized = 'finalized',
    Failed = 'failed',
}

export interface InteropRequestForDisplay {
    from: ChainKind;
    to: ChainKind;
    txHash: string;
    status: InteropMessageState;
    error?: string;
}

// map would be more efficient, but who cares
const interopRequests: Ref<InteropRequestForDisplay[]> = ref([]);

export default function useInteropState() {
    const addRequest = (request: InteropRequestForDisplay) => {
        interopRequests.value.push(request);
    };

    const updateRequest = (txHash: string, status: InteropMessageState, error?: string) => {
        const request = interopRequests.value.find(req => req.txHash === txHash);
        if (request && request.status !== status) {
            request.status = status;
            if (error) {
                request.error = error;
            }
        } else {
            console.warn(`Request with txHash ${txHash} not found for update.`);
        }
    };


    return {
        interopRequests,
        addRequest,
        updateRequest
    }
}
