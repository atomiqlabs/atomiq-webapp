import * as React from 'react';
import { GenericModal } from '../GenericModal';
import { BaseButton } from '../BaseButton';
import ValidatedInput from '../ValidatedInput';

export function ImportantNoticeModal(props: {
  opened: boolean;
  close: (accepted: boolean) => void;
  setShowAgain: (value: boolean) => void;
  text: string | JSX.Element;
  buttonText: string;
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
        {props.text}
      </p>
      <ValidatedInput
        type="checkbox"
        placeholder="Don't show this warning again"
        onChange={(checked: boolean) => props.setShowAgain(!checked)}
      />
      <BaseButton
        variant="secondary"
        className="sc-button"
        onClick={() => props.close(true)}
      >
        {props.buttonText}
      </BaseButton>
    </GenericModal>
  );
}
