import JSZip from "jszip"
import Pako from "pako"

const f = (url, init = {}) => {
  return fetch(`/api${url}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...init.headers || {},
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
  })
}

const rawFetch = (url, init = {}) => fetch(`/api${url}`, {
  ...init,
  credentials: 'include',
  headers: {
    ...init.headers || {}
  },
});

const jsonFetch = (url, init) => f(url, init).then(r => r.json())

export const createPlugin = (plugin, type, template, productTemplate) => {
  return jsonFetch('/plugins', {
    method: 'POST',
    body: JSON.stringify({
      plugin,
      type,
      template,
      productTemplate
    })
  })
}

export const updatePlugin = (pluginId, newFilename) => {
  return f(`/plugins/${pluginId}/filename`, {
    method: 'PATCH',
    body: JSON.stringify({
      filename: newFilename
    })
  })
}

export const isDevelopmentMode = () => jsonFetch('/development');

export const isWSS = () => jsonFetch('/websocket');

export const getPlugins = () => jsonFetch('/plugins')

export const getPlugin = plugin => rawFetch(`/plugins/${plugin}`)

export const getPluginConfig = plugin => jsonFetch(`/plugins/${plugin}/configurations`)

export const getPluginTemplate = (type, template, productTemplate) => f(`/templates?type=${type}&template=${template}&productTemplate=${productTemplate}`);

export const getPluginProductTemplate = (type, template, productTemplate) => f(`/products_templates?type=${type}&template=${template}&productTemplate=${productTemplate}`);

const buildZip = plugin => {
  const jsZip = new JSZip()

  plugin.files.map(file => {
    jsZip.file(`${file.filename}`, Pako.deflateRaw(file.content, { to: 'string' }));
  })

  return jsZip.generateAsync({ type: "uint8array" });
}

export const savePlugin = async plugin => {
  const bytes = await buildZip(plugin)

  return rawFetch(`/plugins/${plugin.pluginId}`, {
    method: 'PUT',
    body: bytes,
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
}

export const buildPlugin = async (plugin, pluginType, release) => {
  const bytes = await buildZip(plugin)

  return rawFetch(`/plugins/${plugin.pluginId}/build?plugin_type=${pluginType}&release=${release}`, {
    method: 'POST',
    body: bytes,
    headers: {
      'Content-Type': 'application/octet-stream',
      Accept: 'application/json'
    }
  })
    .then(res => res.json())
};

export const removePlugin = plugin => rawFetch(`/plugins/${plugin}`, {
  method: 'DELETE'
});

export const launchPlugin = (pluginId, input, functionName, pluginType) => jsonFetch(`/wasm/${pluginId}`, {
  method: 'POST',
  body: JSON.stringify({
    input, functionName,
    wasi: true
    //wasi: ['ts', 'js', 'go',].includes(pluginType)
  })
});

export const getExports = (pluginId) => jsonFetch(`/wasm/${pluginId}/exports`);

export const createGithubRepo = (owner, repo, ref, isPrivate) => jsonFetch(`/plugins/github/repo`, {
  method: 'POST',
  body: JSON.stringify({
    owner, repo, ref,
    private: isPrivate
  })
})

export const getGithubSources = (repo, owner, ref, isPrivate) => rawFetch('/plugins/github', {
  method: "POST",
  headers: {
    "Content-Type": 'application/json'
  },
  body: JSON.stringify({
    repo, owner, ref, private: isPrivate
  })
})

export const getRuntimeEnvironmentState = () => jsonFetch('/wasm/runtime');

export const canSharePlugin = pluginId => jsonFetch(`/plugins/${pluginId}/rights`)

export const getPluginUsers = pluginId => jsonFetch(`/plugins/${pluginId}/users`)

export const getWasmRelease = wasmId => rawFetch(`/wasm/${wasmId}`);

export const getAppVersion = () => f('/version');

export const getInvitationInformation = invitationId => f(`/invitations/${invitationId}`)

export const acceptInvitation = invitationId => f(`/invitations/${invitationId}`, {
  method: 'POST',
  redirect: 'follow',
  body: JSON.stringify({})
})

export const setAuthorizedPeople = (pluginId, users, admins) => rawFetch(`/plugins/${pluginId}/users`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    users,
    admins
  })
})

export const generateShareLink = pluginId => jsonFetch(`/plugins/${pluginId}/share-links`)