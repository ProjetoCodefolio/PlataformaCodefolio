import { useState, useEffect } from 'react';

export const useIsMobileHook = (weight = 600) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < weight);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < weight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return isMobile;
};