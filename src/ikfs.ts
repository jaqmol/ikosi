import { Stats } from 'fs';
import { Span } from './shared';

export const ChunkFns = (fsRead: FSReadFn, fsWrite: FSWriteFn) => {
  const readBuffer = ReadFn(fsRead);
  const writeBuffer = WriteFn(fsWrite);
  const span = async (fd: number, offset: number): Promise<Span> => {
    const buffer = await readBuffer(fd, { offset, length: 20 });
    const length = Number.parseInt(buffer.toString(), 10);
    return { offset, length };
  };
  const read = (fd: number, chunkSpan: Span): Promise<Buffer> => {
    return readBuffer(fd, {
      offset: chunkSpan.offset + 20,
      length: chunkSpan.length - 40
    });
  };
  const continuation = async (fd: number, chunkSpan: Span): Promise<number> => {
    const buffer = await readBuffer(fd, {
      offset: chunkSpan.offset + chunkSpan.length - 20,
      length: 20
    });
    return Number.parseInt(buffer.toString(), 10);
  };
  const isSpaceUsable = (space: Span): boolean => space.length >= 60;
  const contentSpan = (space: Span): Span => ({
    offset: space.offset + 20,
    length: space.length - 40
  });
  const writeLength = async (
    fd: number,
    length: number,
    filePosition: number
  ): Promise<void> => {
    const lengthStr = `${length}`.padStart(20, '0');
    const buffer = Buffer.from(lengthStr);
    await writeBuffer(
      fd,
      buffer,
      { offset: 0, length: buffer.length },
      filePosition
    );
  };
  const writeContinuation = async (
    fd: number,
    continuationValue: number,
    filePosition: number
  ): Promise<void> => {
    const continuationStr = `${continuationValue}`.padStart(20, '0');
    const buffer = Buffer.from(continuationStr);
    await writeBuffer(
      fd,
      buffer,
      { offset: 0, length: buffer.length },
      filePosition
    );
  };
  const writeToSpace = async (
    fd: number,
    buffer: Buffer,
    bufferOffset: number,
    space: Span,
    continuationValue: number
  ): Promise<number> => {
    if (!isSpaceUsable(space)) return 0;
    const fileContentSpan = contentSpan(space);
    let bufferRemainingLength = buffer.length - bufferOffset;
    if (bufferRemainingLength < fileContentSpan.length) {
      fileContentSpan.length = bufferRemainingLength;
    }
    await writeLength(fd, fileContentSpan.length, space.offset);
    const bufferSpan = { offset: bufferOffset, length: fileContentSpan.length };
    const bytesWritten = await writeBuffer(
      fd,
      buffer,
      bufferSpan,
      fileContentSpan.offset
    );
    bufferRemainingLength -= bytesWritten;
    const continuationFilePosition =
      fileContentSpan.offset + fileContentSpan.length;
    if (bufferRemainingLength === 0) {
      writeContinuation(fd, 0, continuationFilePosition);
    } else {
      writeContinuation(fd, continuationValue, continuationFilePosition);
    }
    return bytesWritten;
  };
  return {
    span,
    read,
    continuation,
    isSpaceUsable,
    contentSpan,
    writeLength,
    writeContinuation,
    writeToSpace
  };
};

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
