import { useEffect, useState } from "react"
import { SidebarContext } from "./Sidebar"
import * as Service from './services'
import { toast } from 'react-toastify'

import Select from 'react-select/creatable';

export function TabsHeader({
  selectedPlugin, onSave, onBuild,
  showPlaySettings, children }) {

  if (!selectedPlugin?.pluginId)
    return null

  return <Header
    selectedPluginType={selectedPlugin?.type}
    onSave={onSave}
    onBuild={onBuild}
    showActions={!!selectedPlugin}
    showPlaySettings={showPlaySettings}
    pluginId={selectedPlugin?.pluginId}
  >
    {children}
  </Header>
}

function Header({ children, onSave, onBuild, showActions, showPlaySettings, pluginId }) {

  const [runtimeState, setRuntimeEnvironment] = useState(false);
  const [canShare, setCanSharePlugin] = useState(false);

  const [members, setMembers] = useState({
    users: [],
    admins: []
  })

  useEffect(() => {
    Promise.all([
      Service.getRuntimeEnvironmentState(),
      Service.canSharePlugin(pluginId),
      Service.getPluginUsers(pluginId)
    ])
      .then(([runtimeState, canShare, members]) => {
        setRuntimeEnvironment(runtimeState)
        setCanSharePlugin(canShare)
        setMembers(members)
      })
  }, [])

  const initializeAdmins = () => {
    const { admins } = members;

    if (!admins || admins.length === 0)
      return []

    return admins
  }

  return <SidebarContext.Consumer>
    {({ open, sidebarSize }) => (
      <div className='d-flex align-items-center justify-content-between bg-light'
        style={{ position: 'fixed', height: 42, zIndex: 10, width: `calc(100vw - ${open ? `${sidebarSize}px` : '52px'})` }}>
        {children}

        <div className='d-flex align-items-center me-2'>
          {showActions && <>
            {canShare && <ShareButton pluginId={pluginId} users={members.users} admins={initializeAdmins()} />}
            <Save onSave={onSave} />
            <Build onBuild={onBuild} />
            <Release onBuild={onBuild} />
            {runtimeState && <Play showPlaySettings={showPlaySettings} />}
          </>}
        </div>
      </div>
    )}
  </SidebarContext.Consumer>
}

function unsecuredCopyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Unable to copy to clipboard', err);
  }
  document.body.removeChild(textArea);
}

function PeopleSelector({ name, value, onChange }) {
  return <Select
    isMulti
    name={name}
    value={value}
    onChange={onChange}
    className="basic-multi-select mb-3"
    classNamePrefix="select"
    styles={{
      container: (baseStyles, state) => ({
        ...baseStyles,
        flex: 1,
        width: "100%"
      }),
      placeholder: (baseStyles) => ({
        ...baseStyles,
        textAlign: 'left'
      })
    }}
    noOptionsMessage={() => " "}
    placeholder="Add an email address and press enter"
  />
}

function SharePluginModal(props) {

  const [initialUserList, setInitialUserList] = useState((props.users || []).map(email => ({
    value: email,
    label: email
  })))

  const [initialAdminsList, setInitialAdminsList] = useState((props.admins || []).map(email => ({
    value: email,
    label: email
  })))

  const [users, setUsers] = useState(initialUserList)
  const [admins, setAdmins] = useState(initialAdminsList)

  const [updating, setUpdating] = useState(false)

  return <div id="shareplugin" className="share-plugin-modal">
    <div className="d-flex flex-column align-items-start p-3 rounded">
      <div className="d-flex justify-content-between w-100">
        <h2>Share this plugin</h2>

        <a href="#ok" title="Ok"
          className="btn btn-outline-dark d-flex align-items-center justify-content-center p-2"
          style={{
            maxHeight: 32
          }}>
          <i className="fa-solid fa-times" />
        </a>
      </div>
      <p className="text-start mb-1 mt-2">People will be authorized to <b>view</b>, <b>edit</b> and <b>share</b> plugin.</p>

      <PeopleSelector
        name="admins"
        value={admins}
        onChange={setAdmins}
      />

      <p className="text-start my-1">People will be authorized to <b>view</b> and <b>edit</b> plugin.</p>

      <PeopleSelector
        name="users"
        value={users}
        onChange={setUsers}
      />

      <div className="w-100 d-flex justify-content-between align-items-center mt-3">
        <a href="#"
          style={{ textDecoration: 'none' }}
          onClick={e => {
            e.preventDefault();

            Service.generateShareLink(props.pluginId)
              .then(link => {
                toast.info(`Link paste. ${link}`)
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(link);
                } else {
                  unsecuredCopyToClipboard(link)
                }
              })
          }}>
          <i className='fa-solid fa-link me-1' />
          Copy link
        </a>
        <button
          type="button"
          className="btn btn-dark"
          disabled={updating ||
            (users.map(r => r.value).sort().join() === initialUserList.map(r => r.value).sort().join() &&
              admins.map(r => r.value).sort().join() === initialAdminsList.map(r => r.value).sort().join())}
          onClick={() => {
            setUpdating(true)
            Service.setAuthorizedPeople(props.pluginId, users.map(r => r.value), admins.map(admin => admin.value))
              .then(() => {
                setInitialUserList([...users])
                setInitialAdminsList([...admins])

                setTimeout(() => setUpdating(false), 1000)
              })
          }}>
          Update authorized people
        </button>
      </div>
    </div>
  </div>
}

function ShareButton(props) {
  return <>
    <a href="#shareplugin" style={{ textDecoration: 'none' }}>
      <button
        type="button"
        tooltip="Share plugin"
        className="navbar-item">
        <i className='fa-solid fa-link me-1' />
      </button>
    </a>
    <SharePluginModal {...props} />
  </>
}

function Save({ onSave }) {
  return <button
    type="button"
    tooltip="Save plugin"
    className="navbar-item"
    onClick={onSave}>
    <i className='fa-solid fa-save' />
  </button>
}

function Build({ onBuild }) {
  return <button
    type="button"
    tooltip="Build"
    className="navbar-item"
    onClick={() => onBuild(false)}>
    <i className='fa-solid fa-hammer' />
  </button>
}

function Release({ onBuild }) {
  return <button
    type="button"
    tooltip="Release"
    className="navbar-item"
    onClick={() => onBuild(true)}>
    <i className='fa-solid fa-truck-fast' />
  </button>
}

function Play({ showPlaySettings }) {
  return <button type="button"
    tooltip="Run"
    className="navbar-item"
    onClick={showPlaySettings}
  >
    <i className='fa-solid fa-play' />
  </button>
}