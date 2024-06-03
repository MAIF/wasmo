import { useEffect, useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter'
import rainbow from 'react-syntax-highlighter/dist/esm/styles/hljs/tomorrow-night-blue'

export const Pre = props => {
  const language = props.children.props.className?.replace('language-', '');
  const [copied, setCopied] = useState()

  useEffect(() => {
    if (copied)
      setTimeout(() => {
        setCopied(false)
      }, 1200)
  }, [copied])

  const codeString = props.children.props.children;

  return <div className='overflow-hidden relative rounded-lg my-7' style={{ maxWidth: 800 }}>
    {language && <div className='flex items-center bg-purple-900 ps-3' style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2rem',
      gap: '.25rem',
    }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%' }} className='bg-gray-400' />
      <div style={{ width: 10, height: 10, borderRadius: '50%' }} className='bg-gray-400' />
      <div style={{ width: 10, height: 10, borderRadius: '50%' }} className='bg-gray-400' />

      {!['javascript', 'go', 'rust', 'js'].includes(language) && <span className='text-white ms-3'>{language}</span>}
    </div>}

    <div className={`absolute right-2 rounded-lg top-${language ? 10 : 2} p-1 cursor-pointer hover:bg-gray-600`}
      onClick={() => {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(codeString);
          setCopied(true)
        }
      }}
      style={{
        border: '1px solid #fff'
      }}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#ffffff"
        className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
      </svg>
    </div>

    {copied && <div className='absolute right-10 top-10 p-1 text-white'>Copied!</div>}

    <SyntaxHighlighter language={language || "bash"} style={rainbow} customStyle={{
      padding: language ? '2.5rem 12px 1rem' : '1rem 12px'
    }}>
      {codeString}
    </SyntaxHighlighter>
  </div >
}