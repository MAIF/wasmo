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