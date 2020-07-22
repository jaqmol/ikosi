import {
    NumberFormat,
} from "./number-format";

export const extractIndex = (data: Uint8Array) => {
    const indexStartIndexData = data.slice(0, NumberFormat.encodedLength);
    const indexStartIndex = NumberFormat.decode(indexStartIndexData);
    const indexData = data.slice(indexStartIndex);
    return decodeIndex(indexData);
};

export const decodeIndex = (indexData: Uint8Array) => {
    const decoder = new TextDecoder();
    const indexString = decoder.decode(indexData);
    const indexStorageFormat: [string, number, number][] = JSON.parse(indexString);
    const index = new Map<string, [number, number]>();
    for (const [key, startIndex, endIndex] of indexStorageFormat) {
        index.set(key, [startIndex, endIndex]);
    }
    return index;
};

export const encodeIndex = (index: Map<string, [number, number]>) => {
    const indexStorageFormat: [string, number, number][] = [];
    for (const [key, [startIndex, endIndex]] of index.entries()) {
        indexStorageFormat.push([key, startIndex, endIndex]);
    }
    const indexString = JSON.stringify(indexStorageFormat);
    const encoder = new TextEncoder();
    return encoder.encode(indexString);
};

export const extractDataIndex = (data: Uint8Array) => {
    const index = extractIndex(data);
    const dataIndex = new Map<string, Uint8Array>();
    for (const [key, [startIndex, endIndex]] of index.entries()) {
        const value = data.slice(startIndex, endIndex);
        dataIndex.set(key, value);
    }
    return dataIndex;
};