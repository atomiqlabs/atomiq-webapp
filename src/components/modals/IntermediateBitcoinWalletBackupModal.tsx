import * as React from 'react';
import { useEffect, useState } from 'react';
import { BaseButton } from '../common/BaseButton';
import { GenericModal } from '../common/GenericModal';
import ValidatedInput from '../ValidatedInput';

export function IntermediateBitcoinWalletBackupModal(props: {
  opened: boolean;
  close: () => void;
  downloadBackup: () => void;
  acknowledgeBackup: () => void;
  available: boolean;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (props.opened) return;
    setDownloaded(false);
    setConfirmed(false);
  }, [props.opened]);

  return (
    <GenericModal
      visible={props.opened}
      size="sm"
      type="notice"
      icon="Notice"
      onClose={props.close}
      title="Back up Bitcoin wallet"
      enableClose={true}
    >
      {!downloaded ? (
        <>
          <p className="sc-text">
            Download this recovery file and keep it private. You will need it to recover BTC from
            this wallet if this browser loses its data.
          </p>
          <BaseButton
            variant="secondary"
            className="sc-button"
            disabled={!props.available}
            onClick={() => {
              props.downloadBackup();
              setDownloaded(true);
            }}
          >
            Download backup
          </BaseButton>
        </>
      ) : (
        <>
          <p className="sc-text">Store the downloaded file somewhere safe before continuing.</p>
          <ValidatedInput
            className="w-100 text-start"
            type="checkbox"
            value={confirmed}
            placeholder="I downloaded and safely stored the backup file"
            onChange={setConfirmed}
          />
          <BaseButton
            variant="secondary"
            className="sc-button"
            disabled={!confirmed}
            onClick={() => {
              props.acknowledgeBackup();
              props.close();
            }}
          >
            Confirm backup
          </BaseButton>
        </>
      )}
    </GenericModal>
  );
}
