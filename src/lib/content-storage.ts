import { ContentIndex } from './content-index';
import { 
    openFileForReading,
    readChunksFromFile, 
    writeChunkedValueToFile,
    closeFile,
    fileStats,
    truncateFile,
} from './shared';

export interface ContentStorage {
    set(key: Buffer|string, value: Buffer|string) : Promise<void>
    get(key: Buffer|string) : Promise<Buffer>
    remove(key: Buffer|string) : Promise<boolean>
}

export async function CreateContentStorage(filepath: string, contentIndex: ContentIndex) : Promise<ContentStorage> {
    const set = async (key: Buffer|string, value: Buffer|string) : Promise<void> => {
        const buffValue = typeof value === 'string' ? Buffer.from(value) : value;
        const offset = await writeValue(filepath, contentIndex, buffValue);
        await contentIndex.setOffset(key, offset);
        await truncate(filepath, contentIndex);
    };
    const get = (key: Buffer|string) : Promise<Buffer> => {
        const offset = contentIndex.offset(key);
        return readValue(filepath, offset);
    };
    const remove = async (key: Buffer|string) : Promise<boolean> => {
        const done = await contentIndex.remove(key);
        await truncate(filepath, contentIndex);
        return done;
    };
    return {
        set,
        get,
        remove,
    };
}

async function readValue(filepath: string, offset: number) : Promise<Buffer> {
    const fd = await openFileForReading(filepath);
    const value = await readChunksFromFile(fd, offset);
    await closeFile(fd);
    return value;
}

async function writeValue(filepath: string, contentIndex: ContentIndex, value: Buffer) : Promise<number> {
    const spaces = await contentIndex.spaces();
    return writeChunkedValueToFile(filepath, spaces, value);
}

async function truncate(filepath: string, contentIndex: ContentIndex) : Promise<void> {
    const stats = await fileStats(filepath);
    const fileEndIndex = stats.size;
    const spans = await contentIndex.spans();
    const dataEndIndex = spans.reduce<number>((endIndex, s) => {
        const sEndIdx = s.offset + s.length;
        return sEndIdx > endIndex ? sEndIdx : endIndex;
    }, -1);
    if ((dataEndIndex > 20) && (fileEndIndex > dataEndIndex)) {
        await truncateFile(filepath, dataEndIndex);
    }
}
