import { ContentIndex } from './content-index';
import { 
    readChunksFromFile,
    writeToEmptySpaces,
    findFittingSpaces,
    Span,
} from './shared';
import * as ikfs from './ikfs';

export interface ContentStorage {
    set(key: Buffer|string, value: Buffer|string) : Promise<void>
    get(key: Buffer|string) : Promise<Buffer>
    remove(key: Buffer|string) : Promise<boolean>
}

export async function CreateContentStorage(filepath: string, contentIndex: ContentIndex) : Promise<ContentStorage> {
    const set = async (key: Buffer|string, value: Buffer|string) : Promise<void> => {
        const buffer = typeof value === 'string' ? Buffer.from(value) : value;
        const emptySpaces = await contentIndex.spaces();
        const offset = await writeValue(filepath, buffer, emptySpaces);
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

async function writeValue(filepath: string, buffer: Buffer, emptySpaces: Span[]) : Promise<number> {
    const fittingSpaces = findFittingSpaces(buffer.length, emptySpaces);
    return writeToEmptySpaces(filepath, buffer, fittingSpaces);
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
