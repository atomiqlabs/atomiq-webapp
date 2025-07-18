import { Overlay, Tooltip } from "react-bootstrap";
import * as React from "react";
import { Placement } from "react-bootstrap/types";
import { useCallback, useEffect, useState } from "react";

export function TemporaryOverlay(props: {
  children?: (
    show: (target: HTMLElement) => void,
  ) => JSX.Element | JSX.Element[];
  text: string | JSX.Element;
  placement: Placement;
  timeout?: number;
}) {
  const [showCopyOverlay, setShowCopyOverlay] = useState<HTMLElement>(null);

  useEffect(() => {
    if (showCopyOverlay == null) return;

    const timeout = setTimeout(() => {
      setShowCopyOverlay(null);
    }, props.timeout ?? 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, [showCopyOverlay]);

  const show = useCallback((target: HTMLElement) => {
    setShowCopyOverlay(target);
  }, []);

  return (
    <>
      <Overlay
        target={showCopyOverlay}
        show={showCopyOverlay != null}
        placement={props.placement}
      >
        {(_props) => (
          <Tooltip id="overlay-example" {..._props}>
            {props.text}
          </Tooltip>
        )}
      </Overlay>
      {props.children(show)}
    </>
  );
}
