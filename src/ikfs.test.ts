import {
  makeFsOpen,
  makeFsRead,
  makeFsStats,
  makeFsWrite,
  makeFsClose,
  createFileBuffer,
  createFileBufferSpans,
  loremIpsum,
  testStatsValue,
} from './test-utils';
import {
  OpenForReadingFn,
  OpenForWritingFn,
  CloseFn,
  StatsFn,
  SizeFn,
  TruncateFn,
  ReadFn,
  WriteFn,
  ReadChunkFns,
  WriteChunkFns,
  isSpanUsableForContent,
  extractContentSpan,
} from './ikfs';

test('Test IKFS OpenForReadingFn', async () => {
  const fsOpen = makeFsOpen(11);
  const openForReading = OpenForReadingFn(fsOpen);
  const fd = await openForReading('right');
  expect(fd).toBe(11);
  expect(fsOpen.passed.filepath).toBe('right');
  expect(fsOpen.passed.flag).toBe('r');
});

test('Test IKFS OpenForWritingFn', async () => {
  const fsOpen = makeFsOpen(22);
  const openForWriting = OpenForWritingFn(fsOpen);
  const fd = await openForWriting('right');
  expect(fd).toBe(22);
  expect(fsOpen.passed.filepath).toBe('right');
  expect(fsOpen.passed.flag).toBe('w');
});

test('Test IKFS CloseFn', async () => {
  const fsClose = makeFsClose();
  const close = CloseFn(fsClose);
  await close(44);
  expect(fsClose.passed.fd).toBe(44);
});

test('Test IKFS StatsFn', async () => {
  const fsStats = makeFsStats();
  const statsFn = StatsFn(fsStats);
  const stats = await statsFn('right');
  expect(stats).toEqual(testStatsValue);
  expect(fsStats.passed.filepath).toBe('right');
});

test('Test IKFS SizeFn', async () => {
  const fsStats = makeFsStats();
  const sizeFn = SizeFn(fsStats);
  const size = await sizeFn('right');
  expect(size).toBe(testStatsValue.size);
  expect(fsStats.passed.filepath).toBe('right');
});

test('Test IKFS TruncateFn', async () => {
  let passedFilepath = 'wrong';
  let passedLength = -1;
  const fsTruncate = (
    filepath: string,
    length: number | undefined | null,
    callback: (err: NodeJS.ErrnoException | null) => void,
  ) => {
    passedFilepath = filepath;
    passedLength = length || -11;
    callback(null);
  };
  const truncate = TruncateFn(fsTruncate);
  await truncate('right', 222);
  expect(passedFilepath).toBe('right');
  expect(passedLength).toBe(222);
});

test('Test IKFS ReadFn', async () => {
  const fsRead = makeFsRead();
  const read = ReadFn(fsRead);
  const buffer = await read(55, {offset: 10, length: 10});
  expect(fsRead.passed.fd).toBe(55);
  expect(fsRead.passed.buffer).toBe(buffer);
  expect(fsRead.passed.offset).toBe(0);
  expect(fsRead.passed.length).toBe(10);
  expect(fsRead.passed.position).toBe(10);
  expect(buffer.length).toBe(10);
});

test('Test IKFS WriteFn', async () => {
  const fsWrite = makeFsWrite();
  const write = WriteFn(fsWrite);
  const buffer = Buffer.from('1234567890');
  const buffSpanLen = buffer.length / 2;
  const written = await write(66, buffer, {offset: 10, length: buffSpanLen}, 20);
  expect(fsWrite.passed.fd).toBe(66);
  expect(fsWrite.passed.buffer).toBe(buffer);
  expect(fsWrite.passed.offset).toBe(10);
  expect(fsWrite.passed.length).toBe(buffSpanLen);
  expect(fsWrite.passed.position).toBe(20);
  expect(written).toBe(buffSpanLen);
});

test('Test IKFS ReadChunkFns.span', async () => {
  const fileBuffer = createFileBuffer(loremIpsum);
  const fileBufferSpans = createFileBufferSpans(loremIpsum);
  const fsRead = makeFsRead(fileBuffer);
  const readChunk = ReadChunkFns(fsRead);
  const span = await readChunk.span(77, fileBufferSpans[1].offset);
  expect(fsRead.passed.fd).toBe(77);
  expect(fsRead.passed.offset).toBe(0);
  expect(fsRead.passed.length).toBe(20);
  expect(fsRead.passed.position).toBe(fileBufferSpans[1].offset);
  expect(span).toEqual(fileBufferSpans[1]);
});

test('Test IKFS ReadChunkFns.content', async () => {
  const fileBuffer = createFileBuffer(loremIpsum);
  const fileBufferSpans = createFileBufferSpans(loremIpsum);
  const fsRead = makeFsRead(fileBuffer);
  const readChunk = ReadChunkFns(fsRead);
  const span = await readChunk.span(99, fileBufferSpans[2].offset);
  const buffer = await readChunk.content(99, span);
  expect(fsRead.passed.fd).toBe(99);
  expect(span).toEqual(fileBufferSpans[2]);
  expect(buffer.toString()).toBe(loremIpsum[2]);
});

