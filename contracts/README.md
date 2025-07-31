# Contracts for interop demo

This project contains contracts that can be used as a part of interop demo.

Right now, the only contract that is provided is `Counter`: it can be called by anyone
and will record the last caller, so that we can see whether it was called from the
original chain or via interop tx.

The contracts must be compiled with `zksolc`: `forge build --zksync`.

After changing the contracts and rebuilding them, don't forget to copy ABIs in the parent project:

```
cd ..
./copy_abi.sh
```
