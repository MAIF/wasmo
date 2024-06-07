module.exports = class Datastore {

    /**
     * Initialize the datastore
     */
    initialize() { Promise.resolve() }
    /**
     * Check and apply migrations to legacy database
     */
    applyMigrations() { Promise.resolve() }
    /**
     * List of created plugins, whole database
     */
    getPlugins() { Promise.resolve() }
    /**
     * Check if user is in the users or admins list of specific plugin
     * @param {string} email 
     * @param {string} pluginId 
     */
    hasRights(email, pluginId) { Promise.resolve() }
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
     * Add plugin to the list of plugins
     * @param {string} email 
     * @param {any} plugin 
     * @returns 
     */
    addPluginToList = (email, plugin) => Promise.resolve()
    /**
     * Update plugin informations like users, admins list
     * @param {string} pluginId 
     * @param {any} content 
     * @returns 
     */
    updatePluginList = (pluginId, content) => Promise.resolve()
    /**
     * Remove plugin from list of plugins
     * @param {string} pluginId 
     * @returns 
     */
    removePluginFromList = (pluginId) => Promise.resolve()
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
     * @param {string} pluginId
     * @param {string} newHash 
     * @param {string} generateWasmName 
     */
    putWasmFileToS3(email, pluginId, newHash, generateWasmName) { return Promise.resolve() }

    /**
     * Save logs file
     * @param {string} logId 
     * @param {string} logsFolder 
     */
    putBuildLogsToS3(logId, logsFolder) { return Promise.resolve() }

    /**
     * Save plugin information after build process 
     * @param {string} pluginId 
     * @param {string} newHash 
     * @param {string} generateWasmName 
     */
    pushNewPluginVersion(email, pluginId, newHash, generateWasmName) { return Promise.resolve() }

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
    isWasmExists(wasmId, release) { return Promise.resolve() }
    /**
     * Fetch plugin sources
     * @param {string} pluginId 
     * @returns sources as buffer
     */
    getSources = pluginId => { return Promise.resolve() }

    /**
     * Get log files of specific plugin at add them to files
     * @param {string} pluginId 
     * @param {any} files 
     * @returns 
     */
    getConfigurationsFile(pluginId, files) { return Promise.resolve() }

    /**
     * Fetch configuration file
     * @param {string} email 
     * @param {string} pluginId 
     */
    getConfigurations = (email, pluginId) => {
        return Promise.resolve()
    }

    /**
     * Remove all wasm version of specific plugins
     * @param {string[]} versions 
     * @returns 
     */
    removeBinaries = versions => {
        return Promise.resolve()
    }

    /**
     * Remove object from S3
     * @param {string} key 
     * @returns 
     */
    deleteObject = key => { return Promise.resolve() }

    /**
     * Delete specific plugin and all assets
     * @param {string} email 
     * @param {string} pluginId 
     */
    deletePlugin = (email, pluginId) => Promise.resolve()

    /**
     * Update plugin informations
     * @param {string} id 
     * @param {any} body - plugin content
     * @returns 
     */
    updatePluginInformations = (pluginId, body) => Promise.resolve()

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
     * Update plugin field
     * @param {string} email 
     * @param {string} pluginId 
     * @param {string} field 
     * @param {any} value 
     * @returns 
     */
    patchPlugin = (email, pluginId, field, value) => Promise.resolve()

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
     * Get plugin (check if user can access it)
     * @param {string} email 
     * @param {string} pluginId 
     * @returns 
     */
    getPlugin = (email, pluginId) => Promise.resolve()

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
    acceptInvitation = (userId, pluginId) => Promise.resolve()

    /**
     * Get invitation informations
     * @param {string} email 
     * @param {string} pluginId 
     */
    getInvitation = (email, pluginId) => Promise.resolve()

    /**
     * Check if user are allowed to share plugin to other users
     * @param {string} email 
     * @param {string} pluginId 
     */
    canSharePlugin = (email, pluginId) => Promise.resolve()
};