import {
    createContinuationFileBuffer,
    loremIpsum,
    odd,
    even,
    createFileBufferSpans,
    makeFsOpen,
    makeFsStats,
    makeFsRead,
    makeFsWrite,
    makeFsClose,
} from './test-utils';
import {
    readIndexStartOffset,
    ReadIndexFn,
    WriteIndexFn,
    MakeContentIndex,
} from './content-index';
import {
    FindEmptySpacesFn,
} from './shared';

test('Test readIndexStartOffset', async () => {
    let startOffset: number;
    const fsReadEmpty = makeFsRead();
    startOffset = await readIndexStartOffset(33, fsReadEmpty);
    expect(Number.isNaN(startOffset)).toBeTruthy();
    const fsReadFilled = makeFsRead(() => Buffer.from('00000000000000000073'));
    startOffset = await readIndexStartOffset(33, fsReadFilled);
    expect(startOffset).toBe(73);
});

test('Test ReadIndexFn on empty file', async () => {
    const fsOpen = makeFsOpen(33);
    const fsRead = makeFsRead();
    const fsClose = makeFsClose();
    const readIndex = await ReadIndexFn(fsOpen, fsRead, fsClose);
    await expect(async () => {
        const index = await readIndex('correct');
        expect(index.size).toBe(0);
    }).not.toThrow();
});

test('Test WriteIndexFn then ReadIndexFn ', async () => {
    const fullFileBuffer = Buffer.concat([
        Buffer.from('00000000000000000000'),
        createContinuationFileBuffer(20),
    ]);
    const oddFullLoremIpsum = loremIpsum.filter(odd);
    const oddFullFileBufferSpans = createFileBufferSpans(oddFullLoremIpsum);
    const fileBufferSpans = oddFullFileBufferSpans.filter(even);
    const index = new Map<string, number>(fileBufferSpans.map(
        (span, index) => [`key:${index}`, span.offset + 20],
    ));
    const fsOpen = makeFsOpen(33);
    const fsStats = makeFsStats(sts => ({...sts, size: 0}));
    const fsWrite = makeFsWrite(fullFileBuffer);
    const fsRead = makeFsRead(() => fsWrite.fileBuffer());
    const fsClose = makeFsClose();
    const writeIndex = await WriteIndexFn(fsOpen, fsStats, fsWrite, fsClose);
    const findEmptySpaces = FindEmptySpacesFn(fsOpen, fsStats, fsRead, fsClose);
    const freeSpaces = await findEmptySpaces('correct', index);
    await writeIndex('correct', index, freeSpaces);
    const readIndex = await ReadIndexFn(fsOpen, fsRead, fsClose);
    const rereadIndex = await readIndex('correct');
    expect(rereadIndex.size).toBe(index.size);
    for (let [rereadKey, rereadValue] of rereadIndex.entries()) {
        expect(index.has(rereadKey)).toBeTruthy();
        const originalValue = index.get(rereadKey);
        expect(originalValue).toBeDefined();
        expect(originalValue).toBe(rereadValue);
    }
});

test('Test MakeContentIndex on empty file', async () => {
    const fsOpen = makeFsOpen(33);
    const fsStats = makeFsStats(sts => ({...sts, size: 0}));
    const fsRead = makeFsRead();
    const fsClose = makeFsClose();
    const fsWrite = makeFsWrite();
    const contIdx = await MakeContentIndex('correct', fsOpen, fsRead, fsStats, fsWrite, fsClose);
    const keys: string[] = [];
    for await (let k of contIdx.keys()) {
        keys.push(k);
    }
    expect(keys.length).toBe(0);
    const offset = await contIdx.offset('key-a');
    expect(offset).toBeUndefined();
    const containsKeyA = await contIdx.contains('key-a');
    expect(containsKeyA).toBeFalsy();
    const keyARemoved = await contIdx.remove('key-a');
    expect(keyARemoved).toBeFalsy();
    const spaces = await contIdx.spaces();
    expect(spaces.length).toBe(0);
    const spans = await contIdx.spans();
    expect(spans.length).toBe(0);
});

// NOTE: This is hard to test because the index relies on actual data being written together with the index itself. 
// TODO: Test the overarching API (index) first.
// test('Test MakeContentIndex', async () => {
//     const fsOpen = makeFsOpen(33);
//     const fsWrite = makeFsWrite();
//     const fsStats = makeFsStats(() => ({
//         ...testStatsValue,
//         size: fsWrite.fileBuffer().length,
//     }));
//     const fsRead = makeFsRead(() => fsWrite.fileBuffer());
//     const fsClose = makeFsClose();
//     const contIdx = await MakeContentIndex('Test-MakeContentIndex', fsOpen, fsRead, fsStats, fsWrite, fsClose);
//     const expected = new Map<string, number>([
//         ['A', 1],
//         ['B', 2],
//         ['C', 3],
//         ['D', 4],
//         ['E', 5],
//         ['F', 6],
//         ['G', 7],
//         ['H', 8],
//         ['I', 9],
//     ]);
//     expected.forEach((v, k) => contIdx.setOffset(k, v));
// });