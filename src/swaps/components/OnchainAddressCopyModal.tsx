import * as React from 'react';
import { useState } from 'react';
import { GenericModal } from '../../components/GenericModal';
import { BaseButton } from '../../components/BaseButton';
import ValidatedInput from '../../components/ValidatedInput';

export function OnchainAddressCopyModal(props: {
  openRef: React.MutableRefObject<() => void>;
  amountBtc: string;
  setShowCopyWarning: (value: boolean) => void;
}) {
  const [openAppModalOpened, setOpenAppModalOpened] = useState<boolean>(false);

  props.openRef.current = () => {
    setOpenAppModalOpened(true);
  };

  return (
    <GenericModal
      visible={openAppModalOpened}
      size="sm"
      className="onchain-address-copy-modal"
      icon="Notice"
      onClose={() => setOpenAppModalOpened(false)}
      title="Important notice"
      enableClose={false}
    >
      <p className="onchain-address-copy-modal__text">
        Make sure you send <b>EXACTLY {props.amountBtc} BTC</b>, as sending a different amount will
        not be accepted, and you might lose your funds!
      </p>
      <ValidatedInput
        type="checkbox"
        placeholder="Don't show this warning again"
        onChange={(checked: boolean) => props.setShowCopyWarning(!checked)}
      />
      <BaseButton
        variant="secondary"
        className="onchain-address-copy-modal__button"
        onClick={() => {
          setOpenAppModalOpened(false);
        }}
      >
        Understood, copy address
      </BaseButton>
    </GenericModal>
  );
}
