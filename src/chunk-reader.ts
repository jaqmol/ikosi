import {
    FSReadFn,
    ChunkReader,
    Span,
} from './types';
import {
    ReadFn,
} from './wrappers';

export const MakeChunkReader = (fsRead: FSReadFn, fd: number, startOffset: number) :ChunkReader => {
    const read = ReadFn(fsRead);
    
    const length = async () :Promise<number> => {
        const lenBuff = await read(fd, {offset: startOffset, length: 20});
        return Number.parseInt(lenBuff.toString(), 10);
    };

    // Public

    const data = async () :Promise<Buffer> => {
        const len = await length();
        return read(fd, {
            offset: startOffset + 20,
            length: len - 40,
        });
    };

    const continuation = async () :Promise<number> => {
        const len = await length();
        const lenBuff = await read(fd, {offset: len - 20, length: 20});
        return Number.parseInt(lenBuff.toString(), 10);
    };

    const span = async () :Promise<Span> => {
        const len = await length();
        return {offset: startOffset, length: len};
    };

    return {data, continuation, span};
};