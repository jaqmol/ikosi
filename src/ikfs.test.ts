// import test from 'ava';
import {
  OpenForReadingFn,
  OpenForWritingFn,
  CloseFn,
  StatsFn,
  SizeFn,
  TruncateFn,
  ReadFn,
  WriteFn,
  ChunkFns,
} from './ikfs';
import { Span } from './shared';
import { Stats } from 'fs';

test('Test IKFS OpenForReadingFn', async () => {
  let passedFilepath = 'wrong';
  let passedFlag = 'w';
  const fsOpen = (
    filepath: string,
    flag: string,
    callback: (err: NodeJS.ErrnoException|null, fd: number) => void,
  ) => {
    passedFilepath = filepath;
    passedFlag = flag;
    callback(null, 11);
  };
  const openForReading = OpenForReadingFn(fsOpen);
  const fd = await openForReading('right');
  expect(fd).toBe(11);
  expect(passedFilepath).toBe('right');
  expect(passedFlag).toBe('r');
});

test('Test IKFS OpenForWritingFn', async () => {
  let passedFilepath = 'wrong';
  let passedFlag = 'r';
  const fsOpen = (
    filepath: string,
    flag: string,
    callback: (err: NodeJS.ErrnoException|null, fd: number) => void,
  ) => {
    passedFilepath = filepath;
    passedFlag = flag;
    callback(null, 22);
  };
  const openForWriting = OpenForWritingFn(fsOpen);
  const fd = await openForWriting('right');
  expect(fd).toBe(22);
  expect(passedFilepath).toBe('right');
  expect(passedFlag).toBe('w');
});

test('Test IKFS CloseFn', async () => {
  let passedFd = -1;
  const fsClose = (
    fd: number,
    callback: (err: NodeJS.ErrnoException | null) => void,
  ) => {
    passedFd = fd;
    callback(null);
  };
  const close = CloseFn(fsClose);
  await close(44);
  expect(passedFd).toBe(44);
});

test('Test IKFS StatsFn', async () => {
  let passedFilepath = 'wrong';
  const fsStats = (
    filepath: string,
    callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void
  ) => {
    passedFilepath = filepath;
    callback(null, testStat);
  };
  const statsFn = StatsFn(fsStats);
  const stats = await statsFn('right');
  expect(stats).toEqual(testStat);
  expect(passedFilepath).toBe('right');
});

