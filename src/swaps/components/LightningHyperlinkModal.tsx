import * as React from 'react';
import { useState } from 'react';
import { GenericModal } from '../../components/GenericModal';
import { BaseButton } from '../../components/BaseButton';
import ValidatedInput from '../../components/ValidatedInput';

export function LightningHyperlinkModal(props: {
  openRef: React.MutableRefObject<() => void>;
  hyperlink: string;
  setShowHyperlinkWarning: (value: boolean) => void;
}) {
  const [openAppModalOpened, setOpenAppModalOpened] = useState<boolean>(false);

  props.openRef.current = () => {
    setOpenAppModalOpened(true);
  };

  return (
    <GenericModal
      visible={openAppModalOpened}
      size="sm"
      type="notice"
      icon="Notice"
      onClose={() => setOpenAppModalOpened(false)}
      title="Important notice"
      enableClose={true}
    >
      <p className="sc-text">
        The payment will not succeed unless you{' '}
        <strong>return to the web app and claim the swap.</strong>
      </p>
      <ValidatedInput
        type="checkbox"
        placeholder="Don't show this warning again"
        onChange={(checked: boolean) => props.setShowHyperlinkWarning(!checked)}
      />
      <BaseButton
        variant="secondary"
        className="sc-button"
        onClick={() => {
          window.location.href = props.hyperlink;
          setOpenAppModalOpened(false);
        }}
      >
        Understood, pay with LN wallet
      </BaseButton>
    </GenericModal>
  );
}
