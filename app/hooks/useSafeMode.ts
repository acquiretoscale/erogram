'use client';

import { useState, useEffect, useCallback } from 'react';

const SAFE_MODE_KEY = 'erogram:safeMode';

export function useSafeMode() {
    const [safeMode, setSafeModeState] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setSafeModeState(localStorage.getItem(SAFE_MODE_KEY) === 'true');
    }, []);

    const toggleSafeMode = useCallback(() => {
        setSafeModeState((prev) => {
            const next = !prev;
            localStorage.setItem(SAFE_MODE_KEY, String(next));
            window.dispatchEvent(new CustomEvent('safeModeChanged', { detail: next }));
            return next;
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = (e: Event) => {
            const val = (e as CustomEvent).detail;
            setSafeModeState(val);
        };
        window.addEventListener('safeModeChanged', handler);
        return () => window.removeEventListener('safeModeChanged', handler);
    }, []);

    return { safeMode, toggleSafeMode };
}
