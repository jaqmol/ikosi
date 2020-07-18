import {
    FSReadFn,
    ChunkReader,
    Span,
    DataReader,
} from './types';
import {
    ReadFn,
} from './wrappers';
import {
    MakeChunkReader,
} from './chunk-reader';

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

    const spans = async () :Promise<Span[]> => {
        const readers = await chunks();
        return Promise.all(readers.map(r => r.span()));
    };

    return {data, spans};
};