export const List = {
    ul: (props) => <div className="p-2 px-9">
        <ul className="list-disc">{props.children}</ul>
    </div>,
    ol: (props) => <div className="p-2 px-9">
        <ol className="list-decimal">{props.children}</ol>
    </div>
}