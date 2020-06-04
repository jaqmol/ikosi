import { CreateContentIndex } from './lib/content-index';
import { CreateContentStorage } from './lib/content-storage';

export interface Ikosi {
    set(key: Buffer|string, value: Buffer|string) : Promise<void>
    get(key: Buffer|string) : Promise<Buffer>
    contains(key: Buffer|string) : boolean
    remove(key: Buffer|string) : Promise<boolean>
}

export async function CreateIkosi(filepath: string) : Promise<Ikosi> {
    const index = await CreateContentIndex(filepath);
    const storage = await CreateContentStorage(filepath, index);

    const set = (key: Buffer|string, value: Buffer|string) : Promise<void> => {
        return storage.set(key, value);
    };
    const get = (key: Buffer|string) : Promise<Buffer> => {
        return storage.get(key);
    };
    const contains = (key: Buffer|string) : boolean => {
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