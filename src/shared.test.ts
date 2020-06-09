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
    const acc : number[] = [];
    for await (const span of yieldContentSpans('right', oddOffsets.values())) {
        const contentSpan = extractContentSpan(span);
        const buff = fileBuffer.slice(contentSpan.offset, contentSpan.offset + contentSpan.length);
        const value = buff.toString();
        const index = loremIpsum.indexOf(value);
        acc.push(index);
    }
    expect(fsOpen.passed.filepath).toBe('right');
    console.log(acc);
});