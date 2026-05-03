(function () {
    const storageKey = 'terra-theme';
    let theme = null;

    try {
        const storedTheme = localStorage.getItem(storageKey);
        if (storedTheme === 'dark' || storedTheme === 'light') {
            theme = storedTheme;
        }
    } catch (err) {
        theme = null;
    }

    if (!theme) {
        const prefersDark = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
})();