export default function Badge({ value, raw, ...props }) {
    return <div className={`inline-flex flex items-center ${props.default ? 'mb-3' : 'ms-3 mt-2 '}`} style={{ gap: '.5rem' }}>
        <span className="whitespace-nowrap rounded-full bg-purple-100 px-2.5 py-0.5 text-sm text-purple-700">
            {!raw ? `<${value}>` : value}
        </span>
    </div>
}