test('Test IKFS SizeFn', async () => {
  let passedFilepath = 'wrong';
  const fsStats = (
    filepath: string,
    callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void
  ) => {
    passedFilepath = filepath;
    callback(null, testStat);
  };
  const sizeFn = SizeFn(fsStats);
  const size = await sizeFn('right');
  expect(size).toBe(testStat.size);
  expect(passedFilepath).toBe('right');
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

test('Test IKFS ChunkFns.span', async () => {
  const fileBuffer = createFileBuffer(loremIpsum);
  const fileBufferSpans = createFileBufferSpans(loremIpsum);
  const fsRead = makeFsRead(fileBuffer);
  const fsWrite = makeFsWrite();
  const chunk = ChunkFns(fsRead, fsWrite);
  const span = await chunk.span(77, fileBufferSpans[1].offset);
  expect(fsRead.passed.fd).toBe(77);
  expect(fsRead.passed.offset).toBe(0);
  expect(fsRead.passed.length).toBe(20);
  expect(fsRead.passed.position).toBe(fileBufferSpans[1].offset);
  expect(span).toEqual(fileBufferSpans[1]);
});

test('Test IKFS ChunkFns.read', async () => {
  const fileBuffer = createFileBuffer(loremIpsum);
  const fileBufferSpans = createFileBufferSpans(loremIpsum);
  const fsRead = makeFsRead(fileBuffer);
  const fsWrite = makeFsWrite();
  const chunk = ChunkFns(fsRead, fsWrite);
  const span = await chunk.span(99, fileBufferSpans[2].offset);
  const buffer = await chunk.read(99, span);
  expect(fsRead.passed.fd).toBe(99);
  expect(span).toEqual(fileBufferSpans[2]);
  expect(buffer.toString()).toBe(loremIpsum[2]);
});

test('Test IKFS ChunkFns.continuation', async () => {
  const fileBuffer = createFileBuffer(loremIpsum);
  const fileBufferSpans = createFileBufferSpans(loremIpsum);
  const fsRead = makeFsRead(fileBuffer);
  const fsWrite = makeFsWrite();
  const chunk = ChunkFns(fsRead, fsWrite);
  const span = await chunk.span(111, fileBufferSpans[3].offset);
  const continuation = await chunk.continuation(111, span);
  expect(fsRead.passed.fd).toBe(111);
  expect(span).toEqual(fileBufferSpans[3]);
  expect(continuation).toBe(3);
});

test('Test IKFS ChunkFns.isSpaceUsable', async () => {
  const unusable = {offset: 23, length: 40};
  const usable = {offset: 31, length: 65};
  expect(ChunkFns.isSpaceUsable(unusable)).toBeFalsy();
  expect(ChunkFns.isSpaceUsable(usable)).toBeTruthy();
});

test('Test IKFS ChunkFns.contentSpan', async () => {
  const a = {offset: 128, length: 128};
  const b = {offset: 256, length: 256};
  expect(ChunkFns.contentSpan(a)).toEqual({
    offset: a.offset + 20,
    length: a.length - 40,
  });
  expect(ChunkFns.contentSpan(b)).toEqual({
    offset: b.offset + 20,
    length: b.length - 40,
  });
});

test('Test IKFS ChunkFns.writeNumber', async () => {
  let fsRead = makeFsRead();
  const fsWrite = makeFsWrite();
  let chunk = ChunkFns(fsRead, fsWrite);
  await chunk.writeNumber(3, 768, 256);
  fsRead = makeFsRead(fsWrite.fileBuffer());
  chunk = ChunkFns(fsRead, fsWrite);
  const span = await chunk.span(3, 256);
  expect(span).toEqual({ offset: 256, length: 768 });
});

// test('Test IKFS ChunkFns.writeToSpace', async () => {
//   TODO
// });

const testStat = {
  dev: 1,
  ino: 2,
  mode: 3,
  nlink: 4,
  uid: 5,
  gid: 6,
  rdev: 7,
  size: 8,
  blksize: 9,
  blocks: 10,
  atimeMs: 11,
  mtimeMs: 12,
  ctimeMs: 13,
  birthtimeMs: 14,
  atime: new Date(),
  mtime: new Date(),
  ctime: new Date(),
  birthtime: new Date(),
  isFile: () => true,
  isDirectory: () => false,
  isBlockDevice: () => true,
  isCharacterDevice: () => false,
  isSymbolicLink: () => true,
  isFIFO: () => false,
  isSocket: () => true,
};

interface PassedRWValues {
  fd: number
  buffer: Buffer|null
  offset: number
  length: number
  position: number
}

const makeFsRead = (fileBuffer?: Buffer) => {
  const passed : PassedRWValues = { 
    fd: -1,
    buffer: null,
    offset: -1,
    length: -1,
    position: -1,
  };
  const fsRead = (
    fd: number,
    buffer: Buffer,
    offset: number,
    length: number,
    position: number | null,
    callback: (
      err: NodeJS.ErrnoException | null,
      bytesRead: number,
      buffer: Buffer
    ) => void
  ) => {
    position = position || 0;
    if (fileBuffer) {
      fileBuffer.copy(buffer, offset, position, position + length);
    }
    passed.fd = fd;
    passed.buffer = buffer;
    passed.offset = offset;
    passed.length = length;
    passed.position = position;
    callback(null, length, buffer);
  };
  fsRead.passed = passed;
  return fsRead;
};

const makeFsWrite = () => {
  const passed : PassedRWValues = { 
    fd: -1,
    buffer: null,
    offset: -1,
    length: -1,
    position: -1,
  };
  let fileBuffer = Buffer.alloc(0);
  const fsWrite = (
    fd: number,
    buffer: Buffer,
    offset: number | undefined | null,
    length: number | undefined | null,
    position: number | undefined | null,
    callback: (
      err: NodeJS.ErrnoException | null,
      written: number,
      buffer: Buffer
    ) => void
  ) => {
    offset = offset || 0;
    length = length || 0;
    position = position || 0;
    passed.fd = fd;
    passed.buffer = buffer;
    passed.offset = offset;
    passed.length = length;
    passed.position = position;
    const reqLen = position + length;
    if (reqLen > fileBuffer.length) {
      const ext = Buffer.alloc(reqLen - fileBuffer.length);
      fileBuffer = Buffer.concat([fileBuffer, ext], reqLen);
    }
    buffer.copy(fileBuffer, position, offset, offset + length);
    callback(null, length || 0, buffer);
  };
  fsWrite.passed = passed;
  fsWrite.fileBuffer = () => fileBuffer;
  return fsWrite;
};

const createFileBuffer = (contents: string[]) => {
  const buffers = contents.map(createChunkBuffer);
  return Buffer.concat(buffers);
};

const createChunkBuffer = (content: string, index: number) => {
  const contBuff = Buffer.from(content);
  const length = contBuff.length + 40;
  const prefix = `${length}`.padStart(20, '0');
  const prefixBuff = Buffer.from(prefix);
  const suffix = `${index}`.padStart(20, '0');
  const suffixBuff = Buffer.from(suffix);
  if ((prefixBuff.length + contBuff.length + suffixBuff.length) !== length) {
    throw new Error('Error creating correct chunk');
  }
  return Buffer.concat([prefixBuff, contBuff, suffixBuff]);
};

const createFileBufferSpans = (contents: string[]) :Span[] => {
  let offset = 0;
  return contents.map<Span>(c => {
    const s = createChunkBufferSpan(c, offset);
    offset += s.length;
    return s;
  });
};

const createChunkBufferSpan = (content: string, offset : number = 0) :Span => {
  return { offset, length: Buffer.byteLength(content) + 40 };
};

const loremIpsum = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
];