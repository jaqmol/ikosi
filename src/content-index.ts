import {
  Span,
  FindEmptySpacesFn,
  ReadChunksFromFileFn,
  YieldContentSpansFn,
  WriteToEmptySpacesFn,
  findFittingSpaces,
} from './shared';
import {
  OpenForReadingFn,
  OpenForWritingFn,
  CloseFn,
  WriteFn,
  FSOpenFn,
  FSReadFn,
  FSStatsFn,
  FSWriteFn,
  FSCloseFn,
  ReadFn,
} from './ikfs';

export interface ContentIndex {
  keys() : AsyncGenerator<string, void, unknown>;
  offset(key: string): Promise<number|undefined>;
  setOffset(key: string, offset: number): Promise<void>;
  contains(key: string): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  spaces(): Promise<Span[]>;
  spans(): Promise<Span[]>;
}

export async function MakeContentIndex(
  filepath: string,
  fsOpen: FSOpenFn,
  fsRead: FSReadFn,
  fsStats: FSStatsFn,
  fsWrite: FSWriteFn,
  fsClose: FSCloseFn
): Promise<ContentIndex> {
  const readIndex = ReadIndexFn(fsOpen, fsRead, fsClose);
  const writeIndex = WriteIndexFn(fsOpen, fsStats, fsWrite, fsClose);
  const findEmptySpaces = FindEmptySpacesFn(fsOpen, fsStats, fsRead, fsClose);
  const yieldContentSpans = YieldContentSpansFn(fsOpen, fsStats,  fsRead, fsClose);

  const index = await readIndex(filepath);
  let freeSpaces: Span[] | null = null;
  async function* keys() {
    for (let k of index.keys()) yield k;
  }
  const offset = async (key: string): Promise<number|undefined> => index.get(key);
  const setOffset = async (key: string, value: number): Promise<void> => {
    index.set(key, value);
    freeSpaces = null;
    const ess = await spaces();
    await writeIndex(filepath, index, ess);
  };
  const contains = async (key: string): Promise<boolean> => index.has(key);
  const remove = async (key: string): Promise<boolean> => {
    const done = index.delete(key);
    freeSpaces = null;
    await writeIndex(filepath, index, await spaces());
    return done;
  };
  const spaces = async (): Promise<Span[]> => {
    if (freeSpaces) return freeSpaces;
    freeSpaces = await findEmptySpaces(filepath, index);
    return freeSpaces;
  };
  const spans = async (): Promise<Span[]> => {
    const values: Span[] = [];
    for await (const spanValue of yieldContentSpans(filepath, index.values())) {
      values.push(spanValue);
    }
    return values;
  };
  return {
    keys,
    offset,
    setOffset,
    contains,
    remove,
    spaces,
    spans
  };
}

export const ReadIndexFn = (
  fsOpen: FSOpenFn,
  fsRead: FSReadFn,
  fsClose: FSCloseFn
) => {
  const openForReadingFn = OpenForReadingFn(fsOpen);
  const readChunksFromFile = ReadChunksFromFileFn(fsRead);
  const closeFn = CloseFn(fsClose);

  return async (filepath: string): Promise<Map<string, number>> => {
    const fd = await openForReadingFn(filepath);
    const startOffset = await readIndexStartOffset(fd, fsRead);
    const indexBuffer = await readChunksFromFile(fd, startOffset);
    const indexString = indexBuffer.toString();
    await closeFn(fd);
    return new Map<string, number>(indexString 
      ? JSON.parse(indexString) 
      : undefined
    );
  };
};

export const readIndexStartOffset = async (
  fileDescriptor: number,
  fsRead: FSReadFn,
) => {
  const readBuffer = ReadFn(fsRead);
  const startOffsetBuff = await readBuffer(
    fileDescriptor, 
    { offset: 0, length: 20 },
  );
  const startOffset = Number.parseInt(
    startOffsetBuff.toString(), 
    10,
  );
  return startOffset;
};

export const WriteIndexFn = (
  fsOpen: FSOpenFn,
  fsStats: FSStatsFn,
  fsWrite: FSWriteFn,
  fsClose: FSCloseFn
) => {
  const openForWritingFn = OpenForWritingFn(fsOpen);
  const writeToEmptySpaces = WriteToEmptySpacesFn(
    fsOpen,
    fsStats,
    fsWrite,
    fsClose
  );
  const writeFn = WriteFn(fsWrite);
  const closeFn = CloseFn(fsClose);

  return async (
    filepath: string,
    index: Map<string, number>,
    emptySpaces: Span[]
  ): Promise<void> => {
    const keysAndValues = [...index];
    let buffer = Buffer.from(JSON.stringify(keysAndValues));
    const fittingSpaces = findFittingSpaces(buffer.length, emptySpaces);
    const occupiedSpans = await writeToEmptySpaces(filepath, buffer, fittingSpaces);
    const offsetStr = `${occupiedSpans[0].offset}`.padStart(20, '0');
    buffer = Buffer.from(offsetStr);
    const fd = await openForWritingFn(filepath);
    await writeFn(fd, buffer, { offset: 0, length: buffer.length }, 0);
    await closeFn(fd);
  };
};
