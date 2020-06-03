import fs from 'fs';

export interface ContentIndex {
    flush() : Promise<void>
    offset(key: Buffer|string) : number
    setOffset(key: Buffer|string, offset: number) : void
    remove(key: Buffer|string) : boolean
    spaces() : Promise<Array<Span>>
}

export interface Span {
    offset: number
    length: number
}

export async function CreateContentIndex(filepath: string) : Promise<ContentIndex> {
    const index = await readIndex(filepath);
    let spacesIndex :Array<Span>;

    const flush = async () : Promise<void> => {
        await writeIndex(filepath, index);
    };
    const offset = (key: Buffer|string) : number => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        return index.get(keyStr);
    };
    const setOffset = (key: Buffer|string, offset: number) => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        index.set(keyStr, offset);
    };
    const remove = (key: Buffer|string) : boolean => {
        const keyStr = key instanceof Buffer ? key.toString('base64') : key;
        return index.delete(keyStr);
    };
    const spaces = async () : Promise<Array<Span>> => {
        if (spacesIndex) return spacesIndex;

    };

    return {
        flush,
        offset,
        setOffset,
        remove,
        spaces,
    };
}


async function readIndex(filepath: string) : Promise<Map<string, number>> {
    const fd = await openFile(filepath);
    const offsetBuffer = await readFromFile(fd, 0, 20);
    const offset = Number.parseInt(offsetBuffer.toString());
    const indexBuffer = await readChunksFromFile(fd, offset);
    const indexString = indexBuffer.toString();
    return new Map<string, number>(JSON.parse(indexString));
}

async function writeIndex(filepath: string, index: Map<string, number>) : Promise<void> {
    const fd = await openFile(filepath);
    const keysAndValues = [...index];
    const buffer = Buffer.from(JSON.stringify(keysAndValues));
    const bytesWritten = await writeToFile(fd, 0, buffer);
    if (bytesWritten !== buffer.length) throw new Error(`${bytesWritten}/${buffer.length} bytes written of ContentIndex`);
}

function openFile(filepath: string) : Promise<number> {
    return new Promise<number>((resolve, reject) => {
        fs.open(filepath, 'r', (err, fd) => {
            if (err) reject(err)
            else resolve(fd)
        });
    });
}

function readFromFile(fd: number, offset: number, length: number) : Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const b = Buffer.alloc(length);
        fs.read(fd, b, 0, length, offset, (err, _, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
        });
    });
}

async function readChunksFromFile(fd: number, startOffset: number) : Promise<Buffer> {
    const promises : Array<Promise<Buffer>> = [];
    
    const readNext = async (offset: number) : Promise<Buffer> => {
        const lengthBuffer = await readFromFile(fd, offset, 20);
        const length = Number.parseInt(lengthBuffer.toString());
        const chunkOffset = offset + 20;
        const chunkLength = length - 40;
        const chunk = await readFromFile(fd, chunkOffset, chunkLength);
        const nextOffsetPosition = offset + length - 20;
        const nextOffsetBuffer = await readFromFile(fd, nextOffsetPosition, 20);
        const nextOffset = Number.parseInt(nextOffsetBuffer.toString());
        if (nextOffset) promises.push(readNext(nextOffset));
        return chunk;
    };
    promises.push(readNext(startOffset));
    
    const buffers = await Promise.all(promises);
    return Buffer.concat(buffers);
}

async function collectChunkSpans(fd: number, index: Map<string, number>) : Promise<Array<Span>> {
    const promises : Array<Promise<Span>> = [];
    
    const readNext = async (offset: number) : Promise<number> => {
        const lengthBuffer = await readFromFile(fd, offset, 20);
        const length = Number.parseInt(lengthBuffer.toString());
        const chunkOffset = offset + 20;
        // const chunkLength = length - 40;
        // const chunk = await readFromFile(fd, chunkOffset, chunkLength);
        const nextOffsetPosition = offset + length - 20;
        const nextOffsetBuffer = await readFromFile(fd, nextOffsetPosition, 20);
        const nextOffset = Number.parseInt(nextOffsetBuffer.toString());
        if (nextOffset) promises.push(readNext(nextOffset));
        return chunk;
    };
    promises.push(readNext(startOffset));
    
    return await Promise.all(promises);
}

function writeToFile(fd: number, offset: number, buffer: Buffer) : Promise<number> {
    return new Promise<number>((resolve, reject) => {
        fs.write(fd, buffer, 0, buffer.length, offset, (err, bytesWritten) => {
            if (err) reject(err);
            else resolve(bytesWritten);
        });
    });
}