export default function FAQButton({ title }) {
    return <button className="block btn border border-black p-2 w-4/5 text-start rounded-lg mb-3 flex items-center justify-between" type="button"
        onClick={() => {
            window.location.href = `/wasmo/faq#${title
                .toLowerCase()
                .replace(/[^a-z0-9 ]/g, '')
                .replace(/[ ]/g, '-')}`
        }}>
        <div className="items-center flex gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={24}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            {title}
        </div>


        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.25} stroke="currentColor" width={24}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
        </svg>
    </button>
}