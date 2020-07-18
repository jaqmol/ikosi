import {
    createFileBufferSpans,
    loremIpsum,
    even,
    odd,
    createContinuationFileBuffer,
    makeFsOpen,
    makeFsStats,
    makeFsRead,
    makeFsWrite,
    makeFsClose,
    // testStatsValue,
} from './test-utils';
import { extractContentSpan } from './ikfs';
import {
    Span,
    CollectChunkSpansFn,
    CollectContentSpansFn,
    FindEmptySpacesFn,
    findFittingSpaces,
    ReadChunksFromFileFn,
    WriteToEmptySpacesFn,
} from './shared';

test('Test CollectChunkSpansFn', async () => {
    const fileBuffer = createContinuationFileBuffer();
    const oddLoremIpsum = loremIpsum.filter(odd);
    const evenLoremIpsum = loremIpsum.filter(even);
    const oddFileBufferSpans = createFileBufferSpans(oddLoremIpsum);
    const fsRead = makeFsRead(() => fileBuffer);
    const collectChunkSpans = CollectChunkSpansFn(fsRead);
    
    const allWrittenSpans = await Promise.all(oddFileBufferSpans.map(
        oddSpan => collectChunkSpans(11, oddSpan.offset)
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

test('Test CollectContentSpansFn', async () => {
    const fileBuffer = createContinuationFileBuffer();
    const oddLoremIpsum = loremIpsum.filter(odd);
    const oddFileBufferSpans = createFileBufferSpans(oddLoremIpsum);
    const oddOffsets = oddFileBufferSpans.map(s => s.offset);
    const fsOpen = makeFsOpen(33);
    const fsRead = makeFsRead(() => fileBuffer);
    const fsStats = makeFsStats(sts => ({ ...sts, size: fileBuffer.length }));
    const fsClose = makeFsClose();
    const collectContentSpans = CollectContentSpansFn(fsOpen, fsStats, fsRead, fsClose);
    const foundValueIndexes : number[] = [];
    const spans = await collectContentSpans('correct', oddOffsets.values());
    for (const span of spans) {
        const contentSpan = extractContentSpan(span);
        const buff = fileBuffer.slice(contentSpan.offset, contentSpan.offset + contentSpan.length);
        const value = buff.toString();
        const index = loremIpsum.indexOf(value);
        foundValueIndexes.push(index);
    }
    expect(fsOpen.passed.filepath).toBe('correct');
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
    const fsStats = makeFsStats(sts => ({ ...sts, size: fullFileBuffer.length }));
    const fsRead = makeFsRead(() => fullFileBuffer);
    const fsClose = makeFsClose();
    const collectContentSpans = CollectContentSpansFn(fsOpen, fsStats, fsRead, fsClose);
    const occupiedSpaces = await collectContentSpans('correct', index.values());
    const findEmptySpaces = FindEmptySpacesFn(fsOpen, fsStats, fsRead, fsClose);
    const freeSpaces = await findEmptySpaces('correct', index);
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
    const fsStats = makeFsStats(sts => ({ ...sts, size: fullFileBuffer.length }));
    const fsRead = makeFsRead(() => fullFileBuffer);
    const fsClose = makeFsClose();
    // const collectContentSpans = CollectContentSpansFn(fsOpen, fsStats, fsRead, fsClose);
    // const occupiedSpaces = await collectContentSpans('correct', index.values());
    const findEmptySpaces = FindEmptySpacesFn(fsOpen, fsStats, fsRead, fsClose);
    const freeSpaces = await findEmptySpaces('correct', index);
    for (const freeSpace of freeSpaces) {
        const freeContentSpan = extractContentSpan(freeSpace);
        const findings = findFittingSpaces(freeContentSpan.length, freeSpaces);
        expect(findings.length).toBe(1);
        expect(findings[0]).toEqual(freeSpace);
    }
    const overflowLengthA = extractContentSpan({offset: 0, length: freeSpaces[0].length}).length + 
                            extractContentSpan({offset: 0, length: freeSpaces[1].length}).length;
    const overflowLengthB = extractContentSpan({offset: 0, length: freeSpaces[2].length}).length +
                            extractContentSpan({offset: 0, length: freeSpaces[3].length}).length + 
                            extractContentSpan({offset: 0, length: freeSpaces[4].length}).length;
    const freeSpacesA = findFittingSpaces(overflowLengthA, freeSpaces);
    expect(freeSpacesA.length).toBe(2);
    expect(freeSpacesA).toEqual(freeSpaces.slice(0, 2));
    const leftFreeSpaces = freeSpaces.slice(2);
    const sortFn = (a: Span, b: Span) : number => a.offset - b.offset;
    leftFreeSpaces.sort(sortFn);
    const freeSpacesB = findFittingSpaces(overflowLengthB, leftFreeSpaces);
    freeSpacesB.sort(sortFn);
    expect(freeSpacesB.length).toBe(3);
    expect(freeSpacesB).toEqual(leftFreeSpaces);
});

test('Test ReadChunksFromFileFn', async () => {
    const fullFileBuffer = createContinuationFileBuffer();
    const fsRead = makeFsRead(() => fullFileBuffer);
    const readChunksFromFile = ReadChunksFromFileFn(fsRead);
    const dataBuff = await readChunksFromFile(33, 0);
    const result = dataBuff.toString();
    const expected = loremIpsum[1] + loremIpsum[0];
    expect(result).toBe(expected);
});

test('Test WriteToEmptySpacesFn', async () => {
    const fullFileBuffer = createContinuationFileBuffer();
    const oddFullLoremIpsum = loremIpsum.filter(odd);
    const oddFullFileBufferSpans = createFileBufferSpans(oddFullLoremIpsum);
    const fileBufferSpans = oddFullFileBufferSpans.filter(even);
    const index = new Map<string, number>(fileBufferSpans.map(
        (span, index) => [`key:${index}`, span.offset],
    ));
    const fsOpen = makeFsOpen(33);
    const fsWrite = makeFsWrite(fullFileBuffer);
    const fsStats = makeFsStats(sts => ({
        ...sts,
        size: fsWrite.fileBuffer().length,
    }));
    const fsRead = makeFsRead(() => fsWrite.fileBuffer());
    const fsClose = makeFsClose();
    const findEmptySpaces = FindEmptySpacesFn(fsOpen, fsStats, fsRead, fsClose);
    const writeToEmptySpaces = WriteToEmptySpacesFn(fsOpen, fsStats, fsWrite, fsClose);
    const freeSpaces = await findEmptySpaces('correct', index);
    let testContent = '';
    for (let i = loremIpsum.length - 1; i > -1; i--) {
        testContent += loremIpsum[i];
    }
    const testContentBuffer = Buffer.from(testContent);
    await writeToEmptySpaces('correct', testContentBuffer, freeSpaces);
    const readChunksFromFile = ReadChunksFromFileFn(fsRead);
    const dataBuff = await readChunksFromFile(33, freeSpaces[0].offset);
    const result = dataBuff.toString();
    expect(result).toBe(testContent);
});