rm -v **/.DS_Store
rm -rf *.zip
rm -rf izanami/*.zip
rm -rf otoroshi/*.zip

zip -r go.zip go && \
zip -r ts.zip ts && \
zip -r js.zip js && \
zip -r rust.zip rust && \
zip -r opa.zip opa

cd izanami/
zip -r go.zip go && \
zip -r ts.zip ts && \
zip -r js.zip js && \
zip -r rust.zip rust && \
zip -r opa.zip opa

cd ../otoroshi
zip -r go.zip go && \
zip -r ts.zip ts && \
zip -r js.zip js && \
zip -r rust.zip rust && \
zip -r opa.zip opa

cd ..
mkdir -p languages/JS/OTOROSHI_WASM_ACCESS_CONTROL
mkdir -p languages/JS/OTOROSHI_WASM_BACKEND
mkdir -p languages/JS/OTOROSHI_WASM_PRE_ROUTE
mkdir -p languages/JS/OTOROSHI_WASM_REQUEST_TRANSFORMER
mkdir -p languages/JS/OTOROSHI_WASM_RESPONSE_TRANSFORMER
mkdir -p languages/JS/OTOROSHI_WASM_ROUTE_MATCHER
mkdir -p languages/JS/OTOROSHI_WASM_SINK

mkdir -p languages/GO/OTOROSHI_WASM_ACCESS_CONTROL
mkdir -p languages/GO/OTOROSHI_WASM_BACKEND
mkdir -p languages/GO/OTOROSHI_WASM_PRE_ROUTE
mkdir -p languages/GO/OTOROSHI_WASM_REQUEST_TRANSFORMER
mkdir -p languages/GO/OTOROSHI_WASM_RESPONSE_TRANSFORMER
mkdir -p languages/GO/OTOROSHI_WASM_ROUTE_MATCHER
mkdir -p languages/GO/OTOROSHI_WASM_SINK

mkdir -p languages/TS/OTOROSHI_WASM_ACCESS_CONTROL
mkdir -p languages/TS/OTOROSHI_WASM_BACKEND
mkdir -p languages/TS/OTOROSHI_WASM_PRE_ROUTE
mkdir -p languages/TS/OTOROSHI_WASM_REQUEST_TRANSFORMER
mkdir -p languages/TS/OTOROSHI_WASM_RESPONSE_TRANSFORMER
mkdir -p languages/TS/OTOROSHI_WASM_ROUTE_MATCHER
mkdir -p languages/TS/OTOROSHI_WASM_SINK

mkdir -p languages/RUST/OTOROSHI_WASM_ACCESS_CONTROL
mkdir -p languages/RUST/OTOROSHI_WASM_BACKEND
mkdir -p languages/RUST/OTOROSHI_WASM_PRE_ROUTE
mkdir -p languages/RUST/OTOROSHI_WASM_REQUEST_TRANSFORMER
mkdir -p languages/RUST/OTOROSHI_WASM_RESPONSE_TRANSFORMER
mkdir -p languages/RUST/OTOROSHI_WASM_ROUTE_MATCHER
mkdir -p languages/RUST/OTOROSHI_WASM_SINK

cp otoroshi/js/* languages/JS/OTOROSHI_WASM_ACCESS_CONTROL
cp otoroshi/js/* languages/JS/OTOROSHI_WASM_BACKEND
cp otoroshi/js/* languages/JS/OTOROSHI_WASM_PRE_ROUTE
cp otoroshi/js/* languages/JS/OTOROSHI_WASM_REQUEST_TRANSFORMER
cp otoroshi/js/* languages/JS/OTOROSHI_WASM_RESPONSE_TRANSFORMER
cp otoroshi/js/* languages/JS/OTOROSHI_WASM_ROUTE_MATCHER
cp otoroshi/js/* languages/JS/OTOROSHI_WASM_SINK

cp otoroshi/go/* languages/GO/OTOROSHI_WASM_ACCESS_CONTROL
cp otoroshi/go/* languages/GO/OTOROSHI_WASM_BACKEND
cp otoroshi/go/* languages/GO/OTOROSHI_WASM_PRE_ROUTE
cp otoroshi/go/* languages/GO/OTOROSHI_WASM_REQUEST_TRANSFORMER
cp otoroshi/go/* languages/GO/OTOROSHI_WASM_RESPONSE_TRANSFORMER
cp otoroshi/go/* languages/GO/OTOROSHI_WASM_ROUTE_MATCHER
cp otoroshi/go/* languages/GO/OTOROSHI_WASM_SINK

cp otoroshi/ts/* languages/TS/OTOROSHI_WASM_ACCESS_CONTROL
cp otoroshi/ts/* languages/TS/OTOROSHI_WASM_BACKEND
cp otoroshi/ts/* languages/TS/OTOROSHI_WASM_PRE_ROUTE
cp otoroshi/ts/* languages/TS/OTOROSHI_WASM_REQUEST_TRANSFORMER
cp otoroshi/ts/* languages/TS/OTOROSHI_WASM_RESPONSE_TRANSFORMER
cp otoroshi/ts/* languages/TS/OTOROSHI_WASM_ROUTE_MATCHER
cp otoroshi/ts/* languages/TS/OTOROSHI_WASM_SINK

cp otoroshi/rust/* languages/RUST/OTOROSHI_WASM_ACCESS_CONTROL
cp otoroshi/rust/* languages/RUST/OTOROSHI_WASM_BACKEND
cp otoroshi/rust/* languages/RUST/OTOROSHI_WASM_PRE_ROUTE
cp otoroshi/rust/* languages/RUST/OTOROSHI_WASM_REQUEST_TRANSFORMER
cp otoroshi/rust/* languages/RUST/OTOROSHI_WASM_RESPONSE_TRANSFORMER
cp otoroshi/rust/* languages/RUST/OTOROSHI_WASM_ROUTE_MATCHER
cp otoroshi/rust/* languages/RUST/OTOROSHI_WASM_SINK