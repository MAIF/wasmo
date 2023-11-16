export default function Badges({ values }) {
    return <div className="inline-flex ms-6 flex items-center mt-2" style={{ gap: '.5rem' }}>
        {values.map(value => <span key={value} className="whitespace-nowrap rounded-full bg-purple-100 px-2.5 py-0.5 text-sm text-purple-700">
            {`<${value}>`}
        </span>)}
    </div>
}