import fs from 'fs';

export interface Span {
    offset: number
    length: number
}

// export async function collectSpaces(filepath: string, index: Map<string, number>) : Promise<Span[]> {
//     const chunkSpansMap = await collectChunkSpans(filepath, index);
//     const chunkKeysAndValues = Array.from<[string, Span[]]>(chunkSpansMap.entries());
//     const chunkSpans = chunkKeysAndValues.reduce<Span[]>((acc, [_, spans]) => {
//         acc.push(...spans);
//         return acc;
//     }, []);
//     chunkSpans.sort((a, b) => {
//         if (a.offset < b.offset) return -1;
//         if (a.offset > b.offset) return 1;
//         return 0;
//     });
//     const lastIndex = chunkSpans.length - 1;
//     const spaces : Span[] = [];
//     for (let i = 0; i < chunkSpans.length; i++) {
//         if (i < lastIndex) {
//             const a = chunkSpans[i];
//             const b = chunkSpans[i + 1];
//             const offset = a.offset + a.length;
//             const length = b.offset - offset;
//             spaces.push({offset, length});
//         }
//     }
//     return spaces;
// }

export async function collectSpaces(filepath: string, index: Map<string, number>) : Promise<Span[]> {
    const spans = await collectFlatSpans(filepath, index);
    const lastIndex = spans.length - 1;
    const spaces : Span[] = [];
    for (let i = 0; i < spans.length; i++) {
        if (i < lastIndex) {
            const a = spans[i];
            const b = spans[i + 1];
            const offset = a.offset + a.length;
            const length = b.offset - offset;
            spaces.push({offset, length});
        }
    }
    return spaces;
}

// export async function collectChunkSpans(filepath: string, index: Map<string, number>) : Promise<Map<string, Span[]>> {
//     const fd = await openFileForReading(filepath);
//     const inputKeysAndValues = Array.from<[string, number]>(index.entries());
//     const promises = inputKeysAndValues.map<Promise<[string, Span[]]>>(async ([key, offset]) => {
//         const spans = await followChunk(fd, offset);
//         return [key, spans];
//     });
//     const outputKeysAndValues = await Promise.all(promises);
//     await closeFile(fd);
//     return new Map(outputKeysAndValues);
// }

export async function collectSpans(filepath: string, startOffsets: number[]) : Promise<Span[][]> {
    const fd = await openFileForReading(filepath);
    const promises = startOffsets.map<Promise<Span[]>>(async offset => followChunk(fd, offset));
    await closeFile(fd);
    return Promise.all(promises);
}

export async function collectFlatSpans(filepath: string, index: Map<string, number>) : Promise<Span[]> {
    const chunkSpans = await collectSpans(filepath, Array.from<number>(index.values()));
    const spans = chunkSpans.reduce<Span[]>((acc, s) => {
        acc.push(...s);
        return acc;
    }, []);
    return spans;
}

export function findSpaces(bufferLength: number, inputSpaces: Span[]) : Span[] {
    const spaces = [...inputSpaces];
    let bufferIndex = 0;
    const fittingSpaceIndex = (requiredLength: number) => {
        let divergence = -1;
        let absDivergence = -1;
        let index = -1;
        for (let i = 0; i < spaces.length; i++) {
            const s = spaces[i];
            if (i === 0) {
                divergence = requiredLength - s.length;
                absDivergence = Math.abs(divergence);
                index = i;
            } else {
                const div = requiredLength - s.length;
                const absDiv = Math.abs(div);
                if (absDivergence > absDiv) {
                    divergence = div;
                    absDivergence = absDiv;
                    index = i;
                }
            }
            if (divergence === 0) break;
        }
        return index;
    };
    const findings : Span[] = [];
    while (bufferIndex < bufferLength) {
        const remainder = bufferLength - bufferIndex;
        const fi = fittingSpaceIndex(remainder - 40);
        if (fi === -1) break;
        const s = spaces.splice(fi, 1)[1];
        findings.push(s);
        bufferIndex += s.length - 40;
    }
    return findings;
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

export function truncateFile(filepath: string, size: number) : Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.truncate(filepath, size, err => {
            if (err) reject(err)
            else resolve()
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

export async function writeChunkedValueToFile(
    filepath: string, 
    spaces: Span[], 
    value: Buffer,
) : Promise<number> {
    const findings = findSpaces(value.length, spaces);
    if (findings.length) {
        const firstChunkOffset = findings[0].offset;
        const fd = await openFileForWriting(filepath);
        let startIndex = 0;
        let appendOffset = 20;
        while (findings.length && (startIndex < value.length)) {
            const span = findings.splice(0, 1)[0];
            const usableLength = span.length - 40;
            const endIndex = startIndex + usableLength;
            const lengthStr = `${span.length}`.padStart(20, '0');
            await writeToFile(fd, span.offset, Buffer.from(lengthStr));
            const chunk = value.slice(startIndex, endIndex);
            await writeToFile(fd, span.offset + 20, chunk);
            value = value.slice(startIndex, endIndex);
            const suffixOffset = span.offset + 20 + usableLength;
            if (findings.length) {
                const nextSpan = findings[0];
                const continueOffsetStr = `${nextSpan.offset}`.padStart(20, '0');
                await writeToFile(fd, suffixOffset, Buffer.from(continueOffsetStr));
            } else if (value.length) {
                const stats = await fileStats(filepath);
                appendOffset = stats.size < 20 ? 20 : stats.size;
                const appendOffsetStr = `${appendOffset}`.padStart(20, '0');
                await writeToFile(fd, suffixOffset, Buffer.from(appendOffsetStr));
            } else {
                const endSuffix = ''.padStart(20, '0');
                await writeToFile(fd, suffixOffset, Buffer.from(endSuffix));
            }
        }
        await closeFile(fd);
        if (value.length && appendOffset) {
            await appendToFile(filepath, value);
        }
        return firstChunkOffset;
    }
    // else just append
    const stats = await fileStats(filepath);
    const offset = stats.size < 20 ? 20 : stats.size;
    await appendToFile(filepath, value);
    return offset;
}