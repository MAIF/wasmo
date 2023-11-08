export const Link = {
  a: (props) => {
    return <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href={props.href} target="_blank">{props.children}</a>
  }
};