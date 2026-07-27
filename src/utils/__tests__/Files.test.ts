import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile } from '../Files';

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('downloadTextFile', () => {
  it('downloads a UTF-8 text blob and revokes its object URL', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadTextFile('backup.txt', 'secret text');

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(await readBlob(blob)).toBe('secret text');
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.href).toBe('blob:download');
    expect(anchor.download).toBe('backup.txt');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');
  });
});
