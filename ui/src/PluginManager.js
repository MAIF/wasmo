import React, { useState } from 'react';
import { ReactComponent as Rust } from './assets/rust.svg';
import { ReactComponent as Js } from './assets/js.svg';
import { ReactComponent as Ts } from './assets/ts.svg';
import { ReactComponent as Go } from './assets/go.svg';
import { ReactComponent as Github } from './assets/github.svg';
import { ReactComponent as OPA } from './assets/opa.svg';
import Otoroshi from './assets/otoroshi.png';
import Izanami from './assets/izanami.png';
import { createGithubRepo } from './services';
import { LOGOS } from './FilesLogo';
import { OTOROSHI_TEMPLATES } from './templates/otoroshi';

class PluginManager extends React.Component {
  render() {
    const { plugins, onNewPlugin, selectedPlugin, ...props } = this.props;

    return (
      <div className='d-flex flex-column' style={{ minWidth: 250, flex: selectedPlugin ? 0 : 1 }}>
        {!selectedPlugin && <Header onNewPlugin={onNewPlugin} reloadPlugins={props.reloadPlugins} />}
        {selectedPlugin && <div className='d-flex justify-content-between align-items-center sidebar-header'
          style={{
            cursor: 'pointer'
          }} onClick={() => props.backToHome(undefined)}>
          <div className='d-flex align-items-center'>
            <i className='fa-solid fa-chevron-left me-1' />
            <span className='fw-bold'>Change current plugin</span>
          </div>
        </div>}
        <div className='d-flex flex-column scroll-container'>
          {!selectedPlugin &&
            [...plugins]
              .sort((a, b) => a.type?.localeCompare(b.type))
              .map(plugin => {
                return <Plugin
                  key={plugin.pluginId || 'new'}
                  {...plugin}
                  {...props}
                />
              })}
        </div>
      </div>
    );
  }
}

function NewPluginModal({ onNewPlugin, setProjectSelector, reloadPlugins, active }) {

  const [showGithubModal, setGithubModal] = useState(false);
  const [language, setLanguage] = useState(false);
  const [product, setProduct] = useState();
  const [otoroshiTemplates, setOtoroshiTemplates] = useState(false);

  const [repo, setRepo] = useState("");
  const [owner, setOwner] = useState("");
  const [branch, setBranch] = useState("main");
  const [error, setError] = useState();
  const [isPrivate, setStatus] = useState(false);

  if (showGithubModal) {
    return <div style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 250,
      zIndex: 100,
      width: true ? 325 : 0, // active 
      background: '#eee',
      gap: '.5rem',
      transition: 'width .25s'
    }}
      onClick={e => e.stopPropagation()}>
      {active && <div className='d-flex flex-column h-100'>
        <h3 style={{ fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', height: 42, margin: 0 }}
          className='d-flex align-items-center justify-content-center'>Github repository</h3>

        <div className='d-flex flex-column' style={{ flex: 1, padding: '.5rem 1rem' }}>
          {error && <pre className="alert alert-warning" role="alert">
            {JSON.stringify(error, null, 4)}
          </pre>}
          <div className='mt-2'>
            <label htmlFor="owner" className='form-label' style={{ fontWeight: 'bold' }}>Owner</label>
            <input type="text" className="form-control form-control-md" placeholder='octocat' value={owner} id="owner" onChange={e => {
              setError(undefined);
              setOwner(e.target.value)
            }} />
          </div>

          <div className='mt-2'>
            <label htmlFor="repository" className='form-label' style={{ fontWeight: 'bold' }}>Repository</label>
            <input type="text" value={repo} className="form-control form-control-md" placeholder='my-wasm-epo' id="repository" onChange={e => {
              setError(undefined);
              setRepo(e.target.value)
            }} />
          </div>

          <div className='mt-2'>
            <label htmlFor="branch" className='form-label' style={{ fontWeight: 'bold' }}>Branch</label>
            <input type="text" value={branch} className="form-control form-control-md" id="branch" onChange={e => {
              setError(undefined);
              setBranch(e.target.value)
            }} />
          </div>

          <div className="mt-3 d-flex flex-column align-items-center justify-content-center p-3"
            style={{
              backgroundColor: isPrivate ? '#f9b0002e' : '#fff',
              border: isPrivate ? '2px solid #f9b000' : 'transparent',
              borderRadius: 6
            }}
            onClick={() => setStatus(!isPrivate)} >
            <i className='fa-solid fa-shield-alt mb-2' style={{ color: "#f9b000", fontSize: 32 }} />
            <span style={{
              fontWeight: 'bold', color: '#f9b000', fontSize: 12, letterSpacing: 3, background: '#f9b0005e',
              padding: '.1rem .75rem', borderRadius: 12
            }} className='mb-2'>PRIVATE</span>
            Is private repository ?
          </div>

          <div className='d-flex align-items-center mt-auto' style={{ gap: '.5rem' }}>
            <button type="button" className='btn btn-secondary'
              style={{ flex: .5, border: 'none', borderRadius: 6, padding: '.5rem 1rem', background: '#000' }}
              onClick={e => {
                e.stopPropagation();
                setGithubModal(false)
              }} >Cancel </button>
            <button type="button"
              className='btn btn-secondary'
              style={{ flex: 1, background: '#f9b000', border: 'none', borderRadius: 6, padding: '.5rem 1rem' }}
              onClick={e => {
                e.stopPropagation();
                setError(undefined)
                createGithubRepo(owner, repo, branch, isPrivate)
                  .then(r => {
                    if (r.status > 300) {
                      setError(r);
                    } else {
                      setGithubModal(false)
                      reloadPlugins()
                    }
                  })
              }}>Import sources</button>
          </div>
        </div>
      </div>}
    </div>
  }

  return <>
    <div style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 255,
      zIndex: 100,
      width: active ? 225 : 0,
      background: '#eee',
      gap: '.5rem',
      transition: 'width .25s'
    }} onClick={e => e.stopPropagation()}>
      {active && <div className='d-flex flex-column h-100'>
        <h3 style={{ fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', height: 42, margin: 0 }}
          className='d-flex align-items-center justify-content-center'>Language</h3>
        <div className='d-flex flex-column' style={{ flex: 1, padding: '.5rem 1rem' }}>
          {[
            {
              icon: <Rust style={{ height: 30, width: 32, marginLeft: -4, transform: 'scale(1.5)' }} />,
              title: 'Rust',
              value: 'rust'
            },
            {
              icon: <Js style={{ height: 32, width: 32 }} />,
              title: 'Javascript',
              value: 'js'
            },
            {
              icon: <Ts style={{ height: 32, width: 32 }} />,
              title: 'Typescript',
              value: 'ts'
            },
            {
              icon: <Go style={{ height: 32, width: 32 }} />,
              title: 'Golang',
              value: 'go'
            },
            {
              icon: <OPA style={{ height: 32, width: 32 }} />,
              title: 'Open Policy Agent',
              value: 'opa'
            },
            {
              icon: <Github style={{ height: 32, width: 32 }} />,
              title: 'Github',
              onClick: e => {
                e.stopPropagation()
                setGithubModal(true)
              }
            }
          ].map(({ icon, onClick, title, value }, i) => {
            return <button
              type="button"
              key={`action-${i}`}
              className='btn btn-sm btn-light d-flex align-items-center mb-2'
              onClick={onClick ? onClick : () => setLanguage(value)}
              style={{
                border: value === language ? '1px solid #2ecc71' : 'none',
                gap: '.5rem',
                padding: '.5rem 1rem',
                borderRadius: 0,
                minHeight: 46
              }}>
              {icon}
              {title}

              <span className='ms-auto btn btn-sm' style={{
                borderRadius: '50%',
                background: '#eee',
                width: 30,
                height: 30,
                background: 'rgb(46 204 113 / 27%)',
                display: value === language ? 'block' : 'none'
              }}>
                <i className='fa-solid fa-check' color='#2ecc71' style={{ fontWeight: 'bold' }} />
              </span>
            </button>
          })}
        </div>

        <div className='mt-auto d-flex' style={{ margin: '.5rem 1rem' }}>
          <button type="button" className='btn btn-secondary'
            style={{ border: 'none', borderRadius: 6, padding: '.5rem 1rem', background: '#000', flex: 1 }}
            onClick={e => {
              e.stopPropagation();
              setLanguage(false)
              setProjectSelector(false)
            }}>Cancel</button>
        </div>
      </div>}
    </div>

    {active && language &&
      <ProductsSelector
        product={product}
        onClick={product => {
          setProduct(product)
          if (product === "otoroshi" && language !== "opa") {
            setOtoroshiTemplates(true)
          } else {
            setOtoroshiTemplates(false)
            onNewPlugin(language, product)
            setProjectSelector(false)
          }
        }} />}
    {active && otoroshiTemplates &&
      <OtoroshiTemplatesSelector
        language={language}
        otoroshiTemplates={otoroshiTemplates}
        onNewPlugin={onNewPlugin} />}
  </>
}

function ProductsSelector({ onClick, product }) {
  return <div style={{
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 485,
    zIndex: 100,
    width: 225,
    background: '#eee',
    gap: '.5rem',
    transition: 'width .25s'
  }}>
    <div className='d-flex flex-column h-100'>
      <h3 style={{ fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', height: 42, margin: 0 }}
        className='d-flex align-items-center justify-content-center'>Target</h3>
      <div className='d-flex flex-column' style={{ flex: 1, padding: '.5rem 1rem' }}>
        {[
          {
            icon: <span style={{ minWidth: 32 }}><i className='fa-solid fa-map fa-xl' /></span>,
            title: 'Empty',
            value: 'empty',
            onClick: () => onClick('empty')
          },
          {
            icon: <img src={Otoroshi} style={{ height: 34, width: 32 }} />,
            title: 'Otoroshi',
            value: 'otoroshi',
            onClick: () => onClick('otoroshi')
          },
          {
            icon: <img src={Izanami} style={{ height: 38, width: 32 }} />,
            title: 'Izanami',
            value: 'izanami',
            onClick: () => onClick('izanami')
          }
        ].map(({ icon, onClick, title, value }, i) => {
          const selected = value === product
          return <button
            type="button"
            key={`action-${i}`}
            className='btn btn-sm btn-light d-flex align-items-center mb-2'
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              onClick()
            }}
            style={{
              border: 'none',
              gap: '.5rem',
              padding: '.5rem 1rem',
              borderRadius: 0,
              minHeight: 46,
              border: selected ? '1px solid #2ecc71' : 'none',
            }}>
            {icon}
            {title}
            <span className='ms-auto btn btn-sm' style={{
              borderRadius: '50%',
              background: '#eee',
              width: 30,
              height: 30,
              background: 'rgb(46 204 113 / 27%)',
              display: selected ? 'block' : 'none'
            }}>
              <i className='fa-solid fa-check' color='#2ecc71' style={{ fontWeight: 'bold' }} />
            </span>
          </button>
        })}
      </div>
    </div>
  </div>
}

function OtoroshiTemplatesSelector({ language, onNewPlugin }) {

  const [otoroshiTemplate, setOtoroshiTemplate] = useState("")

  return <div style={{
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 715,
    zIndex: 100,
    width: 460,
    background: '#eee',
    gap: '.5rem',
    transition: 'width .25s'
  }}>
    <div className='d-flex flex-column h-100'>
      <h3 style={{ fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', height: 42, margin: 0 }}
        className='d-flex align-items-center justify-content-center'>Templates</h3>
      <div className='d-flex flex-column' style={{ flex: 1, padding: '.5rem 1rem' }}>
        {Object.entries(OTOROSHI_TEMPLATES).map(([title, { key, description }]) => ({
          icon: <span style={{ minWidth: 32 }}><i className='fa-solid fa-sheet-plastic fa-xl' /></span>,
          title,
          description,
          onClick: () => onNewPlugin(language, 'empty', key)
        })).map(({ icon, onClick, title, description }, i) => {
          return <button
            type="button"
            key={`action-${i}`}
            className='btn btn-sm btn-light d-flex align-items-center mb-2'
            onClick={onClick}
            style={{ border: 'none', gap: '.5rem', padding: '.5rem 1rem', borderRadius: 0, minHeight: 46 }}>
            {icon}
            <div className='d-flex flex-column'>
              <p className='text-start m-0' style={{ fontWeight: 'bold' }}>{title}</p>
              <p className='text-start m-0'>{description}</p>
            </div>
          </button>
        })}
      </div>
    </div>
  </div>
}

function Header({ onNewPlugin, reloadPlugins }) {
  const [showProjectSelector, setProjectSelector] = useState(false)

  return <div className='d-flex justify-content-between align-items-center sidebar-header'
    onClick={e => {
      e.stopPropagation();
      setProjectSelector(!showProjectSelector)
    }}
    style={{
      cursor: 'pointer'
    }}>
    <div className='d-flex align-items-center'>
      <i className='fa-solid fa-chess-rook fa-sm me-1' />
      <span className='fw-bold'>Plugins</span>
    </div>

    <div style={{
      background: '#eee',
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32
    }}>
      <i className='fa-solid fa-plus p-1' />
    </div>

    <NewPluginModal
      active={showProjectSelector}
      onNewPlugin={onNewPlugin}
      reloadPlugins={reloadPlugins}
      setProjectSelector={setProjectSelector} />
  </div>
}

class Plugin extends React.Component {

  timer = undefined;

  render() {
    const { onPluginClick, filename, pluginId, newFilename, ...props } = this.props;

    return <button type="button"
      style={{ border: 'none' }}
      className="d-flex align-items-center justify-content-between py-1"
      onClick={() => {
        if (!props.new) {
          if (this.timer) {
            clearTimeout(this.timer)
          }
          this.timer = setTimeout(() => onPluginClick(pluginId), 250);
        }
      }}
      onDoubleClick={e => {
        e.stopPropagation()
        if (this.timer) {
          clearTimeout(this.timer)
        }
        props.enablePluginRenaming(pluginId)
      }}
    >

      {props.new && <>
        <div style={{ minWidth: 18, marginLeft: -4, marginRight: 4 }}>
          {LOGOS[props.type]}
        </div>
        <input type='text'
          autoFocus
          className="form-control"
          value={newFilename}
          onChange={e => {
            e.stopPropagation()
            props.setFilename(e.target.value)
          }} />
      </>}

      {!props.new && <>
        <div className='d-flex align-items-center'>
          <div style={{ minWidth: 18, marginLeft: 2, marginRight: 8 }}>
            {LOGOS[props.type]}
          </div>
          <span style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '90%'
          }}>{filename}</span>
        </div>
      </>}
    </button>
  }
}
export default PluginManager;
