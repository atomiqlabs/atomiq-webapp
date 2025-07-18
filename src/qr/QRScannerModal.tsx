import { QRScanner } from "./QRScanner";
import * as React from "react";
import { CloseButton, Modal } from "react-bootstrap";

export function QRScannerModal(props: {
  onScanned: (value: string) => void;
  show: boolean;
  onHide: () => void;
}) {
  return (
    <Modal
      contentClassName="text-white bg-dark"
      size="lg"
      centered
      show={props.show}
      onHide={props.onHide}
    >
      <Modal.Header className="border-0">
        <Modal.Title
          id="contained-modal-title-vcenter"
          className="d-flex flex-grow-1"
        >
          Scan QR code
          <CloseButton
            className="ms-auto"
            variant="white"
            onClick={props.onHide}
          />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <QRScanner
          onResult={(result, err) => {
            if (result != null) {
              if (props.onScanned != null) {
                props.onScanned(result);
              }
            }
          }}
          camera={"environment"}
        />
      </Modal.Body>
    </Modal>
  );
}
