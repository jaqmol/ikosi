import fs from "fs";
import { promisify } from "util";
import { BufferSpan, Span } from "./types";

const open = promisify(fs.open);
const write = promisify(fs.write);
const read = promisify(fs.read);
const close = promisify(fs.close);
const access = promisify(fs.access);

export const openFile = async (filepath: string) => {
    const exists = await fileExists(filepath);
    if (!exists) {
        await createFile(filepath);
    }
    return open(filepath, 'r+');
};

const createFile = async (filepath: string) => {
    let fd = await open(filepath, 'w');
    await close(fd);
};


const fileExists = async (filepath: string) => {
    try {
        await access(filepath, fs.constants.F_OK);
        return true;
    } catch(e) {
        return false;
    }
};

export const closeFile = (fileDescriptor: number) =>
    close(fileDescriptor);



export const writeToFile = async (
    fd: number,
    bufferSpan: BufferSpan,
    filePosition: number
) => {
    const result = await write(
        fd, 
        bufferSpan.buffer,
        bufferSpan.offset,
        bufferSpan.length,
        filePosition,
    );
    return result.bytesWritten;
};

export const readFromFile = async (
    fd: number,
    span: Span,
) => {
    const buffer = Buffer.alloc(span.length);
    const result = await read(
        fd, 
        buffer,
        0,
        span.length,
        span.offset,
    );
    return buffer;
};
    