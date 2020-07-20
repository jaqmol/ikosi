import {
} from './types';

import { 
    readIndex,
    readIndexOffset,
    readOccupiedSpansAndWriteIndex,
    writeIndex,
    writeIndexOffset,
} from "./index-reader-writer";

import {
    MakeDataReader,
    MakeDataWriter,
} from './data-reader-writer';

import {
    MakeEntriesIterator,
    MakeKeysIterator,
    MakeValuesIterator,
} from './iterators';

import {
    collectOccupiedSpans
} from './spaces-and-spans';

import { 
    MakeJobSequence,
} from "./job-sequence";

import { 
    NumberFormat,
} from "./number-format";

import { 
    openFile,
    closeFile,
} from "./file-utils";

export interface Ikosi {
    get(key: string) :Promise<Buffer>
    set(key: string, data: Buffer) :Promise<void>
    has(key: string) :Promise<boolean>
    delete(key: string) :Promise<boolean>
    clear(confirm: () => Promise<boolean>) :Promise<void>
    entries() :AsyncIterator<[string, Buffer], undefined, undefined>
    keys() :AsyncIterator<string, undefined, undefined>
    values() :AsyncIterator<Buffer, undefined, undefined>
}

export const MakeIkosi = async (filepath: string) => {
    const index = await initIndex(filepath);
    
    const get = async (key: string) :Promise<Buffer|undefined> => {
        const fd = await openFile(filepath);
        const offset = index.get(key);
        if (typeof offset === 'undefined') return;
        const reader = MakeDataReader(fd, offset);
        const data = await reader.data();
        await closeFile(fd);
        return data;
    };

    let sequenceSetJob = MakeJobSequence<void>();
    const set = (key: string, data: Buffer) => new Promise<void>((resolve, reject) => {
        sequenceSetJob(
            async (done) => {
                const fd = await openFile(filepath);
        
                const indexOffset = await readIndexOffset(fd);
                const valueOffsets = Array.from(index.values());
                const occupiedSpans = await collectOccupiedSpans(fd, indexOffset, valueOffsets);
                
                const write = MakeDataWriter(fd, occupiedSpans);
                const writtenSpans = await write(data);
                occupiedSpans.push(...writtenSpans);

                index.set(key, writtenSpans[0].offset);

                await writeIndex(fd, occupiedSpans, index);

                // TODO: TRUNCATION

                await closeFile(fd);
                done(null);
            },
            resolve,
            reject,
        );
    });

    const has = (key: string) :Promise<boolean> =>
        Promise.resolve(index.has(key));

    const deleteFn = async (key: string) :Promise<boolean> => {
        const result = index.delete(key);
        const fd = await openFile(filepath);
        await readOccupiedSpansAndWriteIndex(fd, index);
        // TODO: TRUNCATION
        await closeFile(fd);
        return result;
    };

    const clear = async (confirm: () => Promise<boolean>) :Promise<void> => {
        const confirmed = await confirm();
        if (confirmed) {
            index.clear();
            const fd = await openFile(filepath);
            await readOccupiedSpansAndWriteIndex(fd, index);
            // TODO: TRUNCATION
            await closeFile(fd);
        }
    };

    const entries = () :AsyncIterator<[string, Buffer], undefined, undefined> =>
        MakeEntriesIterator(filepath, index);
    
    const keys = () :AsyncIterator<string, undefined, undefined> =>
        MakeKeysIterator(index);

    const values = () :AsyncIterator<Buffer, undefined, undefined> =>
        MakeValuesIterator(filepath, index);

    return {
        get,
        set,
        has,
        'delete': deleteFn,
        clear,
        entries,
        keys,
        values,
    };
};

export const initIndex = async (filepath: string) => {
    const fd = await openFile(filepath);
    let index = await readIndex(fd);
    if (!index) {
        index = new Map<string, number>();
        await readOccupiedSpansAndWriteIndex(fd, index);
    }
    await closeFile(fd);
    return index;
};