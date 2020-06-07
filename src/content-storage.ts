import { ContentIndex } from './content-index';
import {
  ReadChunksFromFileFn,
  WriteToEmptySpacesFn,
  FindFittingSpacesFn,
  Span
} from './shared';
import {
  OpenForReadingFn,
  CloseFn,
  SizeFn,
  TruncateFn,
  FSOpenFn,
  FSReadFn,
  FSStatsFn,
  FSWriteFn,
  FSCloseFn,
  FSTruncateFn
} from './ikfs';

export interface ContentStorage {
  set(key: Buffer | string, value: Buffer | string): Promise<void>;
  get(key: Buffer | string): Promise<Buffer>;
  remove(key: Buffer | string): Promise<boolean>;
}

export async function MakeContentStorage(
  filepath: string,
  contentIndex: ContentIndex,
  fsOpen: FSOpenFn,
  fsRead: FSReadFn,
  fsStats: FSStatsFn,
  fsWrite: FSWriteFn,
  fsClose: FSCloseFn,
  fsTruncate: FSTruncateFn
): Promise<ContentStorage> {
  const writeValue = WriteValueFn(fsOpen, fsRead, fsStats, fsWrite, fsClose);
  const truncateIndex = TruncateIndexFn(fsStats, fsTruncate);
  const readValue = ReadValueFn(fsOpen, fsRead, fsWrite, fsClose);

  const set = async (
    key: Buffer | string,
    value: Buffer | string
  ): Promise<void> => {
    const buffer = typeof value === 'string' ? Buffer.from(value) : value;
    const emptySpaces = await contentIndex.spaces();
    const offset = await writeValue(filepath, buffer, emptySpaces);
    await contentIndex.setOffset(key, offset);
    await truncateIndex(filepath, contentIndex);
  };
  const get = async (key: Buffer | string): Promise<Buffer> => {
    const offset = await contentIndex.offset(key);
    return readValue(filepath, offset);
  };
  const remove = async (key: Buffer | string): Promise<boolean> => {
    const done = await contentIndex.remove(key);
    await truncateIndex(filepath, contentIndex);
    return done;
  };
  return {
    set,
    get,
    remove
  };
}

const ReadValueFn = (
  fsOpen: FSOpenFn,
  fsRead: FSReadFn,
  fsWrite: FSWriteFn,
  fsClose: FSCloseFn
) => {
  const openForReadingFn = OpenForReadingFn(fsOpen);
  const readChunksFromFile = ReadChunksFromFileFn(fsRead, fsWrite);
  const closeFn = CloseFn(fsClose);
  return async (filepath: string, offset: number): Promise<Buffer> => {
    const fd = await openForReadingFn(filepath);
    const value = await readChunksFromFile(fd, offset);
    await closeFn(fd);
    return value;
  };
};

const WriteValueFn = (
  fsOpen: FSOpenFn,
  fsRead: FSReadFn,
  fsStats: FSStatsFn,
  fsWrite: FSWriteFn,
  fsClose: FSCloseFn
) => {
  const findFittingSpaces = FindFittingSpacesFn(fsRead, fsWrite);
  const writeToEmptySpaces = WriteToEmptySpacesFn(
    fsOpen,
    fsRead,
    fsStats,
    fsWrite,
    fsClose
  );
  return async (
    filepath: string,
    buffer: Buffer,
    emptySpaces: Span[]
  ): Promise<number> => {
    const fittingSpaces = findFittingSpaces(buffer.length, emptySpaces);
    return writeToEmptySpaces(filepath, buffer, fittingSpaces);
  };
};

const TruncateIndexFn = (fsStats: FSStatsFn, fsTruncate: FSTruncateFn) => {
  const sizeFn = SizeFn(fsStats);
  const truncateFn = TruncateFn(fsTruncate);
  return async (
    filepath: string,
    contentIndex: ContentIndex
  ): Promise<void> => {
    const fileEndIndex = await sizeFn(filepath);
    const spans = await contentIndex.spans();
    const dataEndIndex = spans.reduce<number>((endIndex, s) => {
      const sEndIdx = s.offset + s.length;
      return sEndIdx > endIndex ? sEndIdx : endIndex;
    }, -1);
    if (dataEndIndex > 20 && fileEndIndex > dataEndIndex) {
      await truncateFn(filepath, dataEndIndex);
    }
  };
};
