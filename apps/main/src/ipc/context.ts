import type { Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';

export interface IpcContext {
  db: Db;
  paths: AppPaths;
}

export type CreateContext = () => IpcContext;