test('Test IKFS ReadChunkFns.continuation', async () => {
  const fileBuffer = createFileBuffer(loremIpsum);
  const fileBufferSpans = createFileBufferSpans(loremIpsum);
  const fsRead = makeFsRead(fileBuffer);
  const readChunk = ReadChunkFns(fsRead);
  const span = await readChunk.span(111, fileBufferSpans[3].offset);
  const continuation = await readChunk.continuation(111, span);
  expect(fsRead.passed.fd).toBe(111);
  expect(span).toEqual(fileBufferSpans[3]);
  expect(continuation).toBe(3);
});

test('Test IKFS isSpanUsableForContent', async () => {
  const unusable = {offset: 23, length: 40};
  const usable = {offset: 31, length: 65};
  expect(isSpanUsableForContent(unusable)).toBeFalsy();
  expect(isSpanUsableForContent(usable)).toBeTruthy();
});

test('Test IKFS extractContentSpan', async () => {
  const a = {offset: 128, length: 128};
  const b = {offset: 256, length: 256};
  expect(extractContentSpan(a)).toEqual({
    offset: a.offset + 20,
    length: a.length - 40,
  });
  expect(extractContentSpan(b)).toEqual({
    offset: b.offset + 20,
    length: b.length - 40,
  });
});

test('Test IKFS WriteChunkFns.number', async () => {
  const fsWrite = makeFsWrite();
  const writeChunk = WriteChunkFns(fsWrite);
  await writeChunk.number(3, 768, 256);
  const fsRead = makeFsRead(fsWrite.fileBuffer());
  const readChunk = ReadChunkFns(fsRead);
  const span = await readChunk.span(3, 256);
  expect(span).toEqual({ offset: 256, length: 768 });
});

test('Test IKFS WriteChunkFns.toSpace with fitting space', async () => {
  const fsWrite = makeFsWrite();
  const writeChunk = WriteChunkFns(fsWrite);
  const contALen = Buffer.byteLength(loremIpsum[0]);
  const contBLen = Buffer.byteLength(loremIpsum[1]);
  const content = Buffer.from(loremIpsum.slice(0, 2).join(''));
  const fittingSpaceLength = contBLen + 40;
  const space = {offset: 32, length: fittingSpaceLength};
  const bytesWritten = await writeChunk.toSpace(
    15, content, contALen, space, 32,
  );
  expect(bytesWritten).toBe(contBLen);
  const fsRead = makeFsRead(fsWrite.fileBuffer());
  const readChunk = ReadChunkFns(fsRead);
  const span = await readChunk.span(15, space.offset);
  const writtenContent = await readChunk.content(99, span);
  const writtenString = writtenContent.toString();
  expect(writtenString).toBe(loremIpsum[1]);
  const continuation = await readChunk.continuation(15, span);
  expect(continuation).toBe(0);
});

test('Test IKFS WriteChunkFns.toSpace with small space', async () => {
  const fsWrite = makeFsWrite();
  const writeChunk = WriteChunkFns(fsWrite);
  const contALen = Buffer.byteLength(loremIpsum[0]);
  const contBLen = Buffer.byteLength(loremIpsum[1]);
  const content = Buffer.from(loremIpsum.slice(0, 2).join(''));
  const tooSmallSpaceLength = contBLen + 40 - 30;
  const space = {offset: 32, length: tooSmallSpaceLength};
  const bytesWritten = await writeChunk.toSpace(
    15, content, contALen, space, 32,
  );
  expect(bytesWritten).toBe(tooSmallSpaceLength - 40);
  const fsRead = makeFsRead(fsWrite.fileBuffer());
  const readChunk = ReadChunkFns(fsRead);
  const span = await readChunk.span(15, space.offset);
  const writtenContent = await readChunk.content(99, span);
  const writtenString = writtenContent.toString();
  expect(writtenString).toBe(loremIpsum[1].slice(0, -30));
  const continuation = await readChunk.continuation(15, span);
  expect(continuation).toBe(32);
});

test('Test IKFS WriteChunkFns.toSpace with big space', async () => {
  const fsWrite = makeFsWrite();
  const writeChunk = WriteChunkFns(fsWrite);
  const contALen = Buffer.byteLength(loremIpsum[0]);
  const contBLen = Buffer.byteLength(loremIpsum[1]);
  const content = Buffer.from(loremIpsum.slice(0, 2).join(''));
  const tooBigSpaceLength = contBLen + 40 + 30;
  const space = {offset: 32, length: tooBigSpaceLength};
  const bytesWritten = await writeChunk.toSpace(
    15, content, contALen, space, 32,
  );
  expect(bytesWritten).toBe(contBLen);
  const fsRead = makeFsRead(fsWrite.fileBuffer());
  const readChunk = ReadChunkFns(fsRead);
  const span = await readChunk.span(15, space.offset);
  const writtenContent = await readChunk.content(99, span);
  const writtenString = writtenContent.toString();
  expect(writtenString).toBe(loremIpsum[1]);
  const continuation = await readChunk.continuation(15, span);
  expect(continuation).toBe(0);
});
