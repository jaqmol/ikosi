import fs from 'fs';
import { Span } from './shared';

export const openForReading = (filepath: string) => open(filepath, 'r');
export const openForWriting = (filepath: string) => open(filepath, 'w');

function open(filepath: string, mode: string) : Promise<number> {
    return new Promise<number>((resolve, reject) => {
        fs.open(filepath, mode, (err, fd) => {
            if (err) reject(err)
            else resolve(fd)
        });
    });
}

export function close(fd: number) : Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.close(fd, err => {
            if (err) reject(err)
            else resolve()
        });
    });
}

export const chunk = {
    span: async (fd: number, offset: number) : Promise<Span> => {
        const buffer = await read(fd, {offset, length: 20});
        const length = Number.parseInt(buffer.toString());
        return {offset, length};
    },
    read: (fd: number, chunkSpan: Span) : Promise<Buffer> => {
        return read(fd, {
            offset: chunkSpan.offset + 20,
            length: chunkSpan.length - 40,
        });
    },
    continuation: async(fd: number, chunkSpan: Span) : Promise<number> => {
        const buffer = await read(fd, {
            offset: chunkSpan.offset + chunkSpan.length - 20, 
            length: 20
        });
        return Number.parseInt(buffer.toString());
    },
    isSpaceUsable: (space: Span) : boolean => space.length >= 60,
    contentSpan: (space: Span) : Span => ({
        offset: space.offset + 20,
        length: space.length - 40,
    }),
    writeLength: async (fd: number, length: number, filePosition: number) : Promise<void> => {
        const lengthStr = `${length}`.padStart(20, '0');
        const buffer = Buffer.from(lengthStr);
        await write(fd, buffer, {offset: 0, length: buffer.length}, filePosition);
    },
    writeContinuation: async (fd: number, continuation: number, filePosition: number) : Promise<void> => {
        const continuationStr = `${continuation}`.padStart(20, '0');
        const buffer = Buffer.from(continuationStr);
        await write(fd, buffer, {offset: 0, length: buffer.length}, filePosition);
    },
    writeToSpace: async (
        fd: number, 
        buffer: Buffer, 
        bufferOffset: number, 
        space: Span, 
        continuation: number,
    ) : Promise<number> => {
        if (!chunk.isSpaceUsable(space)) return 0;
        const fileContentSpan = chunk.contentSpan(space);
        let bufferRemainingLength = buffer.length - bufferOffset;
        if (bufferRemainingLength < fileContentSpan.length) {
            fileContentSpan.length = bufferRemainingLength;
        }
        await chunk.writeLength(fd, fileContentSpan.length, space.offset);
        const bufferSpan = {offset: bufferOffset, length: fileContentSpan.length};
        const bytesWritten = await write(fd, buffer, bufferSpan, fileContentSpan.offset);
        bufferRemainingLength -= bytesWritten;
        const continuationFilePosition = fileContentSpan.offset + fileContentSpan.length;
        if (bufferRemainingLength === 0) {
            chunk.writeContinuation(fd, 0, continuationFilePosition);
        } else {
            chunk.writeContinuation(fd, continuation, continuationFilePosition);
        }
        return bytesWritten;
    },
};

export function stats(filepath: string) : Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
        fs.stat(filepath, (err, stats) => {
            if (err) reject(err)
            else resolve(stats)
        });
    });
}

export function truncate(filepath: string, size: number) : Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.truncate(filepath, size, err => {
            if (err) reject(err)
            else resolve()
        });
    });
}

export function read(fd: number, fileSpan: Span) : Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const buffer = Buffer.alloc(fileSpan.length);
        fs.read(fd, buffer, 0, fileSpan.length, fileSpan.offset, (err, _, buff) => {
            if (err) reject(err);
            else resolve(buff);
        });
    });
}

export function write(fd: number, buffer: Buffer, bufferSpan: Span, filePosition: number) : Promise<number> {
    return new Promise<number>((resolve, reject) => {
        fs.write(fd, buffer, bufferSpan.offset, bufferSpan.length, filePosition, (err, bytesWritten) => {
            if (err) reject(err);
            else resolve(bytesWritten);
        });
    });
}

export async function size(filepath: string) : Promise<number> {
    const s = await stats(filepath);
    return s.size;
}