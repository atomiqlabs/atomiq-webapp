import { useEffect, useRef } from 'react';
import * as React from 'react';

/**
 * An element with a workaround for scrolling to itself, triggered when the trigger param changes from false to true
 *
 * @param props
 * @constructor
 */
export function ScrollAnchor(props: { trigger: boolean }) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.trigger) return;

    const elementInViewport = (element: HTMLElement): boolean => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= viewportHeight &&
        rect.right <= viewportWidth
      );
    };

    const scrollToAnchor = () => {
      const anchorElement = anchorRef.current;
      if (anchorElement == null) return false;

      if (elementInViewport(anchorElement)) return true;

      const rect = anchorElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      if (rect.bottom > viewportHeight) {
        window.scrollBy({
          left: 0,
          top: rect.bottom - viewportHeight,
        });
      } else if (rect.top < 0) {
        window.scrollBy({
          left: 0,
          top: rect.top,
        });
      }

      return elementInViewport(anchorElement);
    };

    let interval: ReturnType<typeof setInterval> | null = null;

    if (!scrollToAnchor()) {
      interval = setInterval(() => {
        if (!scrollToAnchor() || interval == null) return;

        clearInterval(interval);
        interval = null;
      }, 100);
    }

    return () => {
      if (interval != null) clearInterval(interval);
    };
  }, [props.trigger]);

  return <div id="scrollAnchor" ref={anchorRef}></div>;
}
