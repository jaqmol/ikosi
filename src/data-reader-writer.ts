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
    ChunkWritingResult,
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

export const MakeDataWriter = (fsWrite: FSWriteFn, fd: number, occupiedSpans: Span[]) => {
    const provideSpace = MakeSpaceProvider(occupiedSpans);
    const writeChunk = MakeChunkWriter(fsWrite, fd);

    return async (data: Buffer) :Promise<Span[]> => {
        const sizing = MakeSizingProvider(data.length);
        let offset = 0;
        let [envelopeLength, dataSpan] = sizing(offset);
        let nextSpace = await provideSpace(envelopeLength());
        let [lastOccupied, lastContinuation] = await writeChunk(data, dataSpan(nextSpace), nextSpace);

        const occupiedSpans: Span[] = [lastOccupied];
        offset += lastOccupied.length;

        while (offset < data.length) {
            [envelopeLength, dataSpan] = sizing(offset);
            nextSpace = await provideSpace(envelopeLength());
            await lastContinuation(nextSpace.offset);
            
            [lastOccupied, lastContinuation] = await writeChunk(data, dataSpan(nextSpace), nextSpace);
            
            occupiedSpans.push(lastOccupied);
            offset += lastOccupied.length;
        }

        await lastContinuation(0);
        return occupiedSpans;
    };
};

type SizingFunctions = [() => number, (nextSpace: Span) => Span];
const MakeSizingProvider = (dataLength: number) => (offset: number) :SizingFunctions => {
    const remainingLength = dataLength - offset;
    return [
        () => { // envelopeLength
            const remainingDataLength = dataLength - offset;
            return remainingDataLength + NumberFormat.twiceBufferifiedLength;
        },
        (nextSpace: Span) => { // dataSpan
            const nextSpaceDataLength = nextSpace.length - NumberFormat.twiceBufferifiedLength;
            const length = Math.min(remainingLength, nextSpaceDataLength);
            return {offset, length};
        }
    ];
};


