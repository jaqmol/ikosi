import { Span } from './shared';
import { Stats } from 'fs';

export interface PassedRWValues {
    fd: number
    buffer: Buffer | null
    offset: number
    length: number
    position: number
}

export const makeFsOpen = (fd: number = 11) => {
    const passed = {
        filepath: '',
        flag: '',
    };
    const fsOpen = (
        filepath: string,
        flag: string,
        callback: (err: NodeJS.ErrnoException|null, fd: number) => void,
    ) => {
        passed.filepath = filepath;
        passed.flag = flag;
        callback(null, fd);
    };
    fsOpen.passed = passed;
    return fsOpen;
};

export const makeFsClose = () => {
    const passed = {
        fd: -1,
    };
    const fsClose = (
        fd: number,
        callback: (err: NodeJS.ErrnoException | null) => void,
    ) => {
        passed.fd = fd;
        callback(null);
    };
    fsClose.passed = passed;
    return fsClose;
};

export const makeFsRead = (fileBuffer?: Buffer) => {
    const passed: PassedRWValues = {
        fd: -1,
        buffer: null,
        offset: -1,
        length: -1,
        position: -1,
    };
    const fsRead = (
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
    ) => {
        position = position || 0;
        if (fileBuffer) {
            fileBuffer.copy(buffer, offset, position, position + length);
        }
        passed.fd = fd;
        passed.buffer = buffer;
        passed.offset = offset;
        passed.length = length;
        passed.position = position;
        callback(null, length, buffer);
    };
    fsRead.passed = passed;
    return fsRead;
};

export const makeFsStats = () => {
    const passed = {
        filepath: '',
    };
    const fsStats = (
        filepath: string,
        callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void
    ) => {
        passed.filepath = filepath;
        callback(null, testStatsValue);
    };
    fsStats.passed = passed;
    return fsStats;
};

export const makeFsWrite = () => {
    const passed: PassedRWValues = {
        fd: -1,
        buffer: null,
        offset: -1,
        length: -1,
        position: -1,
    };
    let fileBuffer = Buffer.alloc(0);
    const fsWrite = (
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
    ) => {
        offset = offset || 0;
        length = length || 0;
        position = position || 0;
        passed.fd = fd;
        passed.buffer = buffer;
        passed.offset = offset;
        passed.length = length;
        passed.position = position;
        const reqLen = position + length;
        if (reqLen > fileBuffer.length) {
            const ext = Buffer.alloc(reqLen - fileBuffer.length);
            fileBuffer = Buffer.concat([fileBuffer, ext], reqLen);
        }
        buffer.copy(fileBuffer, position, offset, offset + length);
        callback(null, length || 0, buffer);
    };
    fsWrite.passed = passed;
    fsWrite.fileBuffer = () => fileBuffer;
    return fsWrite;
};

export const createContinuationFileBuffer = () => {
    const oddLoremIpsum = loremIpsum.filter(odd);
    const evenLoremIpsum = loremIpsum.filter(even);
    const oddFileBufferSpans = createFileBufferSpans(oddLoremIpsum);
    const evenFileBufferSpans = createFileBufferSpans(
        evenLoremIpsum, 
        (() => {
            const lastIndex = oddFileBufferSpans.length - 1;
            const lastSpan = oddFileBufferSpans[lastIndex];
            return lastSpan.offset + lastSpan.length;
        })(),
    );
    const oddFileBuffer = createFileBuffer(
        oddLoremIpsum, 
        (_, index) => evenFileBufferSpans[index].offset,
    );
    const evenFileBuffer = createFileBuffer(
        evenLoremIpsum,
        () => 0,
    );
    return Buffer.concat([oddFileBuffer, evenFileBuffer]);
};

export const createFileBuffer = (contents: string[], continuation?: (content: string, index: number) => number) => {
    const buffers = contents.map(createChunkBufferFn(continuation));
    return Buffer.concat(buffers);
};

const createChunkBufferFn = (continuation?: (content: string, index: number) => number) => (content: string, index: number) => {
    const contBuff = Buffer.from(content);
    const length = contBuff.length + 40;
    const prefix = `${length}`.padStart(20, '0');
    const prefixBuff = Buffer.from(prefix);
    const suffixValue = continuation ? continuation(content, index) : index;
    const suffix = `${suffixValue}`.padStart(20, '0');
    const suffixBuff = Buffer.from(suffix);
    if ((prefixBuff.length + contBuff.length + suffixBuff.length) !== length) {
        throw new Error('Error creating correct chunk');
    }
    return Buffer.concat([prefixBuff, contBuff, suffixBuff]);
};

export const createFileBufferSpans = (contents: string[], startOffset: number = 0): Span[] => {
    let offset = startOffset;
    return contents.map<Span>(c => {
        const s = createChunkBufferSpan(c, offset);
        offset += s.length;
        return s;
    });
};

const createChunkBufferSpan = (content: string, offset: number = 0): Span => {
    return { offset, length: Buffer.byteLength(content) + 40 };
};

export const loremIpsum = [
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
    'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
    'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
    'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
    'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
    'Et harum quidem rerum facilis est et expedita distinctio.',
    'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.',
    'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.',
    'Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
];

export const even = <T=any>(_: T, index: number) :boolean => (index % 2) === 0;
export const odd = <T=any>(_: T, index: number) :boolean => (index % 2) !== 0;

export const testStatsValue = {
    dev: 1,
    ino: 2,
    mode: 3,
    nlink: 4,
    uid: 5,
    gid: 6,
    rdev: 7,
    size: 8,
    blksize: 9,
    blocks: 10,
    atimeMs: 11,
    mtimeMs: 12,
    ctimeMs: 13,
    birthtimeMs: 14,
    atime: new Date(),
    mtime: new Date(),
    ctime: new Date(),
    birthtime: new Date(),
    isFile: () => true,
    isDirectory: () => false,
    isBlockDevice: () => true,
    isCharacterDevice: () => false,
    isSymbolicLink: () => true,
    isFIFO: () => false,
    isSocket: () => true,
  };