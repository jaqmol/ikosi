import {
    Span,
    FindEmptySpacesFn,
    ReadChunksFromFileFn,
    YieldContentSpansFn,
    WriteToEmptySpacesFn,
    FindFittingSpacesFn,
} from './shared';
import {
    OpenForReadingFn,
    OpenForWritingFn,
    CloseFn,
    WriteFn,
    FSOpenFn,
    FSReadFn,
    FSStatsFn,
    FSWriteFn,
    FSCloseFn,
} from './ikfs';

export interface ContentIndex {
    offset(key: Buffer|string) : Promise<number>
    setOffset(key: Buffer|string, offset: number) : Promise<void>
    contains(key: Buffer|string) : Promise<boolean>
    remove(key: Buffer|string) : Promise<boolean>
    spaces() : Promise<Array<Span>>
    spans() : Promise<Array<Span>>
}

export async function CreateContentIndex(
    filepath: string,
    fsOpen: FSOpenFn,
    fsRead: FSReadFn, 
    fsStats: FSStatsFn,
    fsWrite: FSWriteFn, 
    fsClose: FSCloseFn,
) : Promise<ContentIndex> {
    const readIndex = ReadIndexFn(fsOpen, fsRead, fsWrite, fsClose);
    const writeIndex = WriteIndexFn(fsOpen, fsRead, fsStats, fsWrite, fsClose);
    const findEmptySpaces = FindEmptySpacesFn(fsOpen, fsRead, fsWrite, fsClose);
    const yieldContentSpans = YieldContentSpansFn(fsOpen, fsRead, fsWrite, fsClose);
    
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

const ReadIndexFn = (
    fsOpen: FSOpenFn, 
    fsRead: FSReadFn, 
    fsWrite: FSWriteFn, 
    fsClose: FSCloseFn,
) => {
    const openForReadingFn = OpenForReadingFn(fsOpen);
    const readChunksFromFile = ReadChunksFromFileFn(fsRead, fsWrite);
    const closeFn = CloseFn(fsClose);

    return async (filepath: string) : Promise<Map<string, number>> => {
        const fd = await openForReadingFn(filepath);
        const indexBuffer = await readChunksFromFile(fd, 0);
        const indexString = indexBuffer.toString();
        await closeFn(fd);
        return new Map<string, number>(JSON.parse(indexString));
    };
};

const WriteIndexFn = (
    fsOpen: FSOpenFn, 
    fsRead: FSReadFn, 
    fsStats: FSStatsFn,
    fsWrite: FSWriteFn, 
    fsClose: FSCloseFn
) => {
    const openForWritingFn = OpenForWritingFn(fsOpen);
    const findFittingSpaces = FindFittingSpacesFn(fsRead, fsWrite);
    const writeToEmptySpaces = WriteToEmptySpacesFn(fsOpen, fsRead, fsStats, fsWrite, fsClose);
    const writeFn = WriteFn(fsWrite);
    const closeFn = CloseFn(fsClose);

    return async (filepath: string, index: Map<string, number>, emptySpaces: Span[]) : Promise<void> => {
        const keysAndValues = [...index];
        let buffer = Buffer.from(JSON.stringify(keysAndValues));
        const fittingSpaces = findFittingSpaces(buffer.length, emptySpaces);
        const offset = await writeToEmptySpaces(filepath, buffer, fittingSpaces);
        const offsetStr = `${offset}`.padStart(20, '0');
        buffer = Buffer.from(offsetStr);
        const fd = await openForWritingFn(filepath);
        await writeFn(fd, buffer, {offset: 0, length: buffer.length}, 0);
        await closeFn(fd);
    };
};