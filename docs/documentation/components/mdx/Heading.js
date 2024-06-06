function getAnchor(children) {
  const text = Array.isArray(children) ? children[0] : children
  return ("" + text)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/[ ]/g, '-');
}

export const Heading = {
  H1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mt-10 mb-5">{children}</h1>,
  // H2: props => {
  //   return <h2 className="text-2xl font-bold my-5" id={getAnchor(Array.isArray(props.children) ? props.children[0] : props.children)}>{props.children}</h2>
  // },
  H2: ({ children }) => {
    const anchor = getAnchor(children);
    const link = `#${anchor}`;
    return (
      <h2 id={anchor} className="text-2xl font-bold my-5">
        <a href={link} className="anchor-link">
          §
        </a>
        {children}
      </h2>
    );
  },
  H3: ({ children }) => {
    const anchor = getAnchor(children);
    const link = `#${anchor}`;
    return (
      <h2 id={anchor} className="text-xl font-bold my-5">
        <a href={link} className="anchor-link">
          §
        </a>
        {children}
      </h2>
    );
  }
};