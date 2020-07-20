import {
    Span,
    FSAccessFn,
    FSOpenFn,
    FSCloseFn,
    FSReadFn,
    FSWriteFn,
    FSStatsFn,
} from './types';
import {
    ExistsFn,
    OpenForReadingFn,
    OpenForReadingAndWritingFn,
    OpenTruncatedForReadingAndWritingFn,
    WriteFn,
    CloseFn,
} from './wrappers';
import { 
    readIndex,
    readIndexOffset,
    writeIndex,
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
import fs from 'fs';

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

export const MakeIkosi = async (
    filepath: string,
    fsAccess: FSAccessFn = fs.access,
    fsOpen: FSOpenFn = fs.open,
    fsStats: FSStatsFn = fs.stat,
    fsRead: FSReadFn = fs.read, 
    fsWrite: FSWriteFn = fs.write, 
    fsClose: FSCloseFn = fs.close, 
) => {
    const openForReading = OpenForReadingFn(fsOpen);
    const openForReadingAndWriting = OpenForReadingAndWritingFn(fsOpen);
    const close = CloseFn(fsClose);
    const index = await initIndex(
        fsAccess, 
        fsStats, 
        fsOpen, 
        fsRead, 
        fsWrite, 
        openForReadingAndWriting, 
        close, 
        filepath,
    );
    
    const get = async (key: string) :Promise<Buffer|undefined> => {
        const fd = await openForReading(filepath);
        const offset = index.get(key);
        if (typeof offset === 'undefined') return;
        const reader = MakeDataReader(fsRead, fd, offset);
        const data = await reader.data();
        await close(fd);
        return data;
    };

    let sequenceSetJob = MakeJobSequence<void>();
    const set = (key: string, data: Buffer) => new Promise<void>((resolve, reject) => {
        sequenceSetJob(
            async (done) => {
                const fd = await openForReadingAndWriting(filepath);
        
                const indexOffset = await readIndexOffset(fsRead, fd);
                console.log('indexOffset:', indexOffset);
                const valueOffsets = Array.from(index.values());
                console.log('valueOffsets:', valueOffsets);
                const occupiedSpans = await collectOccupiedSpans(fsRead, fd, indexOffset, valueOffsets);
                console.log('occupiedSpans:', occupiedSpans);
                
                const write = MakeDataWriter(fsWrite, fd, occupiedSpans);
                const writtenSpans = await write(data);
                index.set(key, writtenSpans[0].offset);
                await writeIndex(fsRead, fsWrite, fd, index);

                // TODO: TRUNCATION

                await close(fd);
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
        const fd = await openForReadingAndWriting(filepath);
        await writeIndex(fsRead, fsWrite, fd, index);
        // TODO: TRUNCATION
        await close(fd);
        return result;
    };

    const clear = async (confirm: () => Promise<boolean>) :Promise<void> => {
        const confirmed = await confirm();
        if (confirmed) {
            index.clear();
            const fd = await openForReadingAndWriting(filepath);
            await writeIndex(fsRead, fsWrite, fd, index);
            // TODO: TRUNCATION
            await close(fd);
        }
    };

    const entries = () :AsyncIterator<[string, Buffer], undefined, undefined> =>
        MakeEntriesIterator(openForReading, fsRead, close, filepath, index);
    
    const keys = () :AsyncIterator<string, undefined, undefined> =>
        MakeKeysIterator(index);

    const values = () :AsyncIterator<Buffer, undefined, undefined> =>
        MakeValuesIterator(openForReading, fsRead, close, filepath, index);

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

export const initIndex = async (
    fsAccess: FSAccessFn,
    fsStats: FSStatsFn,
    fsOpen: FSOpenFn,
    fsRead: FSReadFn,
    fsWrite: FSWriteFn,
    openForReadingAndWriting: (filepath: string) => Promise<number>,
    close: (fd: number) => Promise<void>, 
    filepath: string,
) => {
    const exists = ExistsFn(fsAccess);
    const fileExists = await exists(filepath);
    if (fileExists) {
        const fd = await openForReadingAndWriting(filepath);
        const index = await readIndex(fsRead, fd);
        await close(fd);
        return index;
    } else {
        await createFile(fsOpen, fsWrite, close, filepath);
        const index = new Map<string, number>();
        const fd = await openForReadingAndWriting(filepath);
        await writeIndex(fsRead, fsWrite, fd, index);
        await close(fd);
        return index
    }
};

export const createFile = async (
    fsOpen: FSOpenFn,
    fsWrite: FSWriteFn,
    close: (fd: number) => Promise<void>,
    filepath: string,
) => {
    const open = OpenTruncatedForReadingAndWritingFn(fsOpen);
    const write = WriteFn(fsWrite);
    const fd = await open(filepath);
    const nullBuff = NumberFormat.bufferify(0);
    const nullBuffSpan = {offset: 0, length: nullBuff.length};
    await write(fd, nullBuff, nullBuffSpan, 0);
    await close(fd);
};