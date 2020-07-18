import {
    Span,
    IndexStorageFormat,
} from './types';

export const MakeIndex = async (
    read: () => Promise<Buffer>,
    write: (data: Buffer) => Promise<void>,
) => {
    const index = new Map<string, Span[]>();

};

export const writeStorageFormat = async (
    index: Map<string, Span[]>,
    write: (data: Buffer) => Promise<void>,
) => {
    const storageFormat :IndexStorageFormat = Array.from(index.entries()).map(
        ([key, spans]) => [key, spans[0].offset]
    );
    const storageString = JSON.stringify(storageFormat);
    const storageBuffer = Buffer.from(storageString);
    await write(storageBuffer);
};