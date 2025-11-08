import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { elementInViewport } from '../utils/Utils';
/**
 * An element with a workaround for scrolling to bottom, triggered when the trigger param changes from false to true
 *
 * @param props
 * @constructor
 */
export function ScrollAnchor(props) {
    useEffect(() => {
        if (!props.trigger)
            return;
        let lastScrollTime = 0;
        let scrollListener = () => {
            lastScrollTime = Date.now();
        };
        window.addEventListener('scroll', scrollListener);
        const isScrolling = () => lastScrollTime && Date.now() < lastScrollTime + 100;
        let interval;
        interval = setInterval(() => {
            const anchorElement = document.getElementById('scrollAnchor');
            if (anchorElement == null)
                return;
            if (elementInViewport(anchorElement)) {
                clearInterval(interval);
                window.removeEventListener('scroll', scrollListener);
                scrollListener = null;
                interval = null;
                return;
            }
            if (!isScrolling()) {
                // @ts-ignore
                window.scrollBy({
                    left: 0,
                    top: 99999,
                });
            }
        }, 100);
        return () => {
            if (interval != null)
                clearInterval(interval);
            if (scrollListener != null)
                window.removeEventListener('scroll', scrollListener);
        };
    }, [props.trigger]);
    return _jsx("div", { id: "scrollAnchor" });
}
