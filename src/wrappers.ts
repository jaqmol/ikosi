import { 
    Stats,
} from 'fs';
import {
    FSOpenFn,
    FSCloseFn,
    FSStatsFn,
    FSTruncateFn,
    FSReadFn,
    Span,
    FSWriteFn,
} from './types'


export const OpenForReadingFn = (fsOpen: FSOpenFn) => (filepath: string) =>
    open(fsOpen, filepath, 'r');
export const OpenForWritingFn = (fsOpen: FSOpenFn) => (filepath: string) =>
    open(fsOpen, filepath, 'w');
const open = (
    fsOpen: FSOpenFn,
    filepath: string,
    mode: string
): Promise<number> =>
    new Promise<number>((resolve, reject) => {
        fsOpen(filepath, mode, (err, fd) => {
            if (err) reject(err);
            else resolve(fd);
        });
    });

export const CloseFn = (fsClose: FSCloseFn) => (fd: number): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        fsClose(fd, err => {
            if (err) reject(err);
            else resolve();
        });
    });

export const StatsFn = (fsStats: FSStatsFn) => (
    filepath: string
): Promise<Stats> =>
    new Promise<Stats>((resolve, reject) => {
        fsStats(filepath, (err, stats) => {
            if (err) reject(err);
            else resolve(stats);
        });
    });

export const SizeFn = (fsStats: FSStatsFn) => async (
    filepath: string
): Promise<number> => {
    const stats = StatsFn(fsStats);
    const s = await stats(filepath);
    return s.size;
};

export const TruncateFn = (fsTruncate: FSTruncateFn) => (
    filepath: string,
    size: number
): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        fsTruncate(filepath, size, err => {
            if (err) reject(err);
            else resolve();
        });
    });

export const ReadFn = (fsRead: FSReadFn) => (
    fd: number,
    fileSpan: Span
): Promise<Buffer> =>
    new Promise<Buffer>((resolve, reject) => {
        const buffer = Buffer.alloc(fileSpan.length);
        fsRead(fd, buffer, 0, fileSpan.length, fileSpan.offset, (err, _, buff) => {
            if (err) reject(err);
            else resolve(buff);
        });
    });

export const WriteFn = (fsWrite: FSWriteFn) => (
    fd: number,
    buffer: Buffer,
    bufferSpan: Span,
    filePosition: number
): Promise<number> =>
    new Promise<number>((resolve, reject) => {
        fsWrite(
            fd,
            buffer,
            bufferSpan.offset,
            bufferSpan.length,
            filePosition,
            (err, bytesWritten) => {
                if (err) reject(err);
                else resolve(bytesWritten);
            }
        );
    });