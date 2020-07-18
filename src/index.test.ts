import {
    makeFsOpen,
    makeFsStats,
    makeFsRead,
    makeFsWrite,
    makeFsClose,
    makeFsTruncate,
    loremIpsum,
} from './test-utils';
import { MakeIkosi } from './index';

test('Test MakeIkosi Simple', async () => {
    const fsOpen = makeFsOpen(38135247);
    const fsClose = makeFsClose();
    const fsWrite = makeFsWrite();
    const fsRead = makeFsRead(fsWrite.fileBuffer);
    const fsStats = makeFsStats(sts => ({...sts, size: fsWrite.fileBuffer().length}));
    const fsTruncate = makeFsTruncate(fsWrite.fileBuffer, fsWrite.setFileBuffer);
    const ikosi = await MakeIkosi(
        'user-facing-api-test', 
        fsOpen, 
        fsRead, 
        fsStats, 
        fsWrite, 
        fsClose, 
        fsTruncate,
    );
    const expected: Map<string, string> = new Map<string, string>(
        loremIpsum.map((sentence, index) => {
            const keyNum = ((index + 1) * 10) + Math.round(Math.random() * 10);
            const keyStr = `${keyNum.toString(16)}`.padStart(2, '0');
            return [`k:${keyStr.toUpperCase()}`, sentence];
        }),
    );
    for (const [key, value] of expected.entries()) {
        await ikosi.set(key, value);
    }
    for (const key of expected.keys()) {
        const contains = await ikosi.contains(key);
        expect(contains).toBeTruthy();
    }
    let storedKeysCount = 0;
    const keys = await ikosi.keys();
    for await (const key of keys) {
        storedKeysCount++;
        const contains = expected.has(key);
        expect(contains).toBeTruthy();
        const valueBuff = await ikosi.get(key);
        expect(valueBuff).toBeDefined();
        if (valueBuff) {
            const writtenValue = valueBuff.toString();
            const expectedValue = expected.get(key);
            expect(writtenValue).toBe(expectedValue);
        }
    }
    expect(storedKeysCount).toBe(expected.size);
    console.log(fsWrite.fileBuffer().toString());
});