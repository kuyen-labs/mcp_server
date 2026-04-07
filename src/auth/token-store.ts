import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { StoredTokens } from './types.js';

const DIR_NAME = '.fuul';
const FILE_NAME = 'tokens.json';

function tokenFilePath(): string {
  return join(homedir(), DIR_NAME, FILE_NAME);
}

export class TokenStore {
  async read(): Promise<StoredTokens | null> {
    try {
      const raw = await readFile(tokenFilePath(), 'utf8');
      const data = JSON.parse(raw) as StoredTokens;
      if (!data.access_token || !data.refresh_token || typeof data.expires_at_ms !== 'number') {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  async write(tokens: StoredTokens): Promise<void> {
    const dir = join(homedir(), DIR_NAME);
    await mkdir(dir, { recursive: true });
    const path = tokenFilePath();
    await writeFile(path, `${JSON.stringify(tokens, null, 2)}\n`, 'utf8');
    try {
      await chmod(path, 0o600);
    } catch {
      // Windows may ignore mode; ignore errors.
    }
  }

  async clear(): Promise<void> {
    try {
      await unlink(tokenFilePath());
    } catch {
      // ignore if missing
    }
  }
}
