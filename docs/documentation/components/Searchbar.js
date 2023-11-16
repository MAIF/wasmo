"use client";

import Script from 'next/script';

export default function Searchbar({ handleOpen, open }) {
  return <div className="w-6/12 ms-auto">
    <Script
      src="/searchbar.js"
      strategy="lazyOnload"
    />

    {open && <div style={{
      background: '#ddd',
      opacity: '.9',
      position: 'absolute',
      top: -10,
      right: 0,
      height: '100vh',
      left: 0,
      bottom: 0,
      zIndex: 100,
      overflow: 'hidden'
    }} onClick={e => {
      if (open) {
        e.stopPropagation()
        handleOpen(false)
      }
    }} />}

    <div style={{
      position: 'absolute',
      top: open ? 0 : -20,
      right: 0,
      left: open ? 0 : 'initial',
      zIndex: 100
    }} onClick={e => {
      if (!open) {
        e.stopPropagation()
        handleOpen(true)
      }
    }} className='flex'>

      <div className={`flex flex-col ${open ? 'border-purple-900' : ''}`} style={
        open ? {
          borderWidth: 1,
          margin: 'auto',
          marginTop: 100,
          background: '#fff',
          width: '60%',
          maxWidth: '800px',
          borderRadius: 12,
          minHeight: 280,
          maxHeight: 500,
          overflow: 'hidden',
          padding: 20,
          position: 'relative'
        } : {
          padding: 20
        }} onClick={e => {
          if (open)
            e.stopPropagation()
        }}>
        <div style={{
          paddingRight: 12,
          minHeight: open ? 280 : 0,
          maxHeight: open ? 'initial' : 50,
          overflow: open ? 'initial' : 'hidden',
          paddingTop: open ? 20 : 0
        }}>
          <div id="search"></div>
        </div>
      </div>
    </div>
  </div>
}