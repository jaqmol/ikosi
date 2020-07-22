import { 
    ImmutableIkosi,
    ImmutableTypedIkosi,
} from "./types";

import {
    MakeEntriesIterator,
    MakeKeysIterator,
    MakeValuesIterator,
} from "./iterators";

import {
    extractIndex,
} from "./index-format";

export const MakeImmutableIkosi = (buffer: ArrayBuffer) : ImmutableIkosi => {
    const data = new Uint8Array(buffer);
    const index = extractIndex(data);

    const entries = () => MakeEntriesIterator(index, data);
    const get = (key: string) => {
        const range = index.get(key);
        if (!range) return;
        const [startIndex, endIndex] = range;
        return data.slice(startIndex, endIndex);
    };
    const has = (key: string) => index.has(key);
    const keys = () => MakeKeysIterator(index);
    const size = () => index.size;
    const values = () => MakeValuesIterator(index, data);

    return {
        entries,
        get,
        has,
        keys,
        size,
        values,
    };
}

export const MakeImmutableTypedIkosi = (immutableIkosi: ImmutableIkosi) : ImmutableTypedIkosi => {
    const getBlob = (key: string) : Blob|undefined => {
        const bytes = immutableIkosi.get(key);
        if (!bytes) return;
        return new Blob([bytes]);
    };
    const getBoolean = (key: string) : boolean|undefined => {
        const bytes = immutableIkosi.get(key);
        if (!bytes) return;
        return bytes[0] > 0;
    };
    const getJSON = <T=any>(key: string) : T|undefined => {
        const stringValue = getString(key);
        if (!stringValue) return;
        return JSON.parse(stringValue) as T;
    };
    const getNumber = (key: string) : number|undefined => {
        const stringValue = getString(key);
        if (!stringValue) return;
        return Number.parseInt(stringValue, 16);
    };
    const getString = (key: string) : string|undefined => {
        const bytes = immutableIkosi.get(key);
        if (!bytes) return;
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    };

    return {
        ...immutableIkosi,
        getBlob,
        getBoolean,
        getJSON,
        getNumber,
        getString,
    };
}