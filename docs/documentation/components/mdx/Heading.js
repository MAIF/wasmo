export const Heading = {
  H1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mt-10 mb-5">{children}</h1>,
  H2: props => {
    return <h2 className="text-2xl font-bold my-5" id={(Array.isArray(props.children) ? props.children[0] : props.children)?.toLowerCase().trim().replace(/ /g, '-')}>{props.children}</h2>
  },
};