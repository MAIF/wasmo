FROM ubuntu:24.04

WORKDIR /code

ENV DEBIAN_FRONTEND=noninteractive 

RUN apt-get update --fix-missing -y
RUN apt-get install -y build-essential git curl software-properties-common ca-certificates gnupg wget

ARG TARGETPLATFORM

# install go 1.21
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        wget https://go.dev/dl/go1.24.5.linux-arm64.tar.gz; \
        tar -xvf go1.24.5.linux-arm64.tar.gz -C /usr/local; \
    else \
        wget https://go.dev/dl/go1.24.5.linux-amd64.tar.gz; \
        tar -xvf go1.24.5.linux-amd64.tar.gz -C /usr/local; \
    fi

ENV PATH="/usr/local/go/bin:${PATH}"

RUN go install github.com/extism/cli/extism@latest

# install node
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt-get update -y 
RUN apt-get install -y nodejs 

# RUN python3.9 -m pip install --upgrade pip
# RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python3 get-pip.py
RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python3 get-pip.py --break-system-packages && \
    rm get-pip.py
RUN echo 'export PATH=~/.local/bin/:$PATH' >> ~/.bashrc

# Get rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --profile=minimal -y

ENV PATH="/root/.cargo/bin:${PATH}"
# Add wasm-unknown-unknown target
RUN rustup target add wasm32-unknown-unknown

# RUN apt-get install binaryen
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
        wget https://github.com/tinygo-org/tinygo/releases/download/v0.38.0/tinygo_0.38.0_arm64.deb; \
        dpkg -i tinygo_0.38.0_arm64.deb; \
        # curl -L -O "https://github.com/extism/js-pdk/releases/download/v1.0.0-rc6/extism-js-aarch64-linux-v1.0.0-rc6.gz"; \
    else \
        wget https://github.com/tinygo-org/tinygo/releases/download/v0.38.0/tinygo_0.38.0_amd64.deb; \
        dpkg -i tinygo_0.38.0_amd64.deb; \
        # curl -L -O "https://github.com/extism/js-pdk/releases/download/v1.0.0-rc6/extism-js-x86_64-linux-v1.0.0-rc6.gz"; \
    fi

# RUN gunzip extism-js*.gz
# RUN mv extism-js-* /usr/local/bin/extism-js
# RUN chmod +x /usr/local/bin/extism-js

COPY install.sh install.sh
RUN sh install.sh

RUN curl https://get.wasmer.io -sSfL | sh

RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
curl -L -o opa https://github.com/open-policy-agent/opa/releases/download/v1.6.0/opa_linux_arm64_static; \
else \
curl -L -o opa https://github.com/open-policy-agent/opa/releases/download/v1.6.0/opa_linux_amd64_static; \
fi
RUN chmod 755 ./opa
RUN mv opa /usr/local/bin

ADD ui $HOME/ui
ADD server $HOME/server

# install ui
WORKDIR $HOME/ui
RUN npm install
RUN npm run build
RUN rm -rf node_modules
RUN chmod -R 777 .

WORKDIR $HOME/server
RUN npm install pm2@latest -g
RUN npm install
RUN chmod -R 777 .

RUN mkdir /.pm2
RUN chmod 777 /.pm2

RUN chmod -R a+rwX .

EXPOSE 5001
CMD ["pm2-runtime", "index.js"]