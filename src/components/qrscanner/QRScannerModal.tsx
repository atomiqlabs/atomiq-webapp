import { QRScanner } from './QRScanner';
import * as React from 'react';
import { GenericModal } from '../common/GenericModal';

export function QRScannerModal(props: {
  onScanned: (value: string) => void;
  show: boolean;
  onHide: () => void;
}) {
  return (
    <GenericModal visible={props.show} onClose={props.onHide} title="Scan QR code">
      <QRScanner
        onResult={(result, err) => {
          if (result != null) {
            if (props.onScanned != null) {
              props.onScanned(result);
            }
          }
        }}
        camera={'environment'}
      />
    </GenericModal>
  );
}
