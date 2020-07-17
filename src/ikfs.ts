import { Stats } from 'fs';
import { Span } from './shared';

export const ReadChunkFns = (fsRead: FSReadFn) => {
  const readBuffer = ReadFn(fsRead);
  const span = async (fd: number, offset: number): Promise<Span> => {
    const lenBuff = await readBuffer(fd, { offset, length: 20 });
    const length = Number.parseInt(lenBuff.toString(), 10);
    return { offset, length };
  };
  const content = (fd: number, chunkSpan: Span): Promise<Buffer> => {
    if (Number.isNaN(chunkSpan.length) || (chunkSpan.length === 0)) {
      return Promise.resolve(Buffer.alloc(0));
    }
    return readBuffer(fd, {
      offset: chunkSpan.offset + 20,
      length: chunkSpan.length - 40
    });
  };
  const continuation = async (fd: number, chunkSpan: Span): Promise<number> => {
    const contBuff = await readBuffer(fd, {
      offset: chunkSpan.offset + chunkSpan.length - 20,
      length: 20
    });
    return Number.parseInt(contBuff.toString(), 10);
  };
  return {
    span,
    content,
    continuation,
  };
};

export const WriteChunkFns = (fsWrite: FSWriteFn) => {
  const writeBuffer = WriteFn(fsWrite);
  const writeNumber = async (
    fd: number,
    aNumber: number,
    filePosition: number
  ): Promise<void> => {
    const aNumberStr = `${aNumber}`.padStart(20, '0');
    const buffer = Buffer.from(aNumberStr);
    await writeBuffer(
      fd,
      buffer,
      { offset: 0, length: buffer.length },
      filePosition,
    );
  };
  const toSpace = async (
    fd: number,
    content: Buffer,
    contentOffset: number,
    space: Span,
    continuationValue: number
  ): Promise<number> => {
    if (!isSpanUsableForContent(space)) return 0;
    const contentTargetSpan = extractContentSpan(space);
    const contentSourceSpan = {offset: contentOffset, length: content.length - contentOffset};
    const minimumLength = Math.min(contentTargetSpan.length, contentSourceSpan.length);
    contentTargetSpan.length = minimumLength;
    contentSourceSpan.length = minimumLength;
    const targetSpan = {offset: space.offset, length: contentTargetSpan.length + 40};
    await writeNumber(fd, targetSpan.length, targetSpan.offset);
    const contentBytesWritten = await writeBuffer(
      fd,
      content,
      contentSourceSpan,
      contentTargetSpan.offset
    );
    const continuationFilePosition = contentTargetSpan.offset + contentTargetSpan.length;
    if ((contentOffset + contentBytesWritten) === content.length) {
      writeNumber(fd, 0, continuationFilePosition);
    } else {
      writeNumber(fd, continuationValue, continuationFilePosition);
    }
    return contentBytesWritten;
  };
  return {
    number: writeNumber,
    toSpace,
  };
};

export const isSpanUsableForContent = (space: Span): boolean => space.length >= 60;
export const extractContentSpan = (space: Span): Span => ({
  offset: space.offset + 20,
  length: space.length - 40,
});

export type FSOpenFn = (
  path: string,
  flags: string,
  callback: (err: NodeJS.ErrnoException | null, fd: number) => void
) => void;
export const OpenForReadingFn = (fsOpen: FSOpenFn) => (filepath: string) =>
  open(fsOpen, filepath, 'r');
export const OpenForWritingFn = (fsOpen: FSOpenFn) => (filepath: string) =>
  open(fsOpen, filepath, 'w');
const open = (
  fsOpen: FSOpenFn,
  filepath: string,
  mode: string
): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    fsOpen(filepath, mode, (err, fd) => {
      if (err) reject(err);
      else resolve(fd);
    });
  });

export type FSCloseFn = (
  fd: number,
  callback: (err: NodeJS.ErrnoException | null) => void
) => void;
export const CloseFn = (fsClose: FSCloseFn) => (fd: number): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    fsClose(fd, err => {
      if (err) reject(err);
      else resolve();
    });
  });

export type FSStatsFn = (
  path: string,
  callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void
) => void;
export const StatsFn = (fsStats: FSStatsFn) => (
  filepath: string
): Promise<Stats> =>
  new Promise<Stats>((resolve, reject) => {
    fsStats(filepath, (err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });

export const SizeFn = (fsStats: FSStatsFn) => async (
  filepath: string
): Promise<number> => {
  const stats = StatsFn(fsStats);
  const s = await stats(filepath);
  return s.size;
};

export type FSTruncateFn = (
  path: string,
  len: number | undefined | null,
  callback: (err: NodeJS.ErrnoException | null) => void
) => void;
export const TruncateFn = (fsTruncate: FSTruncateFn) => (
  filepath: string,
  size: number
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    fsTruncate(filepath, size, err => {
      if (err) reject(err);
      else resolve();
    });
  });

export type FSReadFn = (
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
) => void;
export const ReadFn = (fsRead: FSReadFn) => (
  fd: number,
  fileSpan: Span
): Promise<Buffer> =>
  new Promise<Buffer>((resolve, reject) => {
    const buffer = Buffer.alloc(fileSpan.length);
    fsRead(fd, buffer, 0, fileSpan.length, fileSpan.offset, (err, _, buff) => {
      if (err) reject(err);
      else resolve(buff);
    });
  });

export type FSWriteFn = (
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
) => void;
export const WriteFn = (fsWrite: FSWriteFn) => (
  fd: number,
  buffer: Buffer,
  bufferSpan: Span,
  filePosition: number
): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    fsWrite(
      fd,
      buffer,
      bufferSpan.offset,
      bufferSpan.length,
      filePosition,
      (err, bytesWritten) => {
        if (err) reject(err);
        else resolve(bytesWritten);
      }
    );
  });
