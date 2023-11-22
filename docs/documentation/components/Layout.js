import { MDXProvider } from '@mdx-js/react';

import { Heading } from './mdx/Heading';
import { Link } from './mdx/Link';
import { Sidebar } from './Sidebar';
import { List } from './mdx/List';
import { Misc } from './mdx/Misc';
import { Pre } from './mdx/Pre';

import Searchbar from './Searchbar';
import { useState } from 'react';
import { Table } from './mdx/Table';

function Layout({ children, next, metadata, previous }) {
  const [open, handleOpen] = useState(false)

  return <>
    <header className="sticky top-2 z-50 flex items-center justify-between px-3 py-2 bg-white" onClick={() => handleOpen(false)}>
      <div className="flex items-center flex-grow">
        <a href="" className="text-3xl font-bold tracking-tight text-slate-1200 flex items-center gap-2">
          <img src="/wasmo/wasmo.png" width={32} />
          Wasmo Docs
        </a>
      </div>

      <Searchbar open={open} handleOpen={handleOpen} />
    </header>

    <main className="relative flex justify-center mx-auto max-w-8xl" onClick={() => handleOpen(false)} style={{
      height: 'calc(100vh - 58px)',
      overflow: 'hidden'
    }}>
      <Sidebar metadata={metadata} />

      <div className="flex-auto max-w-2xl min-w-0 px-4 pb-10 lg:max-w-none lg:pl-8 xl:px-16" style={{
        flex: 1,
        overflowY: 'auto',
      }}>
        <MDXProvider components={{
          h1: Heading.H1,
          h2: Heading.H2,
          a: Link.a,
          ul: List.ul,
          ol: List.ol,
          code: Misc.code,
          pre: Pre,
          p: Misc.p,
          blockquote: Misc.blockquote,
          table: Table,
          th: props => <th className='whitespace-nowrap px-4 py-2 font-medium text-gray-900'>{props.children}</th>,
          thead: props => <thead className="ltr:text-left rtl:text-right">{props.children}</thead>,
          h3: props => <h3 className='text-xl font-bold my-3'>{props.children}</h3>,
          h4: props => <h4 className='text-lg my-3'>{props.children}</h4>
        }}>
          {children}
        </MDXProvider>

        <div className='flex mt-16 justify-between border-t-2 border-gray-200 border-solid pt-6'>
          {previous && <a href={`/wasmo${previous.href}`}
            className="flex p-4 border-t border-slate-100 border-2 w-fit rounded-lg me-auto">
            <div className="ml-auto text-right">
              <dt className="text-sm font-normal tracking-tight text-slate-600">
                Previous
              </dt>

              <dd className="mt-1">
                <div className="text-base font-semibold text-slate-900 hover:underline">
                  {previous.title}
                </div>
              </dd>
            </div>
          </a>}

          {next && <a href={`/wasmo${next.href}`}
            className={`flex p-4 border-t border-slate-100 border-2 w-fit rounded-lg ms-auto`}>
            <div className="ml-auto text-right">
              <dt className="text-sm font-normal tracking-tight text-slate-600">
                Next
              </dt>

              <dd className="mt-1">
                <div className="text-base font-semibold text-slate-900 hover:underline">
                  {next.title}
                </div>
              </dd>
            </div>
          </a>}
        </div>
      </div>
    </main>
  </>
}

export default Layout;