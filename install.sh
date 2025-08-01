set -e

OS=''
case `uname` in
  Darwin*)  OS="macos" ;;
  Linux*)   OS="linux" ;;
  *)        echo "unknown os: $OSTYPE" && exit 1 ;;
esac

ARCH=`uname -m`
case "$ARCH" in
  ix86*|x86_64*)    ARCH="x86_64" ;;
  arm64*|aarch64*)  ARCH="aarch64" ;;
  *)                echo "unknown arch: $ARCH" && exit 1 ;;
esac

export TAG="v1.5.1"
export BINARYEN_TAG="version_123"

curl -L -O "https://github.com/extism/js-pdk/releases/download/$TAG/extism-js-$ARCH-$OS-$TAG.gz"

gunzip extism-js*.gz
mv extism-js-* /usr/local/bin/extism-js
chmod +x /usr/local/bin/extism-js

if ! which "wasm-merge" > /dev/null; then
  echo "Installing wasm-merge..."

  # binaryen use arm64 instead where as extism-js uses aarch64 for release file naming
  case "$ARCH" in
    aarch64*)  ARCH="arm64" ;;
  esac

  # matches the case where the user installs extism-pdk in a Linux-based Docker image running on mac m1
  # binaryen didn't have arm64 release file for linux 
  if [ $ARCH = "arm64" ] && [ $OS = "linux" ]; then
    ARCH="x86_64"
  fi

  echo "https://github.com/WebAssembly/binaryen/releases/download/$BINARYEN_TAG/binaryen-$BINARYEN_TAG-$ARCH-$OS.tar.gz"

  curl -L -O "https://github.com/WebAssembly/binaryen/releases/download/$BINARYEN_TAG/binaryen-$BINARYEN_TAG-$ARCH-$OS.tar.gz"
  tar xf "binaryen-$BINARYEN_TAG-$ARCH-$OS.tar.gz"
  mv "binaryen-$BINARYEN_TAG"/ binaryen/
  mkdir /usr/local/binaryen
  mv binaryen/bin/wasm-merge /usr/local/binaryen/wasm-merge
  ln -s /usr/local/binaryen/wasm-merge /usr/local/bin/wasm-merge

  mv binaryen/bin/wasm-opt /usr/local/binaryen/wasm-opt
  ln -s /usr/local/binaryen/wasm-opt /usr/local/bin/wasm-opt

  if [ $OS = "linux" ]; then
    mv binaryen/lib/libbinaryen.a /usr/local/binaryen/libbinaryen.a
    ln -s /usr/local/binaryen/libbinaryen.a /usr/local/lib/libbinaryen.a
  fi

  if [ $OS = "macos" ]; then
    mv binaryen/lib/libbinaryen.dylib /usr/local/binaryen/libbinaryen.dylib
    ln -s /usr/local/binaryen/libbinaryen.dylib /usr/local/lib/libbinaryen.dylib
  fi
  
else
  echo "wasm-merge already installed"
fi
