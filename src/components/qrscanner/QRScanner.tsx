import QrScanner from 'qr-scanner';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GenericModal } from '../common/GenericModal';
import { BaseButton } from '../common/BaseButton';

export function QRScanner(props: {
  onResult: (data: string, err) => void;
  camera: 'user' | 'environment';
  onLoadingChange?: (loading: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbackRef = useRef<(data: string, err) => void>(null);
  const qrScannerRef = useRef<QrScanner>(null);

  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    callbackRef.current = props.onResult;
  }, [props.onResult]);

  useEffect(() => {
    if (props.onLoadingChange) {
      props.onLoadingChange(loading);
    }
  }, [loading, props.onLoadingChange]);

  const startCamera = useCallback(() => {
    setLoading(true);
    if (qrScannerRef.current != null) qrScannerRef.current.stop();
    qrScannerRef.current = new QrScanner(
      videoRef.current,
      (result) => callbackRef.current(result.data, null),
      {
        preferredCamera: props.camera,
        highlightScanRegion: true,
        highlightCodeOutline: false,
        returnDetailedScanResult: true,
      }
    );

    qrScannerRef.current
      .start()
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      });
  }, [props.camera]);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current != null) {
        qrScannerRef.current.stop();
        qrScannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  return (
    <>
      <GenericModal
        visible={!!error}
        onClose={() => setError(null)}
        title="Camera error"
        size="sm"
        icon="invalid-error"
        type="warning"
      >
        <p>
          atomiq.exchange cannot access your camera, please make sure you've{' '}
          <b>allowed camera access permission</b> to your wallet app & to atomiq.exchange website.
        </p>
        <div className="generic-modal__buttons">
          <BaseButton
            variant="primary"
            className="width-fill"
            onClick={() => {
              setError(null);
              startCamera();
            }}
          >
            Retry
          </BaseButton>
          <BaseButton variant="secondary" className="width-fill" onClick={() => setError(null)}>
            Cancel
          </BaseButton>
        </div>
      </GenericModal>
      <video ref={videoRef} className="qr-video" style={{ height: '100%' }} />
    </>
  );
}
