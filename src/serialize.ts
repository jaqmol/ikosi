import {encodeIndex} from "./index-format";
import {NumberFormat} from "./number-format";


export const serializeDataIndex = (dataIndex: Map<string, Uint8Array>) :ArrayBuffer => {
    const keys = Array.from(dataIndex.keys());
    keys.sort();

    const index = new Map<string, [number, number]>();
    const valueBytes : Uint8Array[] = [];
    let bytesCount = NumberFormat.encodedLength;
    for (const key of keys) {
        const value = dataIndex.get(key);
        if (value) {
            const startIndex = bytesCount;
            bytesCount += value.length;
            const endIndex = bytesCount;
            index.set(key, [startIndex, endIndex]);
            valueBytes.push(value);
        }
    }

    const indexStartIndex = bytesCount;
    const indexBytes = encodeIndex(index);
    bytesCount += indexBytes.length;
    const indexStartIndexBytes = NumberFormat.encode(indexStartIndex);
    
    const acc = new Uint8Array(bytesCount);
    
    let offset = 0;
    acc.set(indexStartIndexBytes, offset);
    offset += indexStartIndexBytes.length;
    for (const value of valueBytes) {
        acc.set(value, offset);
        offset += value.length;
    }
    if (offset !== indexStartIndex) throw new Error(`Unexpected index start index, is ${offset}, should be ${indexStartIndex}`);
    acc.set(indexBytes, indexStartIndex);

    return acc.buffer;
};