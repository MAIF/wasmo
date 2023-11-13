import { MDXProvider } from '@mdx-js/react';

import { Heading } from './mdx/Heading';
import { Link } from './mdx/Link';
import { Sidebar } from './Sidebar';
import { List } from './mdx/List';
import { Misc } from './mdx/Misc';
import { Pre } from './mdx/Pre';

function Layout({ children, next, metadata }) {
  return <>
    <header className="sticky top-0 z-50 flex items-center justify-between px-3 py-2">
      <div className="flex items-center flex-grow">
        <a href="" className="text-3xl font-bold tracking-tight text-slate-1200">
          Wasmo Docs
        </a>
      </div>

      <form action="https://duckduckgo.com/" className="md:w-80 lg:w-96 ms-auto">
        <span className="relative flex items-center group">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="absolute w-4 h-4 ml-3 fill-slate-400 group-hover:fill-slate-500 group-focus:fill-slate-500"><path d="M16.293 17.707a1 1 0 0 0 1.414-1.414l-1.414 1.414ZM9 14a5 5 0 0 1-5-5H2a7 7 0 0 0 7 7v-2ZM4 9a5 5 0 0 1 5-5V2a7 7 0 0 0-7 7h2Zm5-5a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7v2Zm8.707 12.293-3.757-3.757-1.414 1.414 3.757 3.757 1.414-1.414ZM14 9a4.98 4.98 0 0 1-1.464 3.536l1.414 1.414A6.98 6.98 0 0 0 16 9h-2Zm-1.464 3.536A4.98 4.98 0 0 1 9 14v2a6.98 6.98 0 0 0 4.95-2.05l-1.414-1.414Z"></path></svg>
          <input type="text" name="q" placeholder="Search docs…" className="w-full py-2 pl-10 pr-2 border rounded bg-slate-100 placeholder-slate-400 text-slate-800 border-slate-100 outline outline-offset-2 outline-2 outline-transparent hover:border-slate-200 focus:border-slate-200 focus:outline-slate-600" />
        </span>
        {/* <input type="hidden" name="sites" value="spinalcms.com" /> */}
        <input type="submit" value="Search" className="sr-only" />
      </form>

    </header>

    <main className="relative flex justify-center mx-auto max-w-8xl" style={{
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