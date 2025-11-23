import { QRScanner } from './QRScanner';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { GenericModal } from '../common/GenericModal';
import { Spinner } from 'react-bootstrap';

export function QRScannerModal(props: {
  onScanned: (value: string) => void;
  show: boolean;
  onHide: () => void;
}) {
  const [loading, setLoading] = useState<boolean>(true);

  // Reset loading state when modal is opened
  useEffect(() => {
    if (props.show) {
      setLoading(true);
    }
  }, [props.show]);

  return (
    <GenericModal visible={props.show} onClose={props.onHide} title="Scan QR code" size="lg">
      {loading && (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: '200px' }}
        >
          <Spinner animation="border" role="status" variant="light">
            <span className="visually-hidden">Loading camera...</span>
          </Spinner>
        </div>
      )}
      <div style={{ display: loading ? 'none' : 'block' }}>
        <QRScanner
          onResult={(result, err) => {
            if (result != null) {
              if (props.onScanned != null) {
                props.onScanned(result);
              }
            }
          }}
          camera={'environment'}
          onLoadingChange={setLoading}
        />
      </div>
    </GenericModal>
  );
}
