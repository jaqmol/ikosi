export interface Span {
    offset: number;
    length: number;
}

export interface BufferSpan {
    buffer: Buffer;
    offset: number;
    length: number;
}

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

