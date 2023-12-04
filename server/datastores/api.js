module.exports = class Datastore {

    /**
     * Initialize the datastore
     */
    async initialize() { console.log('initialize') }
    /**
     * Get current user
     */
    getUser(email) { console.log('getUser') }
    /**
     * Get plugins of user
     * @returns {Object[]}
     */
    getUserPlugins(email) { console.log('getUserPlugins') }
    /**
     * register a new user if not present
     * @param {string} email 
     */
    createUserIfNotExists(email) { console.log('createUserIfNotExists') }
    /**
     * Get user list
     */
    getUsers() { console.log('getUsers') }
    /**
     * Update a specific user with new content
     * @param {string} email 
     * @param {JSON} content 
     */
    updateUser(email, content) { console.log('updateUser') }

    /**
     * Save wasm file
     * @param {string} wasmFolder 
     */
    putWasmFileToS3(wasmFolder) { console.log('putWasmFileToS3') }

    /**
     * Save logs file
     * @param {string} logId 
     * @param {string} logsFolder 
     */
    putBuildLogsToS3(logId, logsFolder) { }

    /**
     * Save plugin information after build process 
     * @param {string} email 
     * @param {string} pluginId 
     * @param {string} newHash 
     * @param {string} generateWasmName 
     */
    putWasmInformationsToS3(email, pluginId, newHash, generateWasmName) { }

    /**
     * Fetch wasm from datastore
     * @param {string} wasmId
     */
    getWasm(wasmId) { console.log('getWasm') }

    /**
     * Run and return execution of wasm file
     * @param {string} wasmId 
     * @param {JSON} runOptions 
     */
    runWasm(wasmId, runOptions) { console.log('runWasm') }

    /**
     * Check the presence of a specific wasm in database
     * @param {string} wasmId 
     * @param {boolean} release 
     */
    isWasmExists(wasmId, release) { console.log('isWasmExists') }

    /**
     * Fetch plugin sources
     * @param {string} pluginId 
     * @returns sources as buffer
     */
    getSources = pluginId => console.log('getSources')

    /**
     * Fetch configuration file
     * @param {string} email 
     * @param {string} pluginId 
     */
    getConfigurations = (email, pluginId) => console.log('getConfigurations')

    /**
     * Delete specific plugin
     * @param {string} email 
     * @param {string} pluginId 
     */
    deletePlugin = (email, pluginId) => console.log('deletePlugin');

    /**
     * Update plugin content
     * @param {string} id 
     * @param {JSON} body 
     */
    updatePlugin = (id, body) => console.log('updatePlugin');

    /**
     * Create plugin with name and version of specific type
     * @param {string} email 
     * @param {JSON} metadata 
     */
    createEmptyPlugin = (email, metadata, isGithub) => console.log('createEmptyPlugin')

    /**
     * Edit the plugin name
     * @param {string} email 
     * @param {string} pluginId 
     * @param {string} newName 
     */
    patchPluginName = (email, pluginId, newName) => console.log('patchPluginName')
};