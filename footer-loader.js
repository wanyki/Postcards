(function() {
    function loadFooter() {
        fetch('footer.html')
            .then(response => response.text())
            .then(html => {
                const container = document.createElement('div');
                container.innerHTML = html;
                document.body.appendChild(container.firstElementChild);
            })
            .catch(err => console.warn('Footer load failed:', err));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFooter);
    } else {
        loadFooter();
    }
})();