import keytar from 'keytar';

const SERVICE = 'com.sherzod.tickitt';

export const Keychain = {
  async set(account: string, secret: string): Promise<void> {
    await keytar.setPassword(SERVICE, account, secret);
  },
  async get(account: string): Promise<string | null> {
    return keytar.getPassword(SERVICE, account);
  },
  async delete(account: string): Promise<boolean> {
    return keytar.deletePassword(SERVICE, account);
  },
  async probe(): Promise<{ ok: boolean; error?: string }> {
    const probeAccount = '__tickitt_probe__';
    const probeValue = `probe-${Date.now()}`;
    try {
      await keytar.setPassword(SERVICE, probeAccount, probeValue);
      const got = await keytar.getPassword(SERVICE, probeAccount);
      await keytar.deletePassword(SERVICE, probeAccount);
      return { ok: got === probeValue };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};