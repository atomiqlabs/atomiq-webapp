import {useEffect, useState, useContext, useMemo, useCallback} from 'react';
import {
  IntermediateBitcoinWalletBalance,
  IntermediateBitcoinWalletContext,
} from '../context/IntermediateBitcoinWalletContext';
import { SwapperContext } from '../context/SwapperContext';
import { useAsync } from '../hooks/utils/useAsync';
import { useLocalStorage } from '../hooks/utils/useLocalStorage';
import { downloadTextFile } from '../utils/Files';
import {tryWithRetries} from '../utils/Utils';
import {useStateRef} from "../hooks/utils/useStateRef";
import {IntermediateBitcoinWalletBackupModal} from "../components/modals/IntermediateBitcoinWalletBackupModal";
import {IntermediateBitcoinWalletSendModal} from "../components/modals/IntermediateBitcoinWalletSendModal";
import type {SingleAddressBitcoinWallet} from "@atomiqlabs/sdk";

const INTERMEDIATE_BTC_MNEMONIC_KEY =
    'atomiq-intermediate-btc-mnemonic-v1';
const INTERMEDIATE_BTC_BALANCE_POLL_MS = 60_000;

const MAX_BACKUP_FILE_SIZE = 64 * 1024;
const RECOVERY_ERROR = 'Unable to recover intermediate Bitcoin wallet';

export function IntermediateBitcoinWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { swapper } = useContext(SwapperContext);
  const [storedData, setStoredData, storedDataRef] = useLocalStorage<{mnemonic: string, acknowledged?: boolean} | null>(
    INTERMEDIATE_BTC_MNEMONIC_KEY,
    null
  );
  const [balance, setBalance] = useState<IntermediateBitcoinWalletBalance | null>(null);
  const [backupModalOpened, setBackupModalOpened] = useState(false);
  const [sendBitcoinModalOpened, setSendBitcoinModalOpened] = useState(false);

  const [loadOrCreateWallet, providerLoading, wallet, providerError] = useAsync(async (saveNewMnemonic?: string) => {
    if (swapper == null) return;

    const storedMnemonic = saveNewMnemonic ?? storedDataRef.current?.mnemonic;
    let _wallet: SingleAddressBitcoinWallet;
    if(storedMnemonic==null) {
      const {wallet, mnemonic} = await swapper.Utils.generateBitcoinWallet();
      setStoredData({mnemonic, acknowledged: false});
      _wallet = wallet;
    } else {
      _wallet = await swapper.Utils.createBitcoinWalletFromMnemonic(storedMnemonic);
      if(saveNewMnemonic!=null) setStoredData({mnemonic: saveNewMnemonic, acknowledged: true});
    }
    console.log("Generated/restored bitcoin wallet address: ", _wallet.getReceiveAddress());
    return _wallet;
  }, [swapper], true);
  const walletRef = useStateRef(wallet);

  useEffect(() => {
    loadOrCreateWallet();
  }, [swapper]);

  const refreshBalance = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      const balance = await tryWithRetries(
          () => walletRef.current.getBalance(), undefined, undefined, abortSignal
      );
      setBalance(balance);
      return balance;
    } catch (e) {
      console.error("Balance fetch error: ", e);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    if (wallet == null) return;

    let interval: any = null;
    refreshBalance().then(() => {
      if(abortController.signal.aborted) return;
      interval = setInterval(() => {
        refreshBalance(abortController.signal)
      }, INTERMEDIATE_BTC_BALANCE_POLL_MS);
    });

    return () => {
      if(interval) clearInterval(interval);
      abortController.abort();
    };
  }, [wallet, refreshBalance]);

  const recoverMnemonicBackup = useCallback(async (file: File) => {
    if (swapper == null || file.size === 0 || file.size > MAX_BACKUP_FILE_SIZE) throw new Error(RECOVERY_ERROR);

    const content = await file.text();
    const recoveryPhraseLine = content.match(
        /^Recovery phrase:\s*(.+)\s*$/im
    );
    const candidate = (
        recoveryPhraseLine?.[1] ?? content
    ).trim();
    if (candidate.length === 0) throw new Error(RECOVERY_ERROR);

    //Test if it is a valid mnemonic
    await swapper.Utils.createBitcoinWalletFromMnemonic(candidate);

    //Use it for the wallet
    await loadOrCreateWallet(candidate);
  }, [swapper]);

  const downloadMnemonicBackup = useCallback(() => {
    const currentMnemonic = storedDataRef.current?.mnemonic;
    const currentWallet = walletRef.current;
    if (currentMnemonic == null || currentWallet == null) return;

    const currentAddress = currentWallet.getReceiveAddress();
    downloadTextFile(
      'atomiq-intermediate-bitcoin-wallet-backup.txt',
      [
        'Atomiq Intermediate Bitcoin Wallet Backup',
        '',
        'WARNING: Keep this file private. Anyone with the recovery phrase can spend funds held by this wallet.',
        'Losing this recovery phrase may permanently prevent recovery of those funds.',
        '',
        `Bitcoin receiving address: ${currentAddress}`,
        `Recovery phrase: ${currentMnemonic}`,
        '',
      ].join('\n')
    );
  }, []);

  const acknowledgeBackup = useCallback(() => {
    setStoredData({...storedDataRef.current, acknowledged: true});
  }, []);

  const openMnemonicBackupModal = useCallback(() => {
    setBackupModalOpened(true);
  }, []);

  const closeMnemonicBackupModal = useCallback(() => {
    setBackupModalOpened(false);
  }, []);

  const openSendBitcoinModal = useCallback(() => {
    setSendBitcoinModalOpened(true);
  }, []);

  const closeSendBitcoinModal = useCallback(() => {
    setSendBitcoinModalOpened(false);
  }, []);

  const address = wallet?.getReceiveAddress();
  const backupAcknowledged = storedData?.acknowledged ?? false;

  const value = useMemo(
    () => ({
      wallet: wallet ?? undefined,
      address,
      confirmedBalance: wallet==null ? 0n : balance?.confirmedBalance,
      unconfirmedBalance: wallet==null ? 0n : balance?.unconfirmedBalance,
      refreshBalance,
      backupAcknowledged,
      openMnemonicBackupModal,
      openSendBitcoinModal,
      loading: providerLoading,
      error: providerError,
    }),
    [
      wallet,
      address,
      balance,
      refreshBalance,
      backupAcknowledged,
      openMnemonicBackupModal,
      openSendBitcoinModal,
      providerLoading,
      providerError,
    ]
  );

  return (
    <IntermediateBitcoinWalletContext.Provider value={value}>
      {children}
      <IntermediateBitcoinWalletBackupModal
        opened={backupModalOpened}
        close={closeMnemonicBackupModal}
        downloadBackup={downloadMnemonicBackup}
        acknowledgeBackup={acknowledgeBackup}
        available={wallet != null && storedData?.mnemonic != null}
      />
      <IntermediateBitcoinWalletSendModal
        opened={sendBitcoinModalOpened}
        close={closeSendBitcoinModal}
        wallet={wallet ?? undefined}
        refreshBalance={refreshBalance}
      />
    </IntermediateBitcoinWalletContext.Provider>
  );
}
