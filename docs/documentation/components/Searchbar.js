"use client";

import Script from 'next/script';

export default function Searchbar({ handleOpen, open }) {
  return <div className="w-6/12 ms-auto">
    <Script
      src="/wasmo/searchbar.js"
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

        setTimeout(() => document.querySelector("input").focus(), 200);
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
          // paddingRight: 12,
          minHeight: open ? 280 : 0,
          maxHeight: open ? 'initial' : 50,
          overflow: open ? 'initial' : 'hidden',
          paddingTop: open ? 20 : 6
        }}>
          <div id="search" style={{ display: open ? 'initial' : 'none' }}></div>
          {!open && <div className='cursor-pointer p-2 bg-purple-700 rounded-xl items-center flex'>
            <svg viewBox="0 0 20 20"
              aria-hidden="true"
              className="h-auto w-5 fill-white">
              <path d="M16.72 17.78a.75.75 0 1 0 1.06-1.06l-1.06 1.06ZM9 14.5A5.5 5.5 0 0 1 3.5 9H2a7 7 0 0 0 7 7v-1.5ZM3.5 9A5.5 5.5 0 0 1 9 3.5V2a7 7 0 0 0-7 7h1.5ZM9 3.5A5.5 5.5 0 0 1 14.5 9H16a7 7 0 0 0-7-7v1.5Zm3.89 10.45 3.83 3.83 1.06-1.06-3.83-3.83-1.06 1.06ZM14.5 9a5.48 5.48 0 0 1-1.61 3.89l1.06 1.06A6.98 6.98 0 0 0 16 9h-1.5Zm-1.61 3.89A5.48 5.48 0 0 1 9 14.5V16a6.98 6.98 0 0 0 4.95-2.05l-1.06-1.06Z" />
            </svg>
            <p className='text-white px-2'>
              Search
            </p>
          </div>}
        </div>
      </div>
    </div>
  </div>
}