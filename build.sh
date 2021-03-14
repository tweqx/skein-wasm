#!/bin/bash

# emscripten binaries need to be in your $PATH, run "source ./emsdk_env.sh" in the emscripten installation directory to do that

emcc skein-wasm.c skein.c skein_block.c SHA3api_ref.c -O3 -o dist/skein.js -s MODULARIZE=1 -s 'EXPORT_NAME="createSkeinModule"' -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' -s EXPORTED_FUNCTIONS="['_malloc', '_free']" -s WASM=1

if [ $? == 0 ]; then
  cat dist/skein.js wrapper/wrapper.js > dist/skein-wasm.js ;
  rm dist/skein.js
fi

