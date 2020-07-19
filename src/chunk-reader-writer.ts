import {
    FSReadFn,
    FSWriteFn,
    ChunkReader,
    Span,
} from './types';
import {
    ReadFn,
    WriteFn,
} from './wrappers';
import {NumberFormat} from './number-format';

export const MakeChunkReader = (fsRead: FSReadFn, fd: number, startOffset: number) :ChunkReader => {
    const read = ReadFn(fsRead);
    
    const length = async () :Promise<number> => {
        const span = {offset: startOffset, length: NumberFormat.bufferifiedLength};
        const lenBuff = await read(fd, span);
        return NumberFormat.parse(lenBuff);
    };

    // Public
    
    const continuation = async () :Promise<number> => {
        const len = await length();
        const continuationSpan = {
            offset: startOffset + len - NumberFormat.bufferifiedLength, 
            length: NumberFormat.bufferifiedLength,
        };
        const continuationBuff = await read(fd, continuationSpan);
        return NumberFormat.parse(continuationBuff);
    };
    
    const envelopeSpan = async () :Promise<Span> => {
        const len = await length();
        return {offset: startOffset, length: len};
    };
    
    const dataSpan = async () :Promise<Span> => {
        const envSpan = await envelopeSpan();
        return {
            offset: envSpan.offset + NumberFormat.bufferifiedLength, 
            length: envSpan.length - NumberFormat.twiceBufferifiedLength,
        };
    };

    const data = async () :Promise<Buffer> => {
        const span = await dataSpan();
        return read(fd, span);
    };

    return {continuation, envelopeSpan, dataSpan, data};
};

type ChunkWritingResult = [
    Span,
    (position: number) => Promise<void>,
]

export const MakeChunkWriter = (fsWrite: FSWriteFn, fd: number) => {
    const write = WriteFn(fsWrite);

    // Public
    
    return async (data: Buffer, dataSpan: Span, space: Span) :Promise<ChunkWritingResult> => {
        const requiredLength = dataSpan.length + NumberFormat.twiceBufferifiedLength;
        if (space.length < requiredLength) throw new Error(`Space length (${space.length}) too small for data span length (${dataSpan.length})`);
        const dataFilePosition = space.offset + NumberFormat.bufferifiedLength;
        const lengthWritten = await write(fd, data, dataSpan, dataFilePosition);
        
        const occupiedLength = lengthWritten + NumberFormat.twiceBufferifiedLength;
        const occupiedLengthBuff = NumberFormat.bufferify(occupiedLength);
        const occupiedLengthSpan = {offset: 0, length: occupiedLengthBuff.length};
        await write(fd, occupiedLengthBuff, occupiedLengthSpan, space.offset);

        const occupied = {offset: space.offset, length: occupiedLength};

        return [
            occupied,
            async (continuation: number) => {
                const contFilePosition = occupied.offset + occupied.length - NumberFormat.bufferifiedLength;
                const contBuff = NumberFormat.bufferify(continuation);
                const contSpan = {offset: 0, length: contBuff.length};
                await write(fd, contBuff, contSpan, contFilePosition);
            },
        ];
    };
};