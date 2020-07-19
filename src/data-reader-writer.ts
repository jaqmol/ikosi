import {
    FSReadFn,
    FSWriteFn,
    FSStatsFn,
    ChunkReader,
    Span,
    DataReader,
} from './types';
import {
    ReadFn,
} from './wrappers';
import {
    MakeChunkReader,
    MakeChunkWriter,
} from './chunk-reader-writer';
import {
    MakeSpaceProvider,
} from './spaces-and-spans';
import { NumberFormat } from './number-format';

export const MakeDataReader = (fsRead: FSReadFn, fd: number, startOffset: number) :DataReader => {
    
    const chunks = async () :Promise<ChunkReader[]> => {
        const acc: ChunkReader[] = [];

        let chunkReader = MakeChunkReader(fsRead, fd, startOffset);
        let continuation = await chunkReader.continuation();
        acc.push(chunkReader);
        
        while (continuation > 0) {
            chunkReader = MakeChunkReader(fsRead, fd, continuation); 
            continuation = await chunkReader.continuation();
            acc.push(chunkReader);
        }

        return acc;
    };

    // Public

    const data = async () :Promise<Buffer> => {
        const readers = await chunks();
        const buffers = await Promise.all(readers.map(r => r.data()));
        return Buffer.concat(buffers);
    };

    const envelopeSpans = async () :Promise<Span[]> => {
        const readers = await chunks();
        return Promise.all(readers.map(r => r.envelopeSpan()));
    };

    const dataSpans = async () :Promise<Span[]> => {
        const readers = await chunks();
        return Promise.all(readers.map(r => r.dataSpan()));
    };

    return {data, envelopeSpans, dataSpans};
};

export const MakeDataWriter = (fsStats: FSStatsFn, fsWrite: FSWriteFn, filepath: string, fd: number, occupiedSpans: Span[]) => {
    const provideSpace = MakeSpaceProvider(fsStats, filepath, occupiedSpans);
    const writeChunk = MakeChunkWriter(fsWrite, fd);
    
    return async (data: Buffer) :Promise<Span[]> => {
        let bytesLeft = data.length;
        let offset = 0; 
        let length = data.length;
        let requiredLength = length + NumberFormat.twiceBufferifiedLength;
        let nextSpace = await provideSpace(requiredLength);
        let [occupied, continuation] = await writeChunk(data, {offset, length}, nextSpace);
        const occupiedSpans: Span[] = [occupied];
        bytesLeft -= occupied.length;

        while (bytesLeft > 0) {
            offset = occupied.offset + occupied.length;
            length = data.length - offset;
            requiredLength = length + NumberFormat.twiceBufferifiedLength;
            nextSpace = await provideSpace(requiredLength);
            await continuation(nextSpace.offset);
            [occupied, continuation] = await writeChunk(data, {offset, length}, nextSpace);
            occupiedSpans.push(occupied);
            bytesLeft -= occupied.length;
        }

        await continuation(0);
        return occupiedSpans;
    };
};