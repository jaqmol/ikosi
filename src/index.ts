import { MakeContentIndex } from './content-index';
import { MakeContentStorage } from './content-storage';
import {
  FSOpenFn,
  FSReadFn,
  FSStatsFn,
  FSWriteFn,
  FSCloseFn,
  FSTruncateFn,
} from './ikfs';
import fs from 'fs';

export interface Ikosi {
  keys() : AsyncGenerator<string, void, unknown>;
  set(key: string, value: Buffer|string): Promise<void>;
  get(key: string): Promise<Buffer|undefined>;
  contains(key: string): Promise<boolean>;
  remove(key: string): Promise<boolean>;
}

export async function MakeIkosi(
  filepath: string,
  fsOpen: FSOpenFn = fs.open,
  fsRead: FSReadFn = fs.read,
  fsStat: FSStatsFn = fs.stat,
  fsWrite: FSWriteFn = fs.write,
  fsClose: FSCloseFn = fs.close,
  fsTruncate: FSTruncateFn = fs.truncate
): Promise<Ikosi> {
  const index = await MakeContentIndex(
    filepath,
    fsOpen,
    fsRead,
    fsStat,
    fsWrite,
    fsClose
  );
  const storage = await MakeContentStorage(
    filepath,
    index,
    fsOpen,
    fsRead,
    fsStat,
    fsWrite,
    fsClose,
    fsTruncate
  );
  
  const keys = () => index.keys();
  const set = (key: string, value: Buffer|string): Promise<void> => {
    return storage.set(key, value);
  };
  const get = (key: string): Promise<Buffer|undefined> => {
    return storage.get(key);
  };
  const contains = (key: string): Promise<boolean> => {
    return index.contains(key);
  };
  const remove = (key: string): Promise<boolean> => {
    return storage.remove(key);
  };
  return {
    keys,
    set,
    get,
    contains,
    remove
  };
}
