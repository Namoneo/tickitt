import fs from 'node:fs/promises';
import path from 'node:path';
import { git } from './git-helpers.js';

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export interface DiffFile {
  path: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  isBinary: boolean;
  isUntracked: boolean;
  oldPath: string | undefined;
}

export interface DiffSummary {
  base: string;
  worktreePath: string;
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface FileDiffResult {
  path: string;
  oldPath: string | undefined;
  status: FileStatus;
  isBinary: boolean;
  isUntracked: boolean;
  patch: string | null;
  truncated: boolean;
  bytes: number;
}

const PATCH_BYTE_CAP = 500 * 1024;
const UNTRACKED_BYTE_CAP = 100 * 1024;

export class DiffService {
  async summary(worktreePath: string, baseRef: string): Promise<DiffSummary> {
    const g = git(worktreePath);

    // Diff working tree against baseRef — captures committed + staged + unstaged changes.
    const numstat = await g.raw(['diff', '--numstat', '-M', baseRef]);
    const nameStatus = await g.raw(['diff', '--name-status', '-M', baseRef]);
    const tracked = mergeNumstatAndStatus(numstat, nameStatus);

    // Untracked: list, then read sizes and pretend they're "added" with no deletions
    const untrackedRaw = await g.raw(['ls-files', '--others', '--exclude-standard']);
    const untracked = untrackedRaw.split('\n').map((l) => l.trim()).filter(Boolean);
    const untrackedFiles: DiffFile[] = [];
    for (const p of untracked) {
      const abs = path.join(worktreePath, p);
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat) continue;
      const isBinary = await isBinaryFile(abs);
      let additions = 0;
      if (!isBinary) {
        const content = await fs.readFile(abs, 'utf8').catch(() => '');
        additions = content.length === 0 ? 0 : content.split('\n').length;
      }
      untrackedFiles.push({
        path: p,
        status: 'added',
        additions,
        deletions: 0,
        isBinary,
        isUntracked: true,
        oldPath: undefined,
      });
    }

    const files = [...tracked, ...untrackedFiles];
    return {
      base: baseRef,
      worktreePath,
      files,
      totalAdditions: files.reduce((n, f) => n + f.additions, 0),
      totalDeletions: files.reduce((n, f) => n + f.deletions, 0),
    };
  }

  async fileDiff(worktreePath: string, baseRef: string, filePath: string): Promise<FileDiffResult> {
    const g = git(worktreePath);

    // Determine status first
    const nameStatus = await g.raw(['diff', '--name-status', '-M', baseRef, '--', filePath]);
    const tracked = parseNameStatus(nameStatus);
    const trackedHit = tracked.find(
      (t) => t.path === filePath || t.oldPath === filePath,
    );

    if (trackedHit) {
      const numstat = await g.raw(['diff', '--numstat', '-M', baseRef, '--', filePath]);
      const isBinary = numstat.trim().startsWith('-\t-\t');
      if (isBinary) {
        return {
          path: trackedHit.path,
          oldPath: trackedHit.oldPath,
          status: trackedHit.status,
          isBinary: true,
          isUntracked: false,
          patch: null,
          truncated: false,
          bytes: 0,
        };
      }
      const patch = await g.raw(['diff', '-M', baseRef, '--', filePath]);
      const bytes = Buffer.byteLength(patch, 'utf8');
      const truncated = bytes > PATCH_BYTE_CAP;
      return {
        path: trackedHit.path,
        oldPath: trackedHit.oldPath,
        status: trackedHit.status,
        isBinary: false,
        isUntracked: false,
        patch: truncated ? null : patch,
        truncated,
        bytes,
      };
    }

    // Otherwise treat as untracked
    const abs = path.join(worktreePath, filePath);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat) throw new Error(`File not found: ${filePath}`);
    const isBinary = await isBinaryFile(abs);
    const bytes = stat.size;
    if (isBinary) {
      return {
        path: filePath, status: 'added', isBinary: true, isUntracked: true,
        patch: null, truncated: false, bytes,
        oldPath: undefined,
      };
    }
    if (bytes > UNTRACKED_BYTE_CAP) {
      return {
        path: filePath, status: 'added', isBinary: false, isUntracked: true,
        patch: null, truncated: true, bytes,
        oldPath: undefined,
      };
    }
    const content = await fs.readFile(abs, 'utf8');
    const patch = synthesiseAddedFilePatch(filePath, content);
    return {
      path: filePath, status: 'added', isBinary: false, isUntracked: true,
      patch, truncated: false, bytes,
      oldPath: undefined,
    };
  }
}

// ---------- helpers (file-private) ----------
interface NameStatusRow { status: FileStatus; path: string; oldPath: string | undefined }

function parseNameStatus(raw: string): NameStatusRow[] {
  const rows: NameStatusRow[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const code = parts[0]!;
    if (code.startsWith('R')) {
      rows.push({ status: 'renamed', oldPath: parts[1]!, path: parts[2]! });
    } else if (code === 'A') rows.push({ status: 'added', path: parts[1]!, oldPath: undefined });
    else if (code === 'M') rows.push({ status: 'modified', path: parts[1]!, oldPath: undefined });
    else if (code === 'D') rows.push({ status: 'deleted', path: parts[1]!, oldPath: undefined });
  }
  return rows;
}

function mergeNumstatAndStatus(numstatRaw: string, nameStatusRaw: string): DiffFile[] {
  const stats = new Map<string, { add: number; del: number; binary: boolean }>();
  for (const line of numstatRaw.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const a = parts[0]!;
    const d = parts[1]!;
    const binary = a === '-' && d === '-';
    const entry = {
      add: binary ? 0 : parseInt(a, 10) || 0,
      del: binary ? 0 : parseInt(d, 10) || 0,
      binary,
    };
    if (parts.length >= 4) {
      // Rename with separate old/new path columns — index both so either lookup hits.
      stats.set(parts[2]!, entry);
      stats.set(parts[3]!, entry);
    } else if (parts[2]) {
      stats.set(parts[2], entry);
    }
  }

  const status = parseNameStatus(nameStatusRaw);
  return status.map((s) => {
    const stat =
      stats.get(s.path) ??
      (s.oldPath ? stats.get(s.oldPath) : undefined) ??
      { add: 0, del: 0, binary: false };
    return {
      path: s.path,
      status: s.status,
      additions: stat.add,
      deletions: stat.del,
      isBinary: stat.binary,
      isUntracked: false,
      oldPath: s.oldPath,
    };
  });
}

async function isBinaryFile(absPath: string): Promise<boolean> {
  try {
    const fh = await fs.open(absPath, 'r');
    try {
      const buf = Buffer.alloc(8192);
      const { bytesRead } = await fh.read(buf, 0, 8192, 0);
      for (let i = 0; i < bytesRead; i++) if (buf[i] === 0) return true;
      return false;
    } finally {
      await fh.close();
    }
  } catch {
    return false;
  }
}

function synthesiseAddedFilePatch(filePath: string, content: string): string {
  // Trim the trailing empty string produced when content ends with '\n' so the
  // hunk header line count matches what git would actually produce.
  const raw = content.split('\n');
  const lines = raw.at(-1) === '' ? raw.slice(0, -1) : raw;
  const header =
`diff --git a/${filePath} b/${filePath}
new file mode 100644
--- /dev/null
+++ b/${filePath}
@@ -0,0 +1,${lines.length} @@
`;
  return header + lines.map((l) => `+${l}`).join('\n') + '\n';
}
