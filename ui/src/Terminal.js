import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { solarizedDark } from '@uiw/codemirror-theme-solarized';
import { isDevelopmentMode, isWSS } from './services';

import { SidebarContext } from './Sidebar';

function Terminal({ sizeTerminal, toggleResizingTerminal, changeTerminalSize, selectedPlugin, onLoadConfigurationFile }) {
  const [content, setContent] = useState('');
  const [loadConfigurationFile, setLoadConfigurationFile] = useState(false);
  const ref = useRef();

  const [wsState, setWsState] = useState({})

  useEffect(() => {
    if (loadConfigurationFile) {
      onLoadConfigurationFile()
      setLoadConfigurationFile(false);
    }
  }, [loadConfigurationFile]);

  const connect = (isDevelopment, isWSS) => {
    console.log("connect ws")
    let socket;

    let protocol = 'ws';

    if (isWSS) {
      protocol = 'wss';
    }

    if (isDevelopment) {
      socket = new WebSocket(`${protocol}://${window.location.hostname}:5001/${selectedPlugin.pluginId}`);
    } else {
      socket = new WebSocket(`${protocol}://${window.location.host}/${selectedPlugin.pluginId}`);
    }

    socket.onopen = () => {
    }

    socket.onmessage = event => {
      const text = event.data
      if (sizeTerminal === 0) {
        changeTerminalSize(0.5);
      }

      if (text.includes("You can now use the generated wasm")) {
        setLoadConfigurationFile(true)
      }

      if (text.includes('Starting build')) {
        setContent(text)
      } else {
        setContent(content => content + text)
        if (ref && ref.current)
          ref.current.view.scrollDOM.scrollTop = ref.current.view.scrollDOM.scrollHeight;
      }
    }

    socket.onclose = function (e) {
      console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);

      setTimeout(function () {
        connect(isDevelopment, isWSS);
      }, 5000);
    };

    socket.onerror = function (err) {
      console.error('Socket encountered error: ', err.message, 'Closing socket');
      socket.close();
    };
  }

  useEffect(() => {
    if (selectedPlugin) {
      Promise.all([isDevelopmentMode(), isWSS()])
        .then(([isDevelopment, isWSS]) => {
          setWsState({ isDevelopment, isWSS })
          connect(isDevelopment, isWSS)
        })
    }
  }, [selectedPlugin?.pluginId]);


  return <div style={{
    flex: sizeTerminal
  }} className="bg-light">
    <div style={{ height: 12, background: '#eee' }}
      className="d-flex align-items-center justify-content-center"
      onMouseDown={e => {
        e.stopPropagation();
        toggleResizingTerminal(true)
      }}
      onMouseMove={e => e.stopPropagation()}
      onMouseUp={e => {
        e.stopPropagation();
        toggleResizingTerminal(false)
      }}>
      <div style={{
        cursor: 'pointer',
        background: '#fff',
        width: 36,
        height: 6,
        borderRadius: 12
      }}></div>
    </div>
    <div className='d-flex justify-content-between align-items-center mx-2 me-3'>
      <div style={{
        borderBottom: '2px solid #f9b000', textTransform: 'uppercase',
        userSelect: 'none',
        width: 'fit-content'
      }} className='p-1' onClick={() => {
        changeTerminalSize(0.3)
        connect(wsState.isDevelopment, wsState.isWSS)
      }}>
        <span>Terminal</span>
      </div>
      <div className='d-flex align-items-center'>
        <span className='me-3' onClick={() => setContent('')} >
          <i className='fa-solid fa-ban fa-sm' style={{ cursor: 'pointer' }}
          />
        </span>
        <span onClick={() => changeTerminalSize(0)} >
          <i className='fa-solid fa-times fa-sm' style={{ cursor: 'pointer' }}
          />
        </span>
      </div>
    </div>

    <SidebarContext.Consumer>
      {({ open, sidebarSize }) => (
        <CodeMirror
          ref={ref}
          maxWidth={`calc(100vw - ${open ? `${sidebarSize}px` : '52px'})`}
          height={`calc(${(sizeTerminal) * 100}vh)`}
          value={content}
          extensions={[]}
          theme={solarizedDark}
          readOnly={true}
          editable={false}
          basicSetup={{
            lineNumbers: false,
            dropCursor: false
          }}
        />
      )}
    </SidebarContext.Consumer>
  </div>
}

export default Terminal;