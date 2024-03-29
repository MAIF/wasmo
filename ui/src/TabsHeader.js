import { useEffect, useState } from "react"
import { SidebarContext } from "./Sidebar"
import * as Service from './services'

export function TabsHeader({
  selectedPlugin, onSave, onBuild, onDownload,
  showPlaySettings, children }) {

  return <Header
    selectedPluginType={selectedPlugin?.type}
    onSave={onSave}
    onBuild={onBuild}
    onDownload={onDownload}
    showActions={!!selectedPlugin}
    showPlaySettings={showPlaySettings}>
    {children}
  </Header>
}

function Header({
  children, onSave, onBuild, showActions, onDownload,
  showPlaySettings, selectedPluginType }) {

  const [runtimeState, setRuntimeEnvironment] = useState(false);

  useEffect(() => {
    Service.getRuntimeEnvironmentState()
      .then(setRuntimeEnvironment)
  }, [])

  return <SidebarContext.Consumer>
    {({ open, sidebarSize }) => (
      <div className='d-flex align-items-center justify-content-between bg-light'
        style={{ position: 'fixed', height: 42, zIndex: 10, width: `calc(100vw - ${open ? `${sidebarSize}px` : '52px'})` }}>
        {children}

        <div className='d-flex align-items-center'>
          {showActions && <>
            <Save onSave={onSave} />
            <Build onBuild={onBuild} />
            <Release onBuild={onBuild} />
            <Download onDownload={onDownload} />
          </>}
          {runtimeState && <Play showPlaySettings={showPlaySettings} />}
        </div>
      </div>
    )}
  </SidebarContext.Consumer>
}

function Save({ onSave }) {
  return <button
    type="button"
    tooltip="Save plugin"
    style={{ border: 'none', background: 'none' }}
    className="pe-2"
    onClick={onSave}>
    <i className='fa-solid fa-save' />
  </button>
}

function Build({ onBuild }) {
  return <button
    type="button"
    tooltip="Build"
    style={{ border: 'none', background: 'none' }}
    className="pe-2"
    onClick={() => onBuild(false)}>
    <i className='fa-solid fa-hammer' />
  </button>
}

function Release({ onBuild }) {
  return <button
    type="button"
    tooltip="Release"
    style={{ border: 'none', background: 'none' }}
    className="pe-2"
    onClick={() => onBuild(true)}>
    <i className='fa-solid fa-rocket' />
  </button>
}

function Download({ onDownload }) {
  return <button type="button"
    tooltip="Download plugin as zip"
    style={{ border: 'none', background: 'none' }}
    className="pe-2"
    onClick={onDownload}>
    <i className='fa-solid fa-download' />
  </button>
}

function Play({ showPlaySettings }) {
  return <button type="button"
    tooltip="Run"
    style={{ border: 'none', background: 'none' }}
    className="pe-2"
    onClick={showPlaySettings}
  >
    <i className='fa-solid fa-play' />
  </button>
}