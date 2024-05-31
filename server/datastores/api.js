module.exports = class Datastore {

    /**
     * Initialize the datastore
     */
    async initialize() { Promise.resolve() }
    /**
     * Get current user
     */
    getUser(email) { return Promise.resolve() }
    /**
     * Get plugins of user
     * @returns {Object[]}
     */
    getUserPlugins(email) { return Promise.resolve() }
    /**
     * register a new user if not present
     * @param {string} email 
     */
    createUserIfNotExists(email) { return Promise.resolve() }
    /**
     * Get user list
     */
    getUsers() { return Promise.resolve([]) }
    /**
     * Update a specific user with new content
     * @param {string} email 
     * @param {JSON} content 
     */
    updateUser(email, content) { return Promise.resolve() }

    /**
     * Save wasm file
     * @param {string} wasmFolder 
     */
    putWasmFileToS3(wasmFolder) { return Promise.resolve() }

    /**
     * Save logs file
     * @param {string} logId 
     * @param {string} logsFolder 
     */
    putBuildLogsToS3(logId, logsFolder) { return Promise.resolve() }

    /**
     * Save plugin information after build process 
     * @param {string} email 
     * @param {string} pluginId 
     * @param {string} newHash 
     * @param {string} generateWasmName 
     */
    putWasmInformationsToS3(email, pluginId, newHash, generateWasmName) { return Promise.resolve() }

    /**
     * Fetch wasm from datastore
     * @param {string} wasmId
     */
    getWasm(wasmId) { return Promise.resolve() }

    /**
     * Run and return execution of wasm file
     * @param {string} wasmId 
     * @param {JSON} runOptions 
     */
    runWasm(wasmId, runOptions) { return Promise.resolve() }

    /**
     * Check the presence of a specific wasm in database
     * @param {string} wasmId 
     * @param {boolean} release 
     */
    isWasmExists(wasmId, release) {
        return Promise.resolve()
    }

    /**
     * Fetch plugin sources
     * @param {string} pluginId 
     * @returns sources as buffer
     */
    getSources = pluginId => {
        return Promise.resolve()
    }

    /**
     * Fetch configuration file
     * @param {string} email 
     * @param {string} pluginId 
     */
    getConfigurations = (email, pluginId) => {
        return Promise.resolve()
    }

    /**
     * Delete specific plugin
     * @param {string} email 
     * @param {string} pluginId 
     */
    deletePlugin = (email, pluginId) => Promise.resolve()

    /**
     * Update plugin content
     * @param {string} id 
     * @param {JSON} body 
     */
    updatePlugin = (id, body) => Promise.resolve()

    /**
     * Create plugin with name and version of specific type
     * @param {string} email 
     * @param {JSON} metadata 
     */
    createEmptyPlugin = (email, metadata, isGithub) => Promise.resolve()

    /**
     * Edit the plugin name
     * @param {string} email 
     * @param {string} pluginId 
     * @param {string} newName 
     */
    patchPluginName = (email, pluginId, newName) => Promise.resolve()

    /**
     * Edit the plugin name
     * @param {string} email 
     * @param {string} pluginId 
     * @param {string[]} users 
     * @param {string[]} admins 
     */
    patchPluginUsers = (email, pluginId, users, admins) => Promise.resolve()

    /**
     * Get plugin members
     * @param {string} email 
     * @param {string} pluginId 
     */
    getPluginUsers = (email, pluginId) => Promise.resolve()

    /**
     * Get plugin of user
     * @param {string} owner 
     * @param {string} pluginId 
     * @returns 
     */
    getPlugin = (owner, pluginId) => Promise.resolve()

    /**
     * Check if user can share plugin
     * @param {*} email 
     * @param {*} pluginId 
     * @returns 
     */
    canSharePlugin = (email, pluginId) => Promise.resolve()

    /**
     * Check if a job with this id is running
     * @param {string} pluginId 
     */
    isJobRunning = pluginId => Promise.resolve()

    /**
     * Clean up all legacy tasks on startup
     */
    cleanJobs = () => Promise.resolve()

    /**
     * Remove specific job from datastore
     * @param {string} pluginId 
     */
    removeJob = pluginId => Promise.resolve()

    /**
     * Get the minimum of time to wait before running the plugin
     * @param {string} pluginId
     * @returns {Promise<int>}
     */
    waitingTimeBeforeNextRun = pluginId => Promise.resolve(-1)

    /**
     * Check if received link is valid and add plugin to the current user
     * @param {string} pluginId
     */
    acceptInvitation = (userId, ownerId, pluginId) => Promise.resolve()
};