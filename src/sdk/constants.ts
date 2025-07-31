// eslint-disable-next-line @typescript-eslint/no-var-requires
export const REQUIRED_L2_GAS_PRICE_PER_PUBDATA = 800;

export const SYSTEM_UPGRADE_L2_TX_TYPE = 254;
export const ADDRESS_ONE = '0x0000000000000000000000000000000000000001';
export const ETH_ADDRESS_IN_CONTRACTS = ADDRESS_ONE;
export const L1_TO_L2_ALIAS_OFFSET = '0x1111000000000000000000000000000000001111';
export const L2_BRIDGEHUB_ADDRESS = '0x0000000000000000000000000000000000010002';
export const L2_ASSET_ROUTER_ADDRESS = '0x0000000000000000000000000000000000010003';
export const L2_NATIVE_TOKEN_VAULT_ADDRESS = '0x0000000000000000000000000000000000010004';
export const L2_MESSAGE_ROOT_ADDRESS = '0x0000000000000000000000000000000000010005';
export const L2_INTEROP_ROOT_STORAGE_ADDRESS = '0x0000000000000000000000000000000000010008';
export const L2_MESSAGE_VERIFICATION_ADDRESS = '0x0000000000000000000000000000000000010009';
export const L2_CHAIN_ASSET_HANDLER_ADDRESS = '0x000000000000000000000000000000000001000A';
export const L2_INTEROP_CENTER_ADDRESS = '0x000000000000000000000000000000000001000B';
export const L2_INTEROP_HANDLER_ADDRESS = '0x000000000000000000000000000000000001000C';
export const L2_ASSET_TRACKER_ADDRESS = '0x000000000000000000000000000000000001000D';
export const L2_INTEROP_ACCOUNT_ADDRESS = '0x000000000000000000000000000000000001000E';
export const L2_STANDARD_TRIGGER_ACCOUNT_ADDRESS = '0x000000000000000000000000000000000001000F';
export const DEPLOYER_SYSTEM_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000008006';
export const L2_TO_L1_MESSENGER_SYSTEM_CONTRACT_ADDR = '0x0000000000000000000000000000000000008008';
export const EMPTY_STRING_KECCAK = '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';
export const BRIDGEHUB_L2_CANONICAL_TRANSACTION_ABI =
    'tuple(uint256 txType, uint256 from, uint256 to, uint256 gasLimit, uint256 gasPerPubdataByteLimit, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, uint256 paymaster, uint256 nonce, uint256 value, uint256[4] reserved, bytes data, bytes signature, uint256[] factoryDeps, bytes paymasterInput, bytes reservedDynamic)';
export const BRIDGEHUB_L2_TRANSACTION_REQUEST_ABI =
    'tuple(address sender, address contractL2, uint256 mintValue, uint256 l2Value, bytes l2Calldata, uint256 l2GasLimit, uint256 l2GasPerPubdataByteLimit, bytes[] factoryDeps, address refundRecipient)';
export const L2_LOG_STRING =
    'tuple(uint8 l2ShardId,bool isService,uint16 txNumberInBatch,address sender,bytes32 key,bytes32 value)';

export const INTEROP_TRIGGER_ABI =
    'tuple(uint256 destinationChainId, address sender, address recipient,bytes32 feeBundleHash, bytes32 executionBundleHash, tuple(uint256 gasLimit, uint256 gasPerPubdataByteLimit, address refundRecipient, address paymaster, bytes paymasterInput) gasFields)';

export const INTEROP_CALL_ABI = 'tuple(bool directCall, address to, address from, uint256 value, bytes data)';
export const INTEROP_BUNDLE_ABI =
    'tuple(uint256 destinationChainId, tuple(bool directCall, address to, address from, uint256 value, bytes data)[] calls, address executionAddress)';

export const MESSAGE_INCLUSION_PROOF_ABI =
    'tuple(uint256 chainId, uint256 l1BatchNumber, uint256 l2MessageIndex, tuple(uint16 txNumberInBatch, address sender, bytes data) message, bytes32[] proof)';

import * as ArtifactBridgeHubImport from './abi/Bridgehub.json';
import * as ArtifactInteropCenterImport from './abi/InteropCenter.json';
import * as ArtifactInteropHandlerImport from './abi/InteropHandler.json';
import * as ArtifactL2InteropRootStorageImport from './abi/L2InteropRootStorage.json';
import * as ArtifactL2MessageVerificationImport from './abi/L2MessageVerification.json';
import * as ArtifactNativeTokenVaultImport from './abi/L2NativeTokenVault.json';
import * as ArtifactMintableERC20Import from './abi/TestnetERC20Token.json';
import * as ArtifactL1AssetRouterImport from './abi/L1AssetRouter.json';
import * as ArtifactAssetTrackerImport from './abi/AssetTracker.json';

import * as ArtifactCounterImport from './abi/Counter.json';

export const ArtifactBridgeHub = ArtifactBridgeHubImport;
export const ArtifactInteropCenter = ArtifactInteropCenterImport;
export const ArtifactInteropHandler = ArtifactInteropHandlerImport;
export const ArtifactL2InteropRootStorage = ArtifactL2InteropRootStorageImport;
export const ArtifactL2MessageVerification = ArtifactL2MessageVerificationImport;
export const ArtifactNativeTokenVault = ArtifactNativeTokenVaultImport;
export const ArtifactMintableERC20 = ArtifactMintableERC20Import;
export const ArtifactL1AssetRouter = ArtifactL1AssetRouterImport;
export const ArtifactAssetTracker = ArtifactAssetTrackerImport;
export const ArtifactCounter = ArtifactCounterImport;
