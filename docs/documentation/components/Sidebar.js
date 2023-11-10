"use client"
const LINKS = {
  Builder: ["Overview", "Getting started", "Your first plugin", "Plugin Structure", 'UI'],
  CLI: ["Getting started"],
  Integrations: ["Otoroshi"],
}

const SELECTED = "bg-gray-200";

const color = test => test ? SELECTED : 'transparent';
const slugify = str => str.toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w-]+/g, '')
  .replace(/--+/g, '-');

export function Sidebar() {

  const customWindow = typeof window !== 'undefined' ? window : { location: { pathname: "/" } }

  return <div className="flex h-screen flex-col justify-between" style={{ minWidth: 250 }}>
    <div className="px-4 py-6 ps-0">
      {/* <span
        className="grid h-10 w-32 place-content-center rounded-lg bg-gray-100 text-xs text-gray-600"
      >
        wasmo@0.1.2
      </span> */}

      <ul className="mt-6 space-y-1">
        <li>
          <a
            href="/"
            className={`block rounded-lg ${color(customWindow.location.pathname === "/")} px-4 py-2 text-sm font-medium text-gray-700`}
          >
            Overview
          </a>
        </li>

        {Object.entries(LINKS).map(([group, children]) => {
          return <li key={group} >
            <details className="group [&_summary::-webkit-details-marker]:hidden" open={customWindow.location.pathname.startsWith(`/${slugify(group)}`)}>
              <summary
                className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <span className="text-sm font-medium"> {group} </span>

                <span
                  className="shrink-0 transition duration-300 group-open:-rotate-180"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </summary>

              <ul className="mt-2 space-y-1 px-4">
                {children.map(child => {
                  const href = `/${slugify(group)}/${slugify(child)}`;
                  return <li key={child}>
                    <a
                      href={href}
                      className={`block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 ${color(customWindow.location.pathname === href)}`}
                    >
                      {child}
                    </a>
                  </li>
                })}
              </ul>
            </details>
          </li>
        })}
      </ul>
    </div>

    {/* <div className="fixed inset-x-0 bottom-4 left-4 border-t border-gray-100 bg-gray-300 flex items-center p-2 rounded-md gap-1" style={{
      width: 300
    }}>
      <span className="mx-2">Is this page useful ?</span>
      <div className="bg-gray-200 rounded-md p-1 cursor-pointer inline-block rounded border border-current px-4 py-1 text-sm font-medium text-indigo-600 transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring active:text-indigo-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
          <path stroke-linecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
        </svg>
      </div>
      <div className="bg-gray-200 rounded-md p-1 cursor-pointer inline-block rounded border border-current px-4 py-1 text-sm font-medium text-indigo-600 transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring active:text-indigo-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-6 h-6">
          <path stroke-linecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
        </svg>
      </div>
    </div> */}
  </div>
}