"use client"
const LINKS = {
  Builder: ["Overview", "Getting started", "Your first plugin", "Environment Variables", "Plugin Structure", 'UI'],
  CLI: ["Getting started", "Core commands", "Configuration file"],
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

export function Sidebar({ metadata }) {

  return <div className="flex h-screen flex-col justify-between ps-2" style={{ minWidth: 250 }}>
    <div className="px-4 py-6 ps-0">
      {/* <span
        className="grid h-10 w-32 place-content-center rounded-lg bg-gray-100 text-xs text-gray-600"
      >
        wasmo@0.1.2
      </span> */}

      <ul className="mt-6 space-y-1">
        <li>
          <a
            href="/wasmo"
            className={`block rounded-lg ${color(metadata.href === "/wasmo")} px-4 py-2 text-sm font-medium text-gray-700`}
          >
            Overview
          </a>
        </li>

        {Object.entries(LINKS).map(([group, children]) => {
          return <li key={group} >
            <details className="group [&_summary::-webkit-details-marker]:hidden"
              // open={metadata.href.startsWith(`/${slugify(group)}`)}
              open={true}
            >
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
                  const href = `/wasmo/${slugify(group)}/${slugify(child)}`;
                  return <li key={child}>
                    <a
                      href={href}
                      className={`block rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 ${color(`/wasmo/${metadata.href}` === href)}`}
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
  </div>
}