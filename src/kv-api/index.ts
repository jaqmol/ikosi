import { ContentIndex } from '../content-index';
import { 
    openFileForReading,
    readChunksFromFile, 
    closeFile,
    fileStats,
    appendToFile,
} from '../shared';

export interface KvApi {
    set(key: Buffer|string, value: Buffer|string) : Promise<void>
    get(key: Buffer|string) : Promise<Buffer>
    contains(key: Buffer|string) : boolean
    remove(key: Buffer|string) : Promise<boolean>
}

export async function CreateKvApi(filepath: string, contentIndex: ContentIndex) : Promise<KvApi> {
    const set = async (key: Buffer|string, value: Buffer|string) : Promise<void> => {
        const buffValue = typeof value === 'string' ? Buffer.from(value) : value;
        const offset = await appendValue(filepath, buffValue);
        // TODO: fs.truncate
        await contentIndex.setOffset(key, offset);
    };
    const get = (key: Buffer|string) : Promise<Buffer> => {
        const offset = contentIndex.offset(key);
        return readValue(filepath, offset);
    };
    const contains = (key: Buffer|string) : boolean => {
        return contentIndex.contains(key);
    };
    const remove = (key: Buffer|string) : Promise<boolean> => {
        // TODO: fs.truncate
        return contentIndex.remove(key);
    };
    return {
        set,
        get,
        contains,
        remove,
    };
}

async function readValue(filepath: string, offset: number) : Promise<Buffer> {
    const fd = await openFileForReading(filepath);
    const value = await readChunksFromFile(fd, offset);
    await closeFile(fd);
    return value;
}

async function appendValue(filepath: string, value: Buffer) : Promise<number> {
    const stats = await fileStats(filepath);
    const offset = stats.size;
    await appendToFile(filepath, value);
    return offset;
}