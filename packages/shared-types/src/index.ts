export interface AppInfo {
  name: 'Tickitt';
  version: string;
  electron: string;
  node: string;
  chrome: string;
  platform: NodeJS.Platform;
  arch: string;
  userDataPath: string;
  workspacePath: string;
  dbPath: string;
}

export interface KeychainProbeResult {
  ok: boolean;
  error?: string;
}