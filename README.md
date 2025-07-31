# ZKsync Interop Demo/Visualizer

This project contains a demo for ZKsync Interop tailored for understanding
how interop works under the hood.

This project targets v31 protocol version.
Right now this project uses proof-based interop, which is the slowest form. You can read about it
[here](https://matter-labs.github.io/zksync-era/core/latest/specs/contracts/interop/forms_of_finality.html).

⚠️ I'm not a front-end dev and I don't know what I'm doing. Forgive me, front-end gods.
⚠️ The project is quickly hacked around and has bugs, see "Known problems" section below.

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

## Working with the project

The project has two main goals:

1. Provide a visual representation of the interop message lifecycle.
2. Provide a learning environment to see how interop can be integrated in a (somewhat) real dApp.

Structurally, you will have two chains (Era/Validium) with a single wallet on each chain that can initiate
interop transactions between each other, and see the flow of these 

### SDK

For learning purposes, the most interesting part is the [sdk](./src/sdk/).
The structure there is as follows:
- [interop](./src/sdk/interop) represents the "user-facing" part of the interop: how do I initiate the request?
- [finalizer](./src/sdk/finalizer/) represents the "backend" part: how requests are finalized?

[token](./src/sdk/token) exists for convenience only: it's a wrapper over mintable ERC20 token with ZKsync-specific
functionality added (e.g. registering on NTV and converting token into its "interop" counterpart on another chain).

### Front-end

Main components are:
- [Chain](./src/components/chain/Chain.vue) -- renders a single L2 chain.
- [Registry](./src/components/chain/Registry.vue) -- page with all the chains that also initializes the chains when mounted.
- [RequestList](./src/components/RequestList.vue) -- renders all the interop requests and their status.

Chain initialization (init function in [useChain](./src/composables/useChain.ts)) consists of:

- Making sure that account on L2 has enough funds
- Deploying a native token on the chain
- Starting interop finalizer for this chain

### Interop finalizer

Interop finalizer is a component that would normally run on the backend, but implemented as part of the front-end
in this demo for simplicity. Interop finalizer is a task that runs for a certain chain A, and processes
all the requests that should be _finalized_ on chain A (no matter which chain they originate from).

[useInteropFinalizer](./src/composables/useInteropFinalizer.ts) implements the finalizer running logic on top
of the [corresponding SDK part](./src/sdk/finalizer/finalizer.ts), while [useInteropState](./src/composables/useInteropState.ts)
is used to communicate the state of processing to front-end.

## Known problems

This demo is hacked around in a few days so it's far from being perfect.
It kinda works when everything works, but can break easily.
Making it robust was not a goal.

### Interop finalizer glitches on hot reload

Interop finalizer is a detached task that runs in background, so on each hot reload
a new task is started. Since it should be a part of backend, I didn't feel like spending time
on making it a proper multitone and adding state there. The finalization will work, but rendering can
break, because multiple instances can overwrite the status of the request they're working on.

In order to make sure that finalizer works correctly, do not rely on hot reload. Stop and restart the
application instead.

### Finalizing can stop working after a while

Several times I've encountered situation where requests suddenly stop finalizing, usually if I dropped
a few requests while they weren't finalized. Not sure why it happens, but in such case the solution
is to re-initialize the chains and start from fresh state.

### No fee estimation

Right now, gas limits and fees for interop transactions are hardcoded. Making it work "properly" is left
as an exercise for the reader.

## License

This project is licensed under MIT license. See [LICENSE](LICENSE).

