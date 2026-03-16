import { useState, useEffect } from 'react';

export function useIsTelegramBrowser() {
    const [isTelegram, setIsTelegram] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
            const isTelegramBrowser = /Telegram/i.test(userAgent);
            setIsTelegram(isTelegramBrowser);
        }
    }, []);

    return isTelegram;
}
