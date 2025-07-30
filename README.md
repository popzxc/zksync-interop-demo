# ZKsync Interop Demo/Visualizer

This project contains a demo for ZKsync Interop tailored for understanding
how interop works under the hood.

This project targets v31 protocol version.

## Prerequisites

You need to have interop test environment running:
- L1 on port 8545
- Gateway on port 3150
- Era on port 3050
- Validium on port 3250

Ports can be changed by modifying [`config.ts`](./src/config.ts).

This setup can be prepared using [Interop Test Environment Setup](https://github.com/dutterbutter/wip-interop/) locally,
or you can take [bootstrap_interop.sh](https://github.com/dutterbutter/wip-interop/blob/main/scripts/bootstrap_interop.sh)
as reference and prepare the setup yourself with just `zkstack` tool.

IMPORTANT! Make sure that you use v31 protocol version when you prepare the setup (at the time of writing, it corresponds
to `kl/interop-support` branch in `zksync-era` repository).

## Running

node v22 is recommended

```
npm install
npm run dev
```

## 
