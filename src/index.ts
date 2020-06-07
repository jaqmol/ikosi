import { MakeContentIndex } from './lib/content-index';
import { MakeContentStorage } from './lib/content-storage';
import fs from 'fs';

export interface Ikosi {
    set(key: Buffer|string, value: Buffer|string) : Promise<void>
    get(key: Buffer|string) : Promise<Buffer>
    contains(key: Buffer|string) : Promise<boolean>
    remove(key: Buffer|string) : Promise<boolean>
}

export async function MakeIkosi(
    filepath: string,
    fsOpen = fs.open,
    fsRead = fs.read, 
    fsStat = fs.stat, 
    fsWrite = fs.write, 
    fsClose = fs.close,
    fsTruncate = fs.truncate,
) : Promise<Ikosi> {
    const index = await MakeContentIndex(
        filepath, 
        fsOpen, 
        fsRead, 
        fsStat, 
        fsWrite, 
        fsClose,
    );
    const storage = await MakeContentStorage(
        filepath, 
        index, 
        fsOpen, 
        fsRead, 
        fsStat, 
        fsWrite, 
        fsClose,
        fsTruncate,
    );

    const set = (key: Buffer|string, value: Buffer|string) : Promise<void> => {
        return storage.set(key, value);
    };
    const get = (key: Buffer|string) : Promise<Buffer> => {
        return storage.get(key);
    };
    const contains = (key: Buffer|string) : Promise<boolean> => {
        return index.contains(key);
    };
    const remove = (key: Buffer|string) : Promise<boolean> => {
        return storage.remove(key);
    };
    return {
        set,
        get,
        contains,
        remove,
    };
}