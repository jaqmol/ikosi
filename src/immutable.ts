import { 
    ImmutableBackend,
    ImmutableIkosi,
} from "./types";

import {
    MakeEntriesIterator,
    MakeKeysIterator,
    MakeValuesIterator,
} from "./iterators";

import {
    extractIndex,
} from "./index-format";

import {  
    decodeBytesToString,
} from "./text-encoding";

export const MakeImmutableBackend = (buffer: ArrayBuffer) : ImmutableBackend => {
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

export const MakeImmutableIkosi = (backend: ImmutableBackend) : ImmutableIkosi => {
    const getBlob = (key: string) : Blob|undefined => {
        const bytes = backend.get(key);
        if (!bytes) return;
        return new Blob([bytes]);
    };
    const getBoolean = (key: string) : boolean|undefined => {
        const bytes = backend.get(key);
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
        const bytes = backend.get(key);
        if (!bytes) return;
        return decodeBytesToString(bytes);
    };

    return {
        ...backend,
        getBlob,
        getBoolean,
        getJSON,
        getNumber,
        getString,
    };
}