import {
    Span,
    collectSpaces,
    collectFlatSpans,
    openFileForReading,
    readFromFile,
    readChunksFromFile,
    closeFile,
    writeChunkedValueToFile,
    openFileForWriting,
    writeToFile,
} from '../shared';

export interface ContentIndex {
    offset(key: Buffer|string) : number
    setOffset(key: Buffer|string, offset: number) : void
    contains(key: Buffer|string) : boolean
    remove(key: Buffer|string) : Promise<boolean>
    spaces() : Promise<Array<Span>>
    spans() : Promise<Array<Span>>
}

export async function CreateContentIndex(filepath: string) : Promise<ContentIndex> {
    const index = await readIndex(filepath);
    let freeSpaces : Span[]|null = null;

    const offset = (key: Buffer|string) : number => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        return index.get(keyStr);
    };
    const setOffset = async (key: Buffer|string, offset: number) : Promise<void> => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        index.set(keyStr, offset);
        freeSpaces = null;
        const sps = await spaces();
        await writeIndex(filepath, index, sps);
    };
    const contains = (key: Buffer|string) : boolean => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        return index.has(keyStr);
    };
    const remove = async (key: Buffer|string) : Promise<boolean> => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        const done = index.delete(keyStr);
        freeSpaces = null;
        const sps = await spaces();
        await writeIndex(filepath, index, sps);
        return done;
    };
    const spaces = async () : Promise<Array<Span>> => {
        if (freeSpaces) return freeSpaces;
        freeSpaces = await collectSpaces(filepath, index);
        return freeSpaces;
    };
    const spans = () : Promise<Array<Span>> => {
        return collectFlatSpans(filepath, index);
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
    const fd = await openFileForReading(filepath);
    const offsetBuffer = await readFromFile(fd, 0, 20);
    const offset = Number.parseInt(offsetBuffer.toString());
    const indexBuffer = await readChunksFromFile(fd, offset);
    const indexString = indexBuffer.toString();
    await closeFile(fd);
    return new Map<string, number>(JSON.parse(indexString));
}

async function writeIndex(filepath: string, index: Map<string, number>, spaces: Span[]) : Promise<void> {
    const keysAndValues = [...index];
    const buffer = Buffer.from(JSON.stringify(keysAndValues));
    const offset = await writeChunkedValueToFile(filepath, spaces, buffer);
    const offsetStr = `${offset}`.padStart(20, '0');
    const fd = await openFileForWriting(filepath);
    await writeToFile(fd, 0, Buffer.from(offsetStr));
    await closeFile(fd);
}