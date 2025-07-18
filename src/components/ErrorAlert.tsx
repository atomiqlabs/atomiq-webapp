import { Alert, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import Icon from "react-icons-kit";
import { ic_content_copy } from "react-icons-kit/md/ic_content_copy";
import * as React from "react";

export function ErrorAlert(props: {
  title: string;
  error: any;
  clearError?: () => void;
  className?: string;
  onRetry?: () => void;
}) {
  return (
    <Alert
      className={"text-center " + (props.className ?? "")}
      show={props.error != null}
      variant="danger"
      onClose={props.clearError}
      closeVariant="white"
    >
      <div className="d-flex align-items-center justify-content-center">
        <strong>{props.title}</strong>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id="scan-qr-tooltip">Copy full error stack</Tooltip>
          }
        >
          <a
            href="#"
            className="d-inline-flex align-items-center justify-content-middle"
            onClick={(evnt) => {
              evnt.preventDefault();
              // @ts-ignore
              navigator.clipboard.writeText(
                JSON.stringify(
                  {
                    error: props.error.name,
                    message: props.error.message,
                    stack: props.error.stack,
                  },
                  null,
                  4,
                ),
              );
            }}
          >
            <Icon className="ms-1 mb-1" size={16} icon={ic_content_copy} />
          </a>
        </OverlayTrigger>
      </div>
      <label>{props.error?.message || props.error?.toString()}</label>
      {props.onRetry != null ? (
        <Button
          variant="light"
          onClick={() => {
            props.onRetry();
          }}
        >
          Retry
        </Button>
      ) : (
        ""
      )}
    </Alert>
  );
}
