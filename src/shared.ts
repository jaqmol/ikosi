import {
  OpenForReadingFn,
  OpenForWritingFn,
  CloseFn,
  SizeFn,
  ReadChunkFns,
  WriteChunkFns,
  isSpanUsableForContent,
  extractContentSpan,
  FSOpenFn,
  FSReadFn,
  FSStatsFn,
  FSWriteFn,
  FSCloseFn
} from './ikfs';
import {
  readIndexStartOffset,
} from './content-index';

export interface Span {
  offset: number;
  length: number;
}

export const FindEmptySpacesFn = (
  fsOpen: FSOpenFn,
  fsStats: FSStatsFn,
  fsRead: FSReadFn,
  fsClose: FSCloseFn
) => {
  const collectContentSpans = CollectContentSpansFn(fsOpen, fsStats, fsRead, fsClose);
  return async (
    filepath: string,
    index: Map<string, number>
  ): Promise<Span[]> => {
    const spans = await collectContentSpans(filepath, index.values());
    spans.sort((a, b) => {
      if (a.offset < b.offset) return -1;
      if (a.offset > b.offset) return 1;
      return 0;
    });
    
    const lastIndex = spans.length - 1;
    const spaces: Span[] = [];
    for (let i = 0; i < spans.length; i++) {
      if (i < lastIndex) {
        const a = spans[i];
        const b = spans[i + 1];
        const offset = a.offset + a.length;
        const length = b.offset - offset;
        spaces.push({ offset, length });
      }
    }
    return spaces;
  };
};

export const ReadIndexStartOffsetFromFileFn = (
  fsOpen: FSOpenFn,
  fsRead: FSReadFn,
  fsClose: FSCloseFn,
) => {
  const openForReadingFn = OpenForReadingFn(fsOpen);
  const closeFn = CloseFn(fsClose);
  return async (filepath: string) => {
    const fd = await openForReadingFn(filepath);
    const startOffset = await readIndexStartOffset(fd, fsRead);
    await closeFn(fd);
    return startOffset;
  };
};

export const CollectContentSpansFn = (
  fsOpen: FSOpenFn,
  fsStats: FSStatsFn,
  fsRead: FSReadFn,
  fsClose: FSCloseFn
) => {
  const openForReadingFn = OpenForReadingFn(fsOpen);
  const closeFn = CloseFn(fsClose);
  const sizeFn = SizeFn(fsStats);
  const collectChunkSpans = CollectChunkSpansFn(fsRead);
  return async (
    filepath: string,
    forOffsets: IterableIterator<number> | number[],
  ) => {
    const size = await sizeFn(filepath);
    const fd = await openForReadingFn(filepath);
    const acc: Span[] = [];
    for (const offset of forOffsets) {
      if (offset < size) {
        const spans = await collectChunkSpans(fd, offset);
        acc.push(...spans);
      }
    }
    await closeFn(fd);
    return acc;
  };
};

interface FittingSpaceFinding {
  isPositive: boolean;
  divergence: number;
  index: number;
}

export const findFittingSpaces = (bufferLength: number, emptySpaces: Span[]): Span[] => {
  const usableSpaces = emptySpaces.filter(isSpanUsableForContent);
  const contentSpans = usableSpaces.map(extractContentSpan);
  let bufferIndex = 0;
  const contSpansReducer = (requiredLength: number) => (
    finding: FittingSpaceFinding,
    contentSpan: Span,
    index: number
  ) => {
    if (finding.divergence === 0) return finding;
    const signedDivergence = requiredLength - contentSpan.length;
    const divergence = Math.abs(signedDivergence);
    const isPositive = signedDivergence >= 0;
    return index === 0 ||
      finding.divergence > divergence ||
      (finding.divergence === divergence && !finding.isPositive && isPositive)
      ? { isPositive, divergence, index }
      : finding;
  };
  const findings: Span[] = [];
  while (bufferIndex < bufferLength) {
    const foundIndex = contentSpans.reduce<FittingSpaceFinding>(
      contSpansReducer(bufferLength - bufferIndex),
      { isPositive: false, divergence: -1, index: -1 }
    ).index;
    if (foundIndex === -1) break;
    const usableSpace = usableSpaces.splice(foundIndex, 1)[0];
    const contentSpan = contentSpans.splice(foundIndex, 1)[0];
    findings.push(usableSpace);
    bufferIndex += contentSpan.length;
  }
  return findings;
};

export const ReadChunksFromFileFn = (fsRead: FSReadFn) => {
  const readChunk = ReadChunkFns(fsRead);
  const collectChunkSpans = CollectChunkSpansFn(fsRead);
  return async (fd: number, startOffset: number): Promise<Buffer> => {
    const acc: Buffer[] = [];
    const spans = await collectChunkSpans(fd, startOffset);
    for (const span of spans) {
      const chunk = await readChunk.content(fd, span);
      acc.push(chunk);
    }
    return Buffer.concat(acc);
  };
};

export const CollectChunkSpansFn = (fsRead: FSReadFn) => {
  const readChunk = ReadChunkFns(fsRead);
  return async (fd: number, startOffset: number) => {
    let offset = startOffset;
    const acc: Span[] = [];
    while (offset > -1) {
      const span = await readChunk.span(fd, offset);
      acc.push(span);
      const continuation = await readChunk.continuation(fd, span);
      offset = continuation || -1;
    }
    return acc;
  };
};

export const WriteToEmptySpacesFn = (
  fsOpen: FSOpenFn,
  fsStats: FSStatsFn,
  fsWrite: FSWriteFn,
  fsClose: FSCloseFn
) => {
  const openForWritingFn = OpenForWritingFn(fsOpen);
  const sizeFn = SizeFn(fsStats);
  const writeChunk = WriteChunkFns(fsWrite);
  const closeFn = CloseFn(fsClose);
  return async (
    filepath: string,
    buffer: Buffer,
    emptySpaces: Span[]
  ): Promise<Span[]> => {
    const occupiedSpaces: Span[] = [];
    const spacesLeft = [...emptySpaces];
    let bufferOffset = 0;
    const fd = await openForWritingFn(filepath);
    let continuation: number = -1;
    while (spacesLeft.length && bufferOffset < buffer.length) {
      const space = spacesLeft.splice(0, 1)[0];
      if (spacesLeft.length) {
        continuation = spacesLeft[0].offset;
      } else {
        continuation = await sizeFn(filepath);
      }
      const bytesWritten = await writeChunk.toSpace(
        fd,
        buffer,
        bufferOffset,
        space,
        continuation
      );
      bufferOffset += bytesWritten;
      occupiedSpaces.push(space);
    }
    if (bufferOffset < buffer.length) {
      if (continuation === -1) {
        continuation = await sizeFn(filepath);
      }
      continuation = continuation < 20 ? 20 : continuation;
      const space = {
        offset: continuation,
        length: buffer.length - bufferOffset + 40
      };
      await writeChunk.toSpace(fd, buffer, bufferOffset, space, 0);
      occupiedSpaces.push(space);
    }
    await closeFn(fd);
    return occupiedSpaces;
  };
};
