import {
    Span,
    findEmptySpaces,
    readChunksFromFile,
    yieldContentSpans,
    writeToEmptySpaces,
} from './shared';
import * as ikfs from './ikfs';

export interface ContentIndex {
    offset(key: Buffer|string) : Promise<number>
    setOffset(key: Buffer|string, offset: number) : Promise<void>
    contains(key: Buffer|string) : Promise<boolean>
    remove(key: Buffer|string) : Promise<boolean>
    spaces() : Promise<Array<Span>>
    spans() : Promise<Array<Span>>
}

export async function CreateContentIndex(filepath: string) : Promise<ContentIndex> {
    const index = await readIndex(filepath);
    let freeSpaces : Span[]|null = null;
    const offset = async (key: Buffer|string) : Promise<number> => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        return index.get(keyStr);
    };
    const setOffset = async (key: Buffer|string, offset: number) : Promise<void> => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        index.set(keyStr, offset);
        freeSpaces = null;
        await writeIndex(filepath, index, await spaces());
    };
    const contains = async (key: Buffer|string) : Promise<boolean> => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        return index.has(keyStr);
    };
    const remove = async (key: Buffer|string) : Promise<boolean> => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        const done = index.delete(keyStr);
        freeSpaces = null;
        await writeIndex(filepath, index, await spaces());
        return done;
    };
    const spaces = async () : Promise<Array<Span>> => {
        if (freeSpaces) return freeSpaces;
        freeSpaces = await findEmptySpaces(filepath, index);
        return freeSpaces;
    };
    const spans = async () : Promise<Array<Span>> => {
        const spans : Span[] = [];
        for await (const span of yieldContentSpans(filepath, index.values())) {
            spans.push(span);
        }
        return spans;
    };
    return {
        offset,
        setOffset,
        contains,
        remove,
        spaces,
        spans,
    };
}

async function readIndex(filepath: string) : Promise<Map<string, number>> {
    const fd = await ikfs.openForReading(filepath);
    const indexBuffer = await readChunksFromFile(fd, 0);
    const indexString = indexBuffer.toString();
    await ikfs.close(fd);
    return new Map<string, number>(JSON.parse(indexString));
}

async function writeIndex(filepath: string, index: Map<string, number>, emptySpaces: Span[]) : Promise<void> {
    const keysAndValues = [...index];
    let buffer = Buffer.from(JSON.stringify(keysAndValues));
    const offset = await writeToEmptySpaces(filepath, buffer, emptySpaces);
    const offsetStr = `${offset}`.padStart(20, '0');
    buffer = Buffer.from(offsetStr);
    const fd = await ikfs.openForWriting(filepath);
    await ikfs.write(fd, buffer, {offset: 0, length: buffer.length}, 0);
    await ikfs.close(fd);
}