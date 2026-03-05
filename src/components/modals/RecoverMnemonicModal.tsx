import * as React from 'react';
import {useCallback, useContext, useRef, useState} from "react";
import { GenericModal } from '../common/GenericModal';
import { BaseButton } from '../common/BaseButton';
import {BitcoinWebWalletContext} from "../../context/BitcoinWebWalletContext";
import {SwapStepAlert} from "../swaps/SwapStepAlert";
import {ic_warning} from "react-icons-kit/md/ic_warning";

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function RecoverMnemonicModal(props: {
  opened: boolean;
  close: (recovered: boolean) => void;
}) {
  const bitcoinWebWalletContext = useContext(BitcoinWebWalletContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<any>(null);

  const downloadCurrentRecoveryPhrase = useCallback(() => {
    const mnemonicPhrase = bitcoinWebWalletContext?.getMnemonicPhrase();
    if (mnemonicPhrase == null || mnemonicPhrase.trim().length === 0) return;
    downloadTextFile("atomiq-recovery-DO-NOT-DELETE-OLD.txt", mnemonicPhrase);
  }, [bitcoinWebWalletContext]);

  const importRecoveryPhrase = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    try {
      const file = e.target.files?.[0];
      if (file == null) return;
      if (!file.name.toLowerCase().endsWith(".txt")) {
        throw new Error("Please select a .txt file containing your recovery phrase.");
      }

      const content = await file.text();
      const mnemonicPhrase = content.trim().replace(/\s+/g, " ");
      if (mnemonicPhrase.length === 0) {
        throw new Error("The selected file is empty.");
      }

      bitcoinWebWalletContext.recoverWallet(mnemonicPhrase);
      e.target.value = "";
      props.close(true);
    } catch (err) {
      setError(err);
      e.target.value = "";
    }
  }, [bitcoinWebWalletContext, props]);

  return (
    <GenericModal
      visible={props.opened}
      size="sm"
      type="warning"
      icon="Notice"
      onClose={() => props.close(false)}
      title="Recover via recovery file"
      enableClose={true}
      enableCloseFromOverlay={false}
    >
      {error != null && (
        <SwapStepAlert
          className="w-100"
          show={true}
          type="error"
          icon={ic_warning}
          title="Recovery phrase import error"
          error={error}
        />
      )}
      <p className="sc-text">
        Importing recovery file will overwrite your current one. If you continue without backing it up,
        your old recovery file may be permanently lost, with all the funds in it.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        style={{ display: "none" }}
        onChange={importRecoveryPhrase}
      />
      <div className="w-100 d-flex flex-column gap-2">
        <BaseButton variant="secondary" onClick={downloadCurrentRecoveryPhrase}>
          Download current recovery file
        </BaseButton>
        <BaseButton variant="danger" onClick={() => fileInputRef.current?.click()}>
          Continue and import recovery file
        </BaseButton>
      </div>
    </GenericModal>
  );
}
