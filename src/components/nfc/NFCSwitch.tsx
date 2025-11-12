import { useEffect, useState } from 'react';
import { NFCReader, NFCStartResult } from '../../utils/NFCReader';
import Icon from 'react-icons-kit';
import { Form } from 'react-bootstrap';
import * as React from 'react';

import { ic_contactless } from 'react-icons-kit/md/ic_contactless';

export function NFCSwitch() {
  const [nfcSupported, setNfcSupported] = useState<boolean>(false);
  const [nfcEnabled, setNfcEnabled] = useState<boolean>(true);

  useEffect(() => {
    setNfcSupported(NFCReader.isSupported());
    setNfcEnabled(!NFCReader.isUserDisabled());
  }, []);

  const nfcSet = (val: boolean, target: any) => {
    if (val === true) {
      const reader = new NFCReader();
      reader.start(true).then((resp) => {
        if (resp === NFCStartResult.OK) {
          setNfcEnabled(true);
          target.checked = true;
          reader.stop();
        }
      });
    }
    if (val === false) {
      setNfcEnabled(false);
      target.checked = false;
      NFCReader.userDisable();
    }
  };

  if (nfcSupported)
    return (
      <div className="nav-link d-flex flex-row align-items-center">
        <Icon icon={ic_contactless} className="d-flex me-1" />
        <label title="" htmlFor="nfc" className="form-check-label me-2">
          NFC enable
        </label>
        <Form.Check // prettier-ignore
          id="nfc"
          type="switch"
          onChange={(val) => nfcSet(val.target.checked, val.target)}
          checked={nfcEnabled}
        />
      </div>
    );
  return null;
}
