import { MDXProvider } from '@mdx-js/react';

import { Heading } from './mdx/Heading';
import { Link } from './mdx/Link';
import { Sidebar } from './Sidebar';
import { List } from './mdx/List';
import { Misc } from './mdx/Misc';
import { Pre } from './mdx/Pre';

import Searchbar from './Searchbar';
import { useState } from 'react';

function Layout({ children, next, metadata }) {
  const [open, handleOpen] = useState(false)

  return <>
    <header className="sticky top-2 z-50 flex items-center justify-between px-3 py-2 bg-white" onClick={() => handleOpen(false)}>
      <div className="flex items-center flex-grow">
        <a href="" className="text-3xl font-bold tracking-tight text-slate-1200">
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

      <div className="flex-auto max-w-2xl min-w-0 px-4 py-10 lg:max-w-none lg:pr-0 lg:pl-8 xl:px-16" style={{
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
          blockquote: Misc.blockquote
        }}>
          {children}
        </MDXProvider>

        <dl className="flex pt-6 mt-6 border-t border-slate-200">
          <div className="ml-auto text-right">
            <dt className="text-sm font-normal tracking-tight text-slate-600">
              Next
            </dt>

            <dd className="mt-1">
              <a href={next.href} className="text-base font-semibold text-slate-900 hover:underline">
                {next.title}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </main>
  </>
}

export default Layout;