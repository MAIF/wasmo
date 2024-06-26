import React, { useRef } from 'react';

import { marked } from "marked";
import { SidebarContext } from './Sidebar';

import CodeMirror from '@uiw/react-codemirror';
import { rust } from '@codemirror/lang-rust';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { go } from '@codemirror/legacy-modes/mode/go';
import { javascript, esLint } from '@codemirror/lang-javascript';
import { StreamLanguage } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';

import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { linter, lintGutter } from "@codemirror/lint";

import * as eslint from "eslint-linter-browserify";

function Tab({ content, ext, handleContent, selected, readOnly }) {
  const ref = useRef()

  if (!selected)
    return null

  const EXTENSIONS = {
    go: () => StreamLanguage.define(go),
    md: () => markdown(),
    rs: () => rust(),
    js: () => javascript({ typescript: false }),
    ts: () => javascript({ typescript: true }),
  }

  const getLanguageExtension = () => {
    const extension = EXTENSIONS[ext];
    if (extension) {
      return extension();
    } else {
      return json()
    }
  }

  let extensions = [
    getLanguageExtension(),
    autocompletion(),
    indentationMarkers(),
    lintGutter()
  ]

  if (ext === 'js') {
    const lints = linter(esLint(new eslint.Linter(), {
      files: ["**/*.js"],
      languageOptions: {
        ecmaVersion: "latest"
      },
      rules: {
        semi: ["error", "never"]
      }
    }));
    extensions = [
      ...extensions,
      lints
    ]
  }

  const renderCodeMirror = () => {
    return <SidebarContext.Consumer>
      {({ open, sidebarSize }) => (
        <CodeMirror
          ref={ref}
          onKeyDown={e => {
            const charCode = String.fromCharCode(e.which).toLowerCase();

            if (!((e.ctrlKey || e.metaKey) && charCode === 's')) {
              e.stopPropagation()
            }
          }}
          height='100%'
          readOnly={readOnly}
          maxWidth={`calc(100vw - ${open ? `${sidebarSize}px` : '52px'})`}
          value={content}
          extensions={extensions}
          onChange={value => {
            handleContent(value)
          }}
        />
      )}
    </SidebarContext.Consumer>
  }

  if (ext === 'md') {
    return <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      flex: 1,
    }}>
      {renderCodeMirror()}

      <div
        className='p-3'
        style={{
          borderLeft: '1px solid #eee'
        }}
        dangerouslySetInnerHTML={{
          __html: marked.parse(content)
        }}
      />
    </div>
  } else {
    return renderCodeMirror();
  }
}
export default Tab;
