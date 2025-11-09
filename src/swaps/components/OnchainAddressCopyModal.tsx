import * as React from 'react';
import { useState } from 'react';
import { GenericModal } from '../../components/GenericModal';
import { BaseButton } from '../../components/BaseButton';
import ValidatedInput from '../../components/ValidatedInput';

export function OnchainAddressCopyModal(props: {
  openRef?: React.MutableRefObject<() => void>;

  amountBtc: string;
  opened?: boolean;
  close?: (accepted: boolean) => void,
  setShowCopyWarning?: (value: boolean) => void;
}) {
  return (
    <GenericModal
      visible={props.opened}
      size="sm"
      className="onchain-address-copy-modal"
      icon="Notice"
      type="notice"
      onClose={() => props.close(false)}
      title="Important notice"
      enableClose={false}
    >
      <p className="sc-text">
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
        className="sc-button"
        onClick={() => {
          props.close(true);
        }}
      >
        Understood, copy address
      </BaseButton>
    </GenericModal>
  );
}
