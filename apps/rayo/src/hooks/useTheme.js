import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('rayo-theme');
        return saved || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('rayo-theme', theme);
    }, [theme]);

    const toggle = useCallback(() => {
        setTheme(t => t === 'light' ? 'dark' : 'light');
    }, []);

    return { theme, toggle };
}
