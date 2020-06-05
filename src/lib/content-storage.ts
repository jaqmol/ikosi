import { ContentIndex } from './content-index';
import { 
    readChunksFromFile,
    writeToEmptySpaces,
} from './shared';
import * as ikfs from './ikfs';

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
    const get = async (key: Buffer|string) : Promise<Buffer> => {
        const offset = await contentIndex.offset(key);
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
    const fd = await ikfs.openForReading(filepath);
    const value = await readChunksFromFile(fd, offset);
    await ikfs.close(fd);
    return value;
}

async function writeValue(filepath: string, contentIndex: ContentIndex, value: Buffer) : Promise<number> {
    const emptySpaces = await contentIndex.spaces();
    return writeToEmptySpaces(filepath, value, emptySpaces);
}

async function truncate(filepath: string, contentIndex: ContentIndex) : Promise<void> {
    const fileEndIndex = await ikfs.size(filepath);
    const spans = await contentIndex.spans();
    const dataEndIndex = spans.reduce<number>((endIndex, s) => {
        const sEndIdx = s.offset + s.length;
        return sEndIdx > endIndex ? sEndIdx : endIndex;
    }, -1);
    if ((dataEndIndex > 20) && (fileEndIndex > dataEndIndex)) {
        await ikfs.truncate(filepath, dataEndIndex);
    }
}
