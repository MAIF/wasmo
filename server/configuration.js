const STORAGE = {
    S3: "S3",
    DOCKER_S3: 'DOCKER_S3',
    S3_POSTGRES: "S3_POSTGRES",
    DOCKER_S3_POSTGRES: "DOCKER_S3_POSTGRES",
};

const AUTHENTICATION = {
    NO_AUTH: 'NO_AUTH',
    BASIC_AUTH: 'BASIC_AUTH',
    OTOROSHI: 'OTOROSHI_AUTH'
};

module.exports = {
    STORAGE,
    AUTHENTICATION,
    ENV: {
        PORT: process.env.MANAGER_PORT || 5001,
        STORAGE: process.env.STORAGE,

        // process.env.AWS_ACCESS_KEY_ID,
        // process.env.AWS_SECRET_ACCESS_KEY,
        // process.env.AWS_DEFAULT_REGION,
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
        S3_BUCKET: process.env.S3_BUCKET,
        AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION || 'us-east-1',

        GITHUB_PERSONAL_TOKEN: process.env.GITHUB_PERSONAL_TOKEN,
        GITHUB_MAX_REPO_SIZE: process.env.GITHUB_MAX_REPO_SIZE,

        MANAGER_TEMPLATES: process.env.MANAGER_TEMPLATES,
        MANAGER_MAX_PARALLEL_JOBS: process.env.MANAGER_MAX_PARALLEL_JOBS || 2,
        MANAGER_ALLOWED_DOMAINS: process.env.MANAGER_ALLOWED_DOMAINS || 'localhost:5001',
        CHECK_DOMAINS: process.env.CHECK_DOMAINS,

        AUTH_MODE: process.env.AUTH_MODE || AUTHENTICATION.NO_AUTH,

        WASMO_CLIENT_ID: process.env.WASMO_CLIENT_ID,
        WASMO_CLIENT_SECRET: process.env.WASMO_CLIENT_SECRET,

        OTOROSHI_TOKEN_SECRET: process.env.OTOROSHI_TOKEN_SECRET || 'veryverysecret',

        EXTISM_RUNTIME_ENVIRONMENT: process.env.EXTISM_RUNTIME_ENVIRONMENT || false,

        LOCAL_WASM_JOB_CLEANING: process.envLOCAL_WASM_JOB_CLEANING || (60 * 60 * 1000), // 1 hour

        PG: {
            HOST: process.env.PG_HOST || 'localhost',
            PORT: process.env.PG_PORT || 5432,
            DATABASE: process.env.PG_DATABASE || 'wasmo',
            USER: process.env.PG_USER || 'postgres',
            PASSWORD: process.env.PG_PASSWORD || 'password',
            POOL_SIZE: process.env.PG_POOL_SIZE || 20,
            PG_IDLE_TIMEOUT_MILLIS: process.env.PG_IDLE_TIMEOUT_MILLIS || 30000,
            CONNECTION_TIMEOUT_MILLIS: process.env.PG_CONNECTION_TIMEOUT_MILLIS || 2000,
        }
    }
}