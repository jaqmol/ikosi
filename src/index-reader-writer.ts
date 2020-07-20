import {
    Span,
    IndexStorageFormat,
} from './types';

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

import {
    readFromFile,
    writeToFile,
} from "./file-utils";

export const readIndex = async (fd: number) :Promise<Map<string, number>|null> => {
    const offset = await readIndexOffset(fd);
    if (Number.isNaN(offset)) return null;

    const reader = MakeDataReader(fd, offset);
    const storageBuffer = await reader.data();
    const storageString = storageBuffer.toString();
    const storageFormat :IndexStorageFormat = JSON.parse(storageString);
    const index = new Map<string, number>(storageFormat);

    return index;
};

export const readOccupiedSpansAndWriteIndex = async (
    fd: number, 
    index: Map<string, number>,
) :Promise<Span[]> => {
    const indexOffset = await readIndexOffset(fd);
    const valueOffsets = Array.from(index.values());
    const occupiedSpans = await collectOccupiedSpans(fd, indexOffset, valueOffsets); 
    return writeIndex(fd, occupiedSpans, index);
};

export const writeIndex = async (
    fd: number, 
    occupiedSpans: Span[],
    index: Map<string, number>,
) :Promise<Span[]> => {
    const storageFormat :IndexStorageFormat = [...index.entries()];
    const storageString = JSON.stringify(storageFormat);
    const storageBuffer = Buffer.from(storageString);

    const write = MakeDataWriter(fd, occupiedSpans);
    const writtenSpans = await write(storageBuffer);
    const indexOffset = writtenSpans[0].offset;
    await writeIndexOffset(fd, indexOffset);

    return writtenSpans;
};

export const readIndexOffset = async (fd: number) :Promise<number> => {
    const offsetSpan = {offset: 0, length: NumberFormat.bufferifiedLength};
    const offsetBuff = await readFromFile(fd, offsetSpan);
    return NumberFormat.parse(offsetBuff);
};

export const writeIndexOffset = async (fd: number, offset: number) :Promise<void> => {
    const buffer = NumberFormat.bufferify(offset);
    const buffSpan = {buffer, offset: 0, length: buffer.length};
    await writeToFile(fd, buffSpan, 0);
};