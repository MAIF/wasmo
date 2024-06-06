"use client"
const LINKS = {
  Builder: ["Getting started", "Your first plugin", "Environment Variables", "Plugin Structure", "Collaborate", 'UI'],
  CLI: ["Getting started", "Core commands", "Configuration file"],
  Integrations: ["Otoroshi"]
}

const NEWS = ["FAQ"]

const color = test => test ? "#002451" : 'transparent';
const slugify = str => str.toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^\w-]+/g, '')
  .replace(/--+/g, '-');

export function Sidebar({ metadata }) {

  return <div className="flex h-screen flex-col justify-between ps-2 bg-slate-100" style={{ minWidth: 250 }}>
    <div className="px-4 py-5 ps-0">
      {/* <span
        className="grid h-10 w-32 place-content-center rounded-lg bg-gray-100 text-xs text-gray-600"
      >
        wasmo@0.1.2
      </span> */}

      <ul className="mt-6 space-y-1">
        <li>
          <a
            href="/wasmo"
            className={`block rounded-lg ${color(metadata.href === "/wasmo")} px-4 ps-3 py-2 text-sm font-medium text-gray-700`}
          >
            Overview
          </a>
        </li>
        <li className="relative">
          <a
            href="/wasmo/faq"
            className={`flex block rounded-lg ps-3 py-2 ps-2 hover:bg-gray-100 hover:text-gray-700 ${color(metadata.href === "/faq")} text-sm font-medium text-gray-700`}
          >
            FAQ
            <div style={{
              marginLeft: 'auto',
              display: "inline-flex",
              alignItems: 'center',
              justifyContent: 'center',
              height: '1.25rem',
              fontSize: '.875rem',
              lineHeight: '1.25rem',
              width: '-moz-fit-content',
              width: 'fit-content',
              paddingLeft: '0.563rem',
              paddingRight: '0.563rem',
              borderRadius: '1.2rem',
              borderWidth: '1px',
              '--p': 'rgb(126, 34, 206)',
              '--tw-border-opacity': 1,
              borderColor: 'var(--fallback-b2,oklch(var(--p)/var(--tw-border-opacity)))',
              '--tw-bg-opacity': 1,
              backgroundColor: 'var(--fallback-b1,oklch(var(--b2)/var(--tw-bg-opacity)))',
              '--tw-text-opacity': 1,
              color: 'var(--fallback-bc,oklch(var(--p)/var(--tw-text-opacity)))'
            }}>New</div>
          </a>
        </li>

        {Object.entries(LINKS).map(([group, children]) => {
          return <li key={group} >
            <details className="group [&_summary::-webkit-details-marker]:hidden"
              open={true}
            >
              <summary
                className="border-slate-200 border-2 flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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

              <ul className="mt-2 space-y-1 ps-4">
                {children.map(child => {
                  const href = `/wasmo/${slugify(group)}/${slugify(child)}`;
                  return <li key={child} className="relative">
                    <a
                      href={href}
                      className={`flex block rounded-lg px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 sidebar-group ${`/wasmo${metadata.href}` === href ? 'sidebar-group-selected' : ''}`}
                    >
                      {child}

                      {NEWS.includes(child) && <div style={{
                        marginLeft: 'auto',
                        display: "inline-flex",
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '1.25rem',
                        fontSize: '.875rem',
                        lineHeight: '1.25rem',
                        width: '-moz-fit-content',
                        width: 'fit-content',
                        paddingLeft: '0.563rem',
                        paddingRight: '0.563rem',
                        borderRadius: 'var(--rounded-badge,1.9rem)',
                        borderWidth: '1px',
                        '--p': 'rgb(126, 34, 206)',
                        '--tw-border-opacity': 1,
                        borderColor: 'var(--fallback-b2,oklch(var(--p)/var(--tw-border-opacity)))',
                        '--tw-bg-opacity': 1,
                        backgroundColor: 'var(--fallback-b1,oklch(var(--b2)/var(--tw-bg-opacity)))',
                        '--tw-text-opacity': 1,
                        color: 'var(--fallback-bc,oklch(var(--p)/var(--tw-text-opacity)))'
                      }}>New</div>}
                    </a>
                  </li>
                })}
              </ul>
            </details>
          </li>
        })}
      </ul>
    </div>
  </div>
}