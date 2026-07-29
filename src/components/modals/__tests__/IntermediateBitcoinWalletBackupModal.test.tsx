import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntermediateBitcoinWalletBackupModal } from '../IntermediateBitcoinWalletBackupModal';

describe('IntermediateBitcoinWalletBackupModal', () => {
  it('requires a download and explicit confirmation before acknowledging the backup', async () => {
    const downloadBackup = vi.fn();
    const acknowledgeBackup = vi.fn();
    const close = vi.fn();

    render(
      <IntermediateBitcoinWalletBackupModal
        opened={true}
        close={close}
        downloadBackup={downloadBackup}
        acknowledgeBackup={acknowledgeBackup}
        available={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }));
    expect(downloadBackup).toHaveBeenCalledTimes(1);
    expect(acknowledgeBackup).not.toHaveBeenCalled();

    const confirmButton = screen.getByRole('button', { name: 'Confirm backup' });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('I downloaded and safely stored the backup file'));
    expect((confirmButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(confirmButton);
    expect(acknowledgeBackup).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('resets its steps after the mounted modal is closed', () => {
    const props = {
      close: vi.fn(),
      downloadBackup: vi.fn(),
      acknowledgeBackup: vi.fn(),
      available: true,
    };
    const { rerender } = render(<IntermediateBitcoinWalletBackupModal opened={true} {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }));
    expect(screen.queryByRole('button', { name: 'Download backup' })).toBeNull();

    rerender(<IntermediateBitcoinWalletBackupModal opened={false} {...props} />);
    rerender(<IntermediateBitcoinWalletBackupModal opened={true} {...props} />);

    expect(screen.getByRole('button', { name: 'Download backup' })).not.toBeNull();
  });

  it('does not allow downloading while the wallet is unavailable', () => {
    render(
      <IntermediateBitcoinWalletBackupModal
        opened={true}
        close={vi.fn()}
        downloadBackup={vi.fn()}
        acknowledgeBackup={vi.fn()}
        available={false}
      />
    );

    expect(
      (
        screen.getByRole('button', {
          name: 'Download backup',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });
});
