import {
    FSReadFn,
    FSWriteFn,
    FSStatsFn,
    Span,
    IndexStorageFormat,
} from './types';

import {
    SizeFn,
    ReadFn,
    WriteFn,
} from './wrappers';

import {
    MakeDataReader,
    MakeDataWriter,
} from './data-reader-writer';

import {
    NumberFormat,
} from './number-format';

import {
    collectOccupiedSpans
} from './spaces-and-spans';

export const readIndex = async (fsRead: FSReadFn, fd: number) :Promise<Map<string, number>> => {
    const offset = await readIndexOffset(fsRead, fd);
    const reader = MakeDataReader(fsRead, fd, offset);

    const storageBuffer = await reader.data();
    const storageString = storageBuffer.toString();
    const storageFormat :IndexStorageFormat = JSON.parse(storageString);
    const index = new Map<string, number>(storageFormat);

    return index;
};

export const writeIndex = async (
    fsStats: FSStatsFn, 
    fsRead: FSReadFn, 
    fsWrite: FSWriteFn, 
    filepath: string, 
    fd: number, 
    index: Map<string, number>,
) :Promise<Span[]> => {
    const indexOffset = await readIndexOffset(fsRead, fd);
    const valueOffsets = Array.from(index.values());
    const occupiedSpans = await collectOccupiedSpans(fsRead, fd, indexOffset, valueOffsets); 

    const storageFormat :IndexStorageFormat = [...index.entries()];
    const storageString = JSON.stringify(storageFormat);
    const storageBuffer = Buffer.from(storageString);

    const write = MakeDataWriter(fsStats, fsWrite, filepath, fd, occupiedSpans);
    const writtenSpans = await write(storageBuffer);
    await writeIndexOffset(fsWrite, fd, writtenSpans[0].offset);
    return writtenSpans;
};

export const readIndexOffset = async (fsRead: FSReadFn, fd: number) :Promise<number> => {
    const read = ReadFn(fsRead);
    const offsetSpan = {offset: 0, length: NumberFormat.bufferifiedLength};
    const offsetBuff = await read(fd, offsetSpan);
    return NumberFormat.parse(offsetBuff);
};

export const writeIndexOffset = async (fsWrite: FSWriteFn, fd: number, offset: number) :Promise<number> => {
    const write = WriteFn(fsWrite);
    const offsetBuff = NumberFormat.bufferify(offset);
    const offsetSpan = {offset: 0, length: offsetBuff.length};
    return write(fd, offsetBuff, offsetSpan, 0);
};