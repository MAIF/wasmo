new PagefindUI({
    element: "#search",
    baseUrl: '/wasmo',
    showSubResults: true,
    highlightParam: "highlight",
    showImages: false,
    translations: {
        placeholder: "Search documentation",
        zero_results: "No results for '[SEARCH_TERM]'"
    }
});


document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        // e.preventDefault();

        const hash = this.getAttribute('href');

        document.querySelector(hash).scrollIntoView({
            behavior: 'smooth'
        });

        setTimeout(() => {
            window.location.hash = hash;
        }, 250)
    });
});