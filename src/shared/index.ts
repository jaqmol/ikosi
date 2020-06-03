import fs from 'fs';

export interface Span {
    offset: number
    length: number
}

export async function collectSpaces(filepath: string, index: Map<string, number>) : Promise<Span[]> {
    const chunkSpansMap = await collectChunkSpans(filepath, index);
    const chunkKeysAndValues = Array.from<[string, Span[]]>(chunkSpansMap.entries());
    const chunkSpans = chunkKeysAndValues.reduce<Span[]>((acc, [_, spans]) => {
        acc.push(...spans);
        return acc;
    }, []);
    chunkSpans.sort((a, b) => {
        if (a.offset < b.offset) return -1;
        if (a.offset > b.offset) return 1;
        return 0;
    });
    const lastIndex = chunkSpans.length - 1;
    const spaces : Span[] = [];
    for (let i = 0; i < chunkSpans.length; i++) {
        if (i < lastIndex) {
            const a = chunkSpans[i];
            const b = chunkSpans[i + 1];
            const offset = a.offset + a.length;
            const length = b.offset - offset;
            spaces.push({offset, length});
        }
    }
    return spaces;
}

export async function collectChunkSpans(filepath: string, index: Map<string, number>) : Promise<Map<string, Span[]>> {
    const fd = await openFileForReading(filepath);
    const inputKeysAndValues = Array.from<[string, number]>(index.entries());
    const promises = inputKeysAndValues.map<Promise<[string, Span[]]>>(async ([key, offset]) => {
        const spans = await followChunk(fd, offset);
        return [key, spans];
    });
    const outputKeysAndValues = await Promise.all(promises);
    await closeFile(fd);
    return new Map(outputKeysAndValues);
}

export const openFileForReading = (filepath: string) => openFile(filepath, 'r');
export const openFileForWriting = (filepath: string) => openFile(filepath, 'w');

function openFile(filepath: string, mode: string) : Promise<number> {
    return new Promise<number>((resolve, reject) => {
        fs.open(filepath, mode, (err, fd) => {
            if (err) reject(err)
            else resolve(fd)
        });
    });
}

export function closeFile(fd: number) : Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.close(fd, err => {
            if (err) reject(err)
            else resolve()
        });
    });
}

export function fileStats(filepath: string) : Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
        fs.stat(filepath, (err, stats) => {
            if (err) reject(err)
            else resolve(stats)
        });
    });
}

export function readFromFile(fd: number, offset: number, length: number) : Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const b = Buffer.alloc(length);
        fs.read(fd, b, 0, length, offset, (err, _, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
        });
    });
}

export async function readChunksFromFile(fd: number, startOffset: number) : Promise<Buffer> {
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

export async function followChunk(fd: number, startOffset: number) : Promise<Span[]> {
    const promises : Array<Promise<Span>> = [];
    
    const readNext = async (offset: number) : Promise<Span> => {
        const lengthBuffer = await readFromFile(fd, offset, 20);
        const length = Number.parseInt(lengthBuffer.toString());
        const nextOffsetPosition = offset + length - 20;
        const nextOffsetBuffer = await readFromFile(fd, nextOffsetPosition, 20);
        const nextOffset = Number.parseInt(nextOffsetBuffer.toString());
        if (nextOffset) promises.push(readNext(nextOffset));
        return {offset, length};
    };
    promises.push(readNext(startOffset));
    
    return Promise.all(promises);
}

export function writeToFile(fd: number, offset: number, buffer: Buffer) : Promise<number> {
    return new Promise<number>((resolve, reject) => {
        fs.write(fd, buffer, 0, buffer.length, offset, (err, bytesWritten) => {
            if (err) reject(err);
            else resolve(bytesWritten);
        });
    });
}

export function appendToFile(filepath: string, buffer: Buffer) : Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.appendFile(filepath, buffer, err => {
            if (err) reject(err);
            else resolve();
        });
    });
}