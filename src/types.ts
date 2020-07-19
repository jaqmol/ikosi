import { 
    Stats,
} from 'fs';

export interface Span {
    offset: number;
    length: number;
}

export type FSAccessFn = (
    path: string,
    mode: number,
    callback: (err: NodeJS.ErrnoException | null) => void
) => void;

export type FSOpenFn = (
    path: string,
    flags: string,
    callback: (err: NodeJS.ErrnoException | null, fd: number) => void
) => void;

export type FSCloseFn = (
    fd: number,
    callback: (err: NodeJS.ErrnoException | null) => void
) => void;

export type FSStatsFn = (
    path: string,
    callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void
) => void;

export type FSTruncateFn = (
    path: string,
    len: number | undefined | null,
    callback: (err: NodeJS.ErrnoException | null) => void
) => void;

export type FSReadFn = (
    fd: number,
    buffer: Buffer,
    offset: number,
    length: number,
    position: number | null,
    callback: (
        err: NodeJS.ErrnoException | null,
        bytesRead: number,
        buffer: Buffer
    ) => void
) => void;

export type FSWriteFn = (
    fd: number,
    buffer: Buffer,
    offset: number | undefined | null,
    length: number | undefined | null,
    position: number | undefined | null,
    callback: (
        err: NodeJS.ErrnoException | null,
        written: number,
        buffer: Buffer
    ) => void
) => void;

export interface ChunkReader {
    continuation() :Promise<number>
    envelopeSpan() :Promise<Span>
    dataSpan() :Promise<Span>
    data() :Promise<Buffer>
}

export interface DataReader {
    envelopeSpans() :Promise<Span[]>
    dataSpans() :Promise<Span[]>
    data() :Promise<Buffer>
}

export type IndexStorageFormat = [string, number][];
