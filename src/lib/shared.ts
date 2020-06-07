import {
    OpenForReadingFn,
    OpenForWritingFn,
    CloseFn,
    SizeFn,
    ChunkFns,
    FSOpenFn,
    FSReadFn,
    FSStatsFn,
    FSWriteFn,
    FSCloseFn,
} from './ikfs';

export interface Span {
    offset: number
    length: number
}

export const FindEmptySpacesFn = (
    fsOpen: FSOpenFn,
    fsRead: FSReadFn,
    fsWrite: FSWriteFn,
    fsClose: FSCloseFn,
) => {
    const yieldContentSpans = YieldContentSpansFn(fsOpen, fsRead, fsWrite, fsClose);
    return async (filepath: string, index: Map<string, number>) : Promise<Span[]> => {
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
    };
};

export const YieldContentSpansFn = (
    fsOpen: FSOpenFn,
    fsRead: FSReadFn,
    fsWrite: FSWriteFn,
    fsClose: FSCloseFn,
) => {
    const openForReadingFn = OpenForReadingFn(fsOpen);
    const closeFn = CloseFn(fsClose);
    const yieldChunkSpans = YieldChunkSpansFn(fsRead, fsWrite);
    return async function* (
        filepath: string, 
        forOffsets: IterableIterator<number>,
    ) {
        const fd = await openForReadingFn(filepath);
        for (const offset of forOffsets) { 
            for await (const span of yieldChunkSpans(fd, offset)) {
                yield span;
            }
        }
        await closeFn(fd);
    }
};

interface FittingSpaceFinding {
    isPositive: boolean
    divergence: number
    index: number
}

export const FindFittingSpacesFn = (
    fsRead: FSReadFn,
    fsWrite: FSWriteFn,
) => {
    const chunkFns = ChunkFns(fsRead, fsWrite);
    return (bufferLength: number, emptySpaces: Span[]) : Span[] => {
        const usableSpaces = emptySpaces.filter(chunkFns.isSpaceUsable);
        const contentSpans = usableSpaces.map(chunkFns.contentSpan);
        let bufferIndex = 0;
        const contSpansReducer = (requiredLength: number) => 
            (finding: FittingSpaceFinding, contentSpan: Span, index: number) => {
                if (finding.divergence === 0) return finding;
                const signedDivergence = requiredLength - contentSpan.length;
                const divergence = Math.abs(signedDivergence);
                const isPositive = signedDivergence >= 0;
                return (index === 0) || 
                    (finding.divergence > divergence) ||
                    ( (finding.divergence === divergence) && !finding.isPositive && isPositive )
                    ? {isPositive, divergence, index}
                    : finding;
            };
        const findings : Span[] = [];
        while (bufferIndex < bufferLength) {
            const foundIndex = contentSpans.reduce<FittingSpaceFinding>(
                contSpansReducer(bufferLength - bufferIndex),
                {isPositive: false, divergence: -1, index: -1},
            ).index;
            if (foundIndex === -1) break;
            const usableSpace = usableSpaces.splice(foundIndex, 1)[1];
            const contentSpan = contentSpans.splice(foundIndex, 1)[1];
            findings.push(usableSpace);
            bufferIndex += contentSpan.length;
        }
        return findings;
    };
};

export const ReadChunksFromFileFn = (
    fsRead: FSReadFn,
    fsWrite: FSWriteFn,
) => {
    const chunkFns = ChunkFns(fsRead, fsWrite);
    const yieldChunkSpans = YieldChunkSpansFn(fsRead, fsWrite);
    return async (fd: number, startOffset: number) : Promise<Buffer> => {
        const acc : Buffer[] = [];
        for await (const span of yieldChunkSpans(fd, startOffset)) {
            const chunk = await chunkFns.read(fd, span);
            acc.push(chunk);
        }
        return Buffer.concat(acc);
    };
};

export const YieldChunkSpansFn = (
    fsRead: FSReadFn,
    fsWrite: FSWriteFn,
) => {
    const chunkFns = ChunkFns(fsRead, fsWrite);
    return async function* (fd: number, startOffset: number) {
        let offset = startOffset;
        while (offset > -1) {
            const span = await chunkFns.span(fd, offset);
            yield span;
            const continuation = await chunkFns.continuation(fd, span);
            offset = continuation || -1;
        }
    };
};

export const WriteToEmptySpacesFn = (
    fsOpen: FSOpenFn,
    fsRead: FSReadFn,
    fsStats: FSStatsFn,
    fsWrite: FSWriteFn,
    fsClose: FSCloseFn,
) => {
    const openForWritingFn = OpenForWritingFn(fsOpen);
    const sizeFn = SizeFn(fsStats);
    const chunkFns = ChunkFns(fsRead, fsWrite);
    const closeFn = CloseFn(fsClose);
    return async (
        filepath: string, 
        buffer: Buffer,
        emptySpaces: Span[], 
    ) : Promise<number> => {
        const spacesLeft = [...emptySpaces];
        let bufferOffset = 0;
        const fd = await openForWritingFn(filepath);
        let continuation : number;
        while (spacesLeft.length && (bufferOffset < buffer.length)) {
            const space = spacesLeft.splice(0, 1)[0];
            if (spacesLeft.length) {
                continuation = spacesLeft[0].offset;
            } else {
                continuation = await sizeFn(filepath);
            }
            const bytesWritten = await chunkFns.writeToSpace(
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
                continuation = await sizeFn(filepath);
            }
            const space = {
                offset: continuation, 
                length: buffer.length - bufferOffset + 40,
            };
            await chunkFns.writeToSpace(
                fd, 
                buffer, 
                bufferOffset, 
                space, 
                0,
            );
        }
        await closeFn(fd);
        if (emptySpaces.length) return emptySpaces[0].offset;
        else return continuation;
    };
};