import * as React from 'react';
import { useState } from 'react';
import { GenericModal } from '../../components/GenericModal';
import { BaseButton } from '../../components/BaseButton';
import ValidatedInput from '../../components/ValidatedInput';

export function LightningHyperlinkModal(props: {
  openRef?: any,
  hyperlink?: any,

  opened?: boolean;
  close?: (accepted: boolean) => void,
  setShowHyperlinkWarning?: (value: boolean) => void;
}) {

  return (
    <GenericModal
      visible={props.opened}
      size="sm"
      type="notice"
      icon="Notice"
      onClose={() => props.close(false)}
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
        onClick={() => props.close(true)}
      >
        Understood, pay with LN wallet
      </BaseButton>
    </GenericModal>
  );
}
