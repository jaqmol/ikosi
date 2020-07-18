import { ContentIndex } from './content-index';
import {
  ReadChunksFromFileFn,
  WriteToEmptySpacesFn,
  findFittingSpaces,
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
  set(key: string, value: Buffer|string): Promise<void>;
  get(key: string): Promise<Buffer|undefined>;
  remove(key: string): Promise<boolean>;
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
  const writeValue = WriteValueFn(fsOpen, fsStats, fsWrite, fsClose);
  const truncateIndex = TruncateIndexFn(fsStats, fsTruncate);
  const readValue = ReadValueFn(fsOpen, fsRead, fsClose);

  const set = async (
    key: string,
    value: Buffer|string
  ): Promise<void> => {
    const buffer = typeof value === 'string' ? Buffer.from(value) : value;
    const emptySpaces = await contentIndex.spaces();
    const occupiedSpaces = await writeValue(filepath, buffer, emptySpaces);
    await contentIndex.setOffset(key, occupiedSpaces[0].offset);
    await truncateIndex(filepath, contentIndex);
  };
  const get = async (key: string): Promise<Buffer|undefined> => {
    const offset = await contentIndex.offset(key);
    if (offset) return readValue(filepath, offset);
  };
  const remove = async (key: string): Promise<boolean> => {
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

export const ReadValueFn = (
  fsOpen: FSOpenFn,
  fsRead: FSReadFn,
  fsClose: FSCloseFn
) => {
  const openForReadingFn = OpenForReadingFn(fsOpen);
  const readChunksFromFile = ReadChunksFromFileFn(fsRead);
  const closeFn = CloseFn(fsClose);
  return async (filepath: string, offset: number): Promise<Buffer> => {
    const fd = await openForReadingFn(filepath);
    const value = await readChunksFromFile(fd, offset);
    await closeFn(fd);
    return value;
  };
};

export const WriteValueFn = (
  fsOpen: FSOpenFn,
  fsStats: FSStatsFn,
  fsWrite: FSWriteFn,
  fsClose: FSCloseFn
) => {
  const writeToEmptySpaces = WriteToEmptySpacesFn(fsOpen, fsStats, fsWrite, fsClose);
  return async (
    filepath: string,
    buffer: Buffer,
    emptySpaces: Span[]
  ): Promise<Span[]> => {
    const fittingSpaces = findFittingSpaces(buffer.length, emptySpaces);
    return writeToEmptySpaces(filepath, buffer, fittingSpaces);
  };
};

//     {
//     const fileEndPosition = await sizeFn(filepath);
//     const indexSpansEndPosition = await findEndPosition(contentIndex.indexSpans);
//     const contentSpansEndPosition = await findEndPosition(contentIndex.contentSpans);
//     console.log('fileEndPosition:', fileEndPosition);
//     console.log('indexSpansEndPosition:', indexSpansEndPosition);
//     console.log('contentSpansEndPosition:', contentSpansEndPosition);
//     const dataEndPosition = contentSpansEndPosition; // Math.max(contentSpansEndPosition, indexSpansEndPosition);
//     // console.log('dataEndPosition:', dataEndPosition);
//     if ((dataEndPosition > 20) && (fileEndPosition > dataEndPosition)) {
//       console.log('PERFORMING TRUNCATION');
//       await truncateFn(filepath, dataEndPosition);
//     }
//   };
// };

export const TruncateIndexFn = (fsStats: FSStatsFn, fsTruncate: FSTruncateFn) => {
  const sizeFn = SizeFn(fsStats);
  const truncateFn = TruncateFn(fsTruncate);
  return async (
    filepath: string,
    contentIndex: ContentIndex
  ): Promise<void> => {
    const contentSpansEndPosition = await findEndPosition(contentIndex.contentSpans);
    const indexSpansEndPosition = await findEndPosition(contentIndex.indexSpans);
    const fileEndPosition = await sizeFn(filepath);
    console.log('fileEndPosition:', typeof fileEndPosition);
    console.log('indexSpansEndPosition:', typeof indexSpansEndPosition);
    console.log('contentSpansEndPosition:', typeof contentSpansEndPosition);
    const dataEndPosition = contentSpansEndPosition; // Math.max(contentSpansEndPosition, indexSpansEndPosition);
    // console.log('dataEndPosition:', dataEndPosition);
    if ((dataEndPosition > 20) && (fileEndPosition > dataEndPosition)) {
      console.log('PERFORMING TRUNCATION');
      await truncateFn(filepath, dataEndPosition);
    } else {
      console.log('NOT PERFORMING TRUNCATION');
    }
  };
};

const findEndPosition = async (getSpans: () => Promise<Span[]>) => {
  const spans = await getSpans();
  const endPositions = spans.map(s => s.offset + s.length);
  return endPositions.length ? Math.max(...endPositions) : 0;
};

// const findMax = (...numbers: number[]) => {
//   console.log('finding max in numbers:', numbers);
//   let len = numbers.length;
//   let max = -Infinity;
//   while (len--) {
//     max = numbers[len] > max ? numbers[len] : max;
//   }
//   return max;
// }
