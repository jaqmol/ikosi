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
        let nextSpace = await provideSpace(length);
        let [occupiedSpan, continuation] = await writeChunk(data, {offset, length}, nextSpace);
        const occupiedSpans: Span[] = [occupiedSpan];
        bytesLeft -= occupiedSpan.length;

        while (bytesLeft > 0) {
            offset = occupiedSpan.offset + occupiedSpan.length;
            length = data.length - offset;
            nextSpace = await provideSpace(length);
            await continuation(nextSpace.offset);
            [occupiedSpan, continuation] = await writeChunk(data, {offset, length}, nextSpace);
            occupiedSpans.push(occupiedSpan);
            bytesLeft -= occupiedSpan.length;
        }

        await continuation(0);
        return occupiedSpans;
    };
};