import {
    ChunkReader,
    Span,
    BufferSpan,
} from './types';

import {NumberFormat} from './number-format';

import { 
    readFromFile,
    writeToFile,
} from "./file-utils";

export const MakeChunkReader = (fd: number, startOffset: number) :ChunkReader => {
    const length = async () :Promise<number> => {
        const span = {offset: startOffset, length: NumberFormat.bufferifiedLength};
        const lenBuff = await readFromFile(fd, span);
        return NumberFormat.parse(lenBuff);
    };

    // Public
    
    const continuation = async () :Promise<number> => {
        const len = await length();
        const continuationSpan = {
            offset: startOffset + len - NumberFormat.bufferifiedLength, 
            length: NumberFormat.bufferifiedLength,
        };
        const continuationBuff = await readFromFile(fd, continuationSpan);
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
        return readFromFile(fd, span);
    };

    return {continuation, envelopeSpan, dataSpan, data};
};

export type ChunkWritingResult = [
    Span,
    (position: number) => Promise<void>,
]

export const MakeChunkWriter = (fd: number) => {
    return async (bufferSpan: BufferSpan, space: Span) :Promise<ChunkWritingResult> => {
        const requiredLength = bufferSpan.length + NumberFormat.twiceBufferifiedLength;
        if (space.length < requiredLength) throw new Error(`Space length (${space.length}) too small for data span length (${bufferSpan.length})`);
        const dataFilePosition = space.offset + NumberFormat.bufferifiedLength;
        const lengthWritten = await writeToFile(fd, bufferSpan, dataFilePosition);
        
        const occupiedLength = lengthWritten + NumberFormat.twiceBufferifiedLength;
        const occupiedLengthBuff = NumberFormat.bufferify(occupiedLength);
        const occupiedLengthBuffSpan = {
            buffer: occupiedLengthBuff,
            offset: 0, 
            length: occupiedLengthBuff.length,
        };
        await writeToFile(fd, occupiedLengthBuffSpan, space.offset);

        const occupied = {offset: space.offset, length: occupiedLength};

        return [
            occupied,
            async (continuation: number) => {
                const contFilePosition = occupied.offset + occupied.length - NumberFormat.bufferifiedLength;
                const contBuff = NumberFormat.bufferify(continuation);
                const contBuffSpan = {
                    buffer: contBuff,
                    offset: 0, 
                    length: contBuff.length,
                };
                await writeToFile(fd, contBuffSpan, contFilePosition);
            },
        ];
    };
};