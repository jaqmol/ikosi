import * as ikfs from './ikfs';

export interface Span {
    offset: number
    length: number
}

export async function findEmptySpaces(filepath: string, index: Map<string, number>) : Promise<Span[]> {
    const spans : Span[] = [];
    for await (const span of yieldContentSpans(filepath, index.values())) {
        spans.push(span);
    }
    spans.sort((a, b) => {
        if (a.offset < b.offset) return -1;
        if (a.offset > b.offset) return 1;
        return 0;
    });
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

export async function* yieldContentSpans(
    filepath: string, 
    forOffsets: IterableIterator<number>,
) {
    const fd = await ikfs.openForReading(filepath);
    for (const offset of forOffsets) { 
        for await (const span of yieldChunkSpans(fd, offset)) {
            yield span;
        }
    }
    await ikfs.close(fd);
}

// TODO: INCORPORATE INTO WRITING PROCEDURES
// export function findFittingSpaces(bufferLength: number, inputSpaces: Span[]) : Span[] {
//     const spaces = [...inputSpaces];
//     let bufferIndex = 0;
//     const fittingSpaceIndex = (requiredLength: number) => {
//         let divergence = -1;
//         let absDivergence = -1;
//         let index = -1;
//         for (let i = 0; i < spaces.length; i++) {
//             const s = spaces[i];
//             if (i === 0) {
//                 divergence = requiredLength - s.length;
//                 absDivergence = Math.abs(divergence);
//                 index = i;
//             } else {
//                 const div = requiredLength - s.length;
//                 const absDiv = Math.abs(div);
//                 if (absDivergence > absDiv) {
//                     divergence = div;
//                     absDivergence = absDiv;
//                     index = i;
//                 }
//             }
//             if (divergence === 0) break;
//         }
//         return index;
//     };
//     const findings : Span[] = [];
//     while (bufferIndex < bufferLength) {
//         const remainder = bufferLength - bufferIndex;
//         const fi = fittingSpaceIndex(remainder - 40);
//         if (fi === -1) break;
//         const s = spaces.splice(fi, 1)[1];
//         findings.push(s);
//         bufferIndex += s.length - 40;
//     }
//     return findings;
// }

export async function readChunksFromFile(fd: number, startOffset: number) : Promise<Buffer> {
    const acc : Buffer[] = [];
    for await (const span of yieldChunkSpans(fd, startOffset)) {
        const chunk = await ikfs.chunk.read(fd, span);
        acc.push(chunk);
    }
    return Buffer.concat(acc);
}

export async function* yieldChunkSpans(fd: number, startOffset: number) {
    let offset = startOffset;
    while (offset > -1) {
        const span = await ikfs.chunk.span(fd, offset);
        yield span;
        const continuation = await ikfs.chunk.continuation(fd, span);
        offset = continuation || -1;
    }
}

export async function writeToEmptySpaces(
    filepath: string, 
    buffer: Buffer,
    emptySpaces: Span[], 
) : Promise<number> {
    const spacesLeft = [...emptySpaces];
    let bufferOffset = 0;
    const fd = await ikfs.openForWriting(filepath);
    let continuation : number;
    while (spacesLeft.length && (bufferOffset < buffer.length)) {
        const space = spacesLeft.splice(0, 1)[0];
        if (spacesLeft.length) {
            continuation = spacesLeft[0].offset;
        } else {
            continuation = await ikfs.size(filepath);
        }
        const bytesWritten = await ikfs.chunk.writeToSpace(
            fd, 
            buffer, 
            bufferOffset, 
            space, 
            continuation,
        );
        bufferOffset += bytesWritten;
    }
    if (bufferOffset < buffer.length) {
        if (!continuation) {
            continuation = await ikfs.size(filepath);
        }
        const space = {
            offset: continuation, 
            length: buffer.length - bufferOffset + 40,
        };
        await ikfs.chunk.writeToSpace(
            fd, 
            buffer, 
            bufferOffset, 
            space, 
            0,
        );
    }
    await ikfs.close(fd);
    if (emptySpaces.length) return emptySpaces[0].offset;
    else return continuation;
}