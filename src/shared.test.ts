import {
    createFileBufferSpans,
    loremIpsum,
    even,
    odd,
    createContinuationFileBuffer,
    makeFsOpen,
    makeFsRead,
    makeFsClose
} from './test-utils';
import { extractContentSpan } from './ikfs';
import {
    Span,
    YieldChunkSpansFn,
    YieldContentSpansFn,
    FindEmptySpacesFn,
    findFittingSpaces,
    ReadChunksFromFileFn,
    WriteToEmptySpacesFn,
} from './shared';

test('Test YieldChunkSpansFn', async () => {
    const fileBuffer = createContinuationFileBuffer();
    const oddLoremIpsum = loremIpsum.filter(odd);
    const evenLoremIpsum = loremIpsum.filter(even);
    const oddFileBufferSpans = createFileBufferSpans(oddLoremIpsum);
    const fsRead = makeFsRead(fileBuffer);
    const yieldChunkSpans = YieldChunkSpansFn(fsRead);
    
    const allWrittenSpans = await Promise.all(oddFileBufferSpans.map(
        async oddSpan => {
            const writtenSpans : Span[] = [];
            for await (const span of yieldChunkSpans(11, oddSpan.offset)) {
                writtenSpans.push(span);
            }
            return writtenSpans;
        }
    ));
    const writtenValuePairs = allWrittenSpans.map(spans => spans.map(span => {
        const cs = extractContentSpan(span);
        const b = fileBuffer.slice(cs.offset, cs.offset + cs.length);
        return b.toString();
    }));
    for (let i = 0; i < writtenValuePairs.length; i++) {
        const [oddValue, evenValue] = writtenValuePairs[i];
        const originalOddValue = oddLoremIpsum[i];
        const originalEvenValue = evenLoremIpsum[i];
        expect(oddValue).toBe(originalOddValue);
        expect(evenValue).toBe(originalEvenValue);
    }
});

test('Test YieldContentSpansFn', async () => {
    const fileBuffer = createContinuationFileBuffer();
    const oddLoremIpsum = loremIpsum.filter(odd);
    const oddFileBufferSpans = createFileBufferSpans(oddLoremIpsum);
    const oddOffsets = oddFileBufferSpans.map(s => s.offset);
    const fsOpen = makeFsOpen(33);
    const fsRead = makeFsRead(fileBuffer);
    const fsClose = makeFsClose();
    const yieldContentSpans = YieldContentSpansFn(fsOpen, fsRead, fsClose);
    const foundValueIndexes : number[] = [];
    for await (const span of yieldContentSpans('right', oddOffsets.values())) {
        const contentSpan = extractContentSpan(span);
        const buff = fileBuffer.slice(contentSpan.offset, contentSpan.offset + contentSpan.length);
        const value = buff.toString();
        const index = loremIpsum.indexOf(value);
        foundValueIndexes.push(index);
    }
    expect(fsOpen.passed.filepath).toBe('right');
    const uniqueFoundValueIndexes = [...(new Set(foundValueIndexes)).values()];
    expect(uniqueFoundValueIndexes).toEqual(foundValueIndexes);
    const nonNegativeFoundValueIndexes = uniqueFoundValueIndexes.filter(i => i > -1);
    expect(nonNegativeFoundValueIndexes.length).toBe(loremIpsum.length);
});

test('Test FindEmptySpacesFn', async () => {
    const fullFileBuffer = createContinuationFileBuffer();
    const oddFullLoremIpsum = loremIpsum.filter(odd);
    const oddFullFileBufferSpans = createFileBufferSpans(oddFullLoremIpsum);
    const fileBufferSpans = oddFullFileBufferSpans.filter(even);
    const index = new Map<string, number>(fileBufferSpans.map(
        (span, index) => [`key:${index}`, span.offset],
    ));
    const fsOpen = makeFsOpen(33);
    const fsRead = makeFsRead(fullFileBuffer);
    const fsClose = makeFsClose();
    const yieldContentSpans = YieldContentSpansFn(fsOpen, fsRead, fsClose);
    const occupiedSpaces : Span[] = [];
    for await (const space of yieldContentSpans('right', index.values())) {
        occupiedSpaces.push(space);
    }
    const findEmptySpaces = FindEmptySpacesFn(fsOpen, fsRead, fsClose);
    const freeSpaces = await findEmptySpaces('right', index);
    for (const freeSpace of freeSpaces) {
        const freeSpaceEnd = freeSpace.offset + freeSpace.length;
        for (const occSpace of occupiedSpaces) {
            const occSpaceEnd = occSpace.offset + occSpace.length;
            if (freeSpace.offset < occSpace.offset) {
                expect(freeSpaceEnd).toBeLessThanOrEqual(occSpace.offset);
            } else if (freeSpace.offset > occSpace.offset) {
                expect(occSpaceEnd).toBeLessThanOrEqual(freeSpace.offset);
            }
        }
    }
});

test('Test findFittingSpaces', async () => {
    const fullFileBuffer = createContinuationFileBuffer();
    const oddFullLoremIpsum = loremIpsum.filter(odd);
    const oddFullFileBufferSpans = createFileBufferSpans(oddFullLoremIpsum);
    const fileBufferSpans = oddFullFileBufferSpans.filter(even);
    const index = new Map<string, number>(fileBufferSpans.map(
        (span, index) => [`key:${index}`, span.offset],
    ));
    const fsOpen = makeFsOpen(33);
    const fsRead = makeFsRead(fullFileBuffer);
    const fsClose = makeFsClose();
    // TODO: findFittingSpaces
});