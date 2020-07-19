import {
    FSReadFn,
} from './types';
import { 
    MakeDataReader,
} from "./data-reader-writer";

export const MakeEntriesIterator = (
    openForReading: (filepath: string) => Promise<number>,
    fsRead: FSReadFn,
    close: (fd: number) => Promise<void>, 
    filepath: string,
    index: Map<string, number>,
) :AsyncIterator<[string, Buffer], undefined, undefined> => {
    let fileDescriptor = async () => {
        const fd = await openForReading(filepath);
        fileDescriptor = async () => fd;
        return fd;
    };
    const ito = index.entries();

    const next = async () :Promise<IteratorResult<[string, Buffer]>> => {
        const result = ito.next();
        const [key, offset] :[string, number] = result.value;
        const done = !!result.done;
        const fd = await fileDescriptor();
        const reader = MakeDataReader(fsRead, fd, offset);
        const data = await reader.data();
        if (done) {
            await close(fd);
        }
        return {
            value: [key, data],
            done,
        };
    };

    return { next };
}

export const MakeKeysIterator = (
    index: Map<string, number>,
) :AsyncIterator<string, undefined, undefined> => {
    const ito = index.keys();

    const next = async () :Promise<IteratorResult<string>> => {
        const result = ito.next();
        const value :string = result.value;
        const done = !!result.done;
        return { value, done };
    };

    return { next };
}

export const MakeValuesIterator = (
    openForReading: (filepath: string) => Promise<number>,
    fsRead: FSReadFn,
    close: (fd: number) => Promise<void>, 
    filepath: string,
    index: Map<string, number>,
) :AsyncIterator<Buffer, undefined, undefined> => {
    let fileDescriptor = async () => {
        const fd = await openForReading(filepath);
        fileDescriptor = async () => fd;
        return fd;
    };
    const ito = index.values();

    const next = async () :Promise<IteratorResult<Buffer>> => {
        const result = ito.next();
        const offset :number = result.value;
        const done = !!result.done;
        const fd = await fileDescriptor();
        const reader = MakeDataReader(fsRead, fd, offset);
        const value = await reader.data();
        if (done) {
            await close(fd);
        }
        return { value, done };
    };

    return { next };
}