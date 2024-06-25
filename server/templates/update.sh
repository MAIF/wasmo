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
rm -rf languages
mkdir -p languages/js/otoroshi_wasm_access_control
mkdir -p languages/js/otoroshi_wasm_backend
mkdir -p languages/js/otoroshi_wasm_pre_route 
mkdir -p languages/js/otoroshi_wasm_request_transformer
mkdir -p languages/js/otoroshi_wasm_response_transformer
mkdir -p languages/js/otoroshi_wasm_route_matcher
mkdir -p languages/js/otoroshi_wasm_sink

mkdir -p languages/go/otoroshi_wasm_access_control
mkdir -p languages/go/otoroshi_wasm_backend
mkdir -p languages/go/otoroshi_wasm_pre_route 
mkdir -p languages/go/otoroshi_wasm_request_transformer
mkdir -p languages/go/otoroshi_wasm_response_transformer
mkdir -p languages/go/otoroshi_wasm_route_matcher
mkdir -p languages/go/otoroshi_wasm_sink

mkdir -p languages/ts/otoroshi_wasm_access_control
mkdir -p languages/ts/otoroshi_wasm_backend
mkdir -p languages/ts/otoroshi_wasm_pre_route 
mkdir -p languages/ts/otoroshi_wasm_request_transformer
mkdir -p languages/ts/otoroshi_wasm_response_transformer
mkdir -p languages/ts/otoroshi_wasm_route_matcher
mkdir -p languages/ts/otoroshi_wasm_sink

mkdir -p languages/rust/otoroshi_wasm_access_control
mkdir -p languages/rust/otoroshi_wasm_backend
mkdir -p languages/rust/otoroshi_wasm_pre_route 
mkdir -p languages/rust/otoroshi_wasm_request_transformer
mkdir -p languages/rust/otoroshi_wasm_response_transformer
mkdir -p languages/rust/otoroshi_wasm_route_matcher
mkdir -p languages/rust/otoroshi_wasm_sink

cp otoroshi/js/* languages/js/otoroshi_wasm_access_control
cp otoroshi/js/* languages/js/otoroshi_wasm_backend
cp otoroshi/js/* languages/js/otoroshi_wasm_pre_route 
cp otoroshi/js/* languages/js/otoroshi_wasm_request_transformer
cp otoroshi/js/* languages/js/otoroshi_wasm_response_transformer
cp otoroshi/js/* languages/js/otoroshi_wasm_route_matcher
cp otoroshi/js/* languages/js/otoroshi_wasm_sink

cp otoroshi/go/* languages/go/otoroshi_wasm_access_control
cp otoroshi/go/* languages/go/otoroshi_wasm_backend
cp otoroshi/go/* languages/go/otoroshi_wasm_pre_route 
cp otoroshi/go/* languages/go/otoroshi_wasm_request_transformer
cp otoroshi/go/* languages/go/otoroshi_wasm_response_transformer
cp otoroshi/go/* languages/go/otoroshi_wasm_route_matcher
cp otoroshi/go/* languages/go/otoroshi_wasm_sink

cp otoroshi/ts/* languages/ts/otoroshi_wasm_access_control
cp otoroshi/ts/* languages/ts/otoroshi_wasm_backend
cp otoroshi/ts/* languages/ts/otoroshi_wasm_pre_route 
cp otoroshi/ts/* languages/ts/otoroshi_wasm_request_transformer
cp otoroshi/ts/* languages/ts/otoroshi_wasm_response_transformer
cp otoroshi/ts/* languages/ts/otoroshi_wasm_route_matcher
cp otoroshi/ts/* languages/ts/otoroshi_wasm_sink

cp otoroshi/rust/* languages/rust/otoroshi_wasm_access_control
cp otoroshi/rust/* languages/rust/otoroshi_wasm_backend
cp otoroshi/rust/* languages/rust/otoroshi_wasm_pre_route 
cp otoroshi/rust/* languages/rust/otoroshi_wasm_request_transformer
cp otoroshi/rust/* languages/rust/otoroshi_wasm_response_transformer
cp otoroshi/rust/* languages/rust/otoroshi_wasm_route_matcher
cp otoroshi/rust/* languages/rust/otoroshi_wasm_sink

cp otoroshi/otoroshi_wasm_access_control/index.js languages/js/otoroshi_wasm_access_control
cp otoroshi/otoroshi_wasm_backend/index.js languages/js/otoroshi_wasm_backend
cp otoroshi/otoroshi_wasm_pre_route /index.js languages/js/otoroshi_wasm_pre_route 
cp otoroshi/otoroshi_wasm_request_transformer/index.js languages/js/otoroshi_wasm_request_transformer
cp otoroshi/otoroshi_wasm_response_transformer/index.js languages/js/otoroshi_wasm_response_transformer
cp otoroshi/otoroshi_wasm_route_matcher/index.js languages/js/otoroshi_wasm_route_matcher
cp otoroshi/otoroshi_wasm_sink/index.js languages/js/otoroshi_wasm_sink

cp otoroshi/otoroshi_wasm_access_control/index.ts languages/ts/otoroshi_wasm_access_control
cp otoroshi/otoroshi_wasm_backend/index.ts languages/ts/otoroshi_wasm_backend
cp otoroshi/otoroshi_wasm_pre_route /index.ts languages/ts/otoroshi_wasm_pre_route 
cp otoroshi/otoroshi_wasm_request_transformer/index.ts languages/ts/otoroshi_wasm_request_transformer
cp otoroshi/otoroshi_wasm_response_transformer/index.ts languages/ts/otoroshi_wasm_response_transformer
cp otoroshi/otoroshi_wasm_route_matcher/index.ts languages/ts/otoroshi_wasm_route_matcher
cp otoroshi/otoroshi_wasm_sink/index.ts languages/ts/otoroshi_wasm_sink

cp otoroshi/otoroshi_wasm_access_control/lib.rs languages/rust/otoroshi_wasm_access_control/src
cp otoroshi/otoroshi_wasm_backend/lib.rs languages/rust/otoroshi_wasm_backend/src
cp otoroshi/otoroshi_wasm_pre_route /lib.rs languages/rust/otoroshi_wasm_pre_route /src
cp otoroshi/otoroshi_wasm_request_transformer/lib.rs languages/rust/otoroshi_wasm_request_transformer/src
cp otoroshi/otoroshi_wasm_response_transformer/lib.rs languages/rust/otoroshi_wasm_response_transformer/src
cp otoroshi/otoroshi_wasm_route_matcher/lib.rs languages/rust/otoroshi_wasm_route_matcher/src
cp otoroshi/otoroshi_wasm_sink/lib.rs languages/rust/otoroshi_wasm_sink/src

cp otoroshi/otoroshi_wasm_access_control/main.go languages/go/otoroshi_wasm_access_control
cp otoroshi/otoroshi_wasm_backend/main.go languages/go/otoroshi_wasm_backend
cp otoroshi/otoroshi_wasm_pre_route /main.go languages/go/otoroshi_wasm_pre_route 
cp otoroshi/otoroshi_wasm_request_transformer/main.go languages/go/otoroshi_wasm_request_transformer
cp otoroshi/otoroshi_wasm_response_transformer/main.go languages/go/otoroshi_wasm_response_transformer
cp otoroshi/otoroshi_wasm_route_matcher/main.go languages/go/otoroshi_wasm_route_matcher
cp otoroshi/otoroshi_wasm_sink/main.go languages/go/otoroshi_wasm_sink

# zip -r go.zip go

zip -rj ../../cli/templates/otoroshi/languages/js/otoroshi_wasm_access_control.zip languages/js/otoroshi_wasm_access_control
zip -rj ../../cli/templates/otoroshi/languages/js/otoroshi_wasm_backend.zip languages/js/otoroshi_wasm_backend
zip -rj ../../cli/templates/otoroshi/languages/js/otoroshi_wasm_pre_route .zip languages/js/otoroshi_wasm_pre_route 
zip -rj ../../cli/templates/otoroshi/languages/js/otoroshi_wasm_request_transformer.zip languages/js/otoroshi_wasm_request_transformer
zip -rj ../../cli/templates/otoroshi/languages/js/otoroshi_wasm_response_transformer.zip languages/js/otoroshi_wasm_response_transformer
zip -rj ../../cli/templates/otoroshi/languages/js/otoroshi_wasm_route_matcher.zip languages/js/otoroshi_wasm_route_matcher
zip -rj ../../cli/templates/otoroshi/languages/js/otoroshi_wasm_sink.zip languages/js/otoroshi_wasm_sink

zip -rj ../../cli/templates/otoroshi/languages/ts/otoroshi_wasm_access_control.zip languages/ts/otoroshi_wasm_access_control
zip -rj ../../cli/templates/otoroshi/languages/ts/otoroshi_wasm_backend.zip languages/ts/otoroshi_wasm_backend
zip -rj ../../cli/templates/otoroshi/languages/ts/otoroshi_wasm_pre_route .zip languages/ts/otoroshi_wasm_pre_route 
zip -rj ../../cli/templates/otoroshi/languages/ts/otoroshi_wasm_request_transformer.zip languages/ts/otoroshi_wasm_request_transformer
zip -rj ../../cli/templates/otoroshi/languages/ts/otoroshi_wasm_response_transformer.zip languages/ts/otoroshi_wasm_response_transformer
zip -rj ../../cli/templates/otoroshi/languages/ts/otoroshi_wasm_route_matcher.zip languages/ts/otoroshi_wasm_route_matcher
zip -rj ../../cli/templates/otoroshi/languages/ts/otoroshi_wasm_sink.zip languages/ts/otoroshi_wasm_sink

zip -rj ../../cli/templates/otoroshi/languages/rust/otoroshi_wasm_access_control.zip languages/rust/otoroshi_wasm_access_control/src
zip -rj ../../cli/templates/otoroshi/languages/rust/otoroshi_wasm_backend.zip languages/rust/otoroshi_wasm_backend/src
zip -rj ../../cli/templates/otoroshi/languages/rust/otoroshi_wasm_pre_route .zip languages/rust/otoroshi_wasm_pre_route /src
zip -rj ../../cli/templates/otoroshi/languages/rust/otoroshi_wasm_request_transformer.zip languages/rust/otoroshi_wasm_request_transformer/src
zip -rj ../../cli/templates/otoroshi/languages/rust/otoroshi_wasm_response_transformer.zip languages/rust/otoroshi_wasm_response_transformer/src
zip -rj ../../cli/templates/otoroshi/languages/rust/otoroshi_wasm_route_matcher.zip languages/rust/otoroshi_wasm_route_matcher/src
zip -rj ../../cli/templates/otoroshi/languages/rust/otoroshi_wasm_sink.zip languages/rust/otoroshi_wasm_sink/src

zip -r ../../cli/templates/otoroshi/languages/go/otoroshi_wasm_access_control.zip languages/go/otoroshi_wasm_access_control
zip -r ../../cli/templates/otoroshi/languages/go/otoroshi_wasm_backend.zip languages/go/otoroshi_wasm_backend
zip -r ../../cli/templates/otoroshi/languages/go/otoroshi_wasm_pre_route .zip languages/go/otoroshi_wasm_pre_route 
zip -r ../../cli/templates/otoroshi/languages/go/otoroshi_wasm_request_transformer.zip languages/go/otoroshi_wasm_request_transformer
zip -r ../../cli/templates/otoroshi/languages/go/otoroshi_wasm_response_transformer.zip languages/go/otoroshi_wasm_response_transformer
zip -r ../../cli/templates/otoroshi/languages/go/otoroshi_wasm_route_matcher.zip languages/go/otoroshi_wasm_route_matcher
zip -r ../../cli/templates/otoroshi/languages/go/otoroshi_wasm_sink.zip languages/go/otoroshi_wasm_sink