## Logdy UI repository

This repository contains code of a Vue.js application that is a Web UI of [logdy.dev](https://logdy.dev).

**Navigate to [logdy-core](https://github.com/logdyhq/logdy-core) repository for the Logdy source-code, full documentation and use cases.**

## Demo
Visit [demo.logdy.dev](https://demo.logdy.dev)

## Development
```bash
npm install
npm run dev
```

By default the UI will be served under `http://localhost:5173`. There are two ways to develop going further.

#### Use logdy-core
You need to run [logdy-core](https://github.com/logdyhq/logdy-core) separately. Choose either `demo` (`$ go run . demo 1` or `$ logdy demo 1`) mode or any other mode. Read more about [`demo` mode](https://logdy.dev/docs/explanation/command-modes#demo).

#### Use UI demo mode
Just append `?demo` to the address, like `http://localhost:5173?demo`, the UI will enter demo mode (which you can preview at [demo.logdy.dev](https://demo.logdy.dev))


## Building
```bash
npm install
npm run build
```

The source files will be compiled into `dist` folder. After building is complete, you need to manually move the contents of `dist` directory to `assets` directory in logdy-core source in order for the UI to be embedded into the binary.