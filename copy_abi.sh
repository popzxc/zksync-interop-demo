#!/bin/bash

set -eo pipefail

# This script copies the ABI files from the source directory to the destination directory.
ERA_DIR="/home/popzxc/temp_work/wip-interop/zksync-era"
DEST_DIR="src/sdk/abi"

# Exit if either of directories do not exist
if [ ! -d "$ERA_DIR" ]; then
  echo "Source directory does not exist: $ERA_DIR"
  exit 1
fi
if [ ! -d "$DEST_DIR" ]; then
  echo "Destination directory does not exist: $DEST_DIR"
  exit 1
fi

L1_CONTRACTS_DIR="$ERA_DIR/contracts/l1-contracts/out"
L1_CONTRACTS_ZKOUT_DIR="$ERA_DIR/contracts/l1-contracts/zkout"
SYSTEM_CONTRACTS_DIR="$ERA_DIR/contracts/system-contracts/zkout"

# export const ArtifactBridgeHub = readContract(`${ARTIFACTS_PATH}`, 'Bridgehub');
# export const ArtifactInteropCenter = readContract(`${ARTIFACTS_PATH}`, 'InteropCenter');
# export const ArtifactInteropHandler = readContract(`${ARTIFACTS_PATH}`, 'InteropHandler');
# export const ArtifactL2MessageVerification = readContract(`${ARTIFACTS_PATH}`, 'L2MessageVerification');
# export const ArtifactNativeTokenVault = readContract(`${ARTIFACTS_PATH}`, 'L2NativeTokenVault');
# export const ArtifactL1AssetRouter = readContract(`${ARTIFACTS_PATH}`, 'L1AssetRouter');
# export const ArtifactAssetTracker = readContract(`${ARTIFACTS_PATH}`, 'AssetTracker');


# export const ArtifactL2InteropRootStorage = readContract(`${SYSTEM_ARTIFACTS_PATH}`, 'L2InteropRootStorage');
# export const ArtifactMintableERC20 = readContract('../../../contracts/l1-contracts/zkout', 'TestnetERC20Token');

cp "$L1_CONTRACTS_DIR/Bridgehub.sol/Bridgehub.json" "$DEST_DIR"
cp "$L1_CONTRACTS_DIR/InteropCenter.sol/InteropCenter.json" "$DEST_DIR"
cp "$L1_CONTRACTS_DIR/InteropHandler.sol/InteropHandler.json" "$DEST_DIR"
cp "$L1_CONTRACTS_DIR/L2MessageVerification.sol/L2MessageVerification.json" "$DEST_DIR"
cp "$L1_CONTRACTS_DIR/L2NativeTokenVault.sol/L2NativeTokenVault.json" "$DEST_DIR"
cp "$L1_CONTRACTS_DIR/L1AssetRouter.sol/L1AssetRouter.json" "$DEST_DIR"
cp "$L1_CONTRACTS_DIR/AssetTracker.sol/AssetTracker.json" "$DEST_DIR"

cp "$SYSTEM_CONTRACTS_DIR/L2InteropRootStorage.sol/L2InteropRootStorage.json" "$DEST_DIR"

cp "$L1_CONTRACTS_ZKOUT_DIR/TestnetERC20Token.sol/TestnetERC20Token.json" "$DEST_DIR"

cp "./contracts/zkout/Counter.sol/Counter.json" "$DEST_DIR"
