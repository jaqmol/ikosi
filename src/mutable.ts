import { 
    MutableBackend,
    MutableIkosi,
} from "./types";

import {
    extractDataIndex,
} from "./index-format";

import {
    serializeDataIndex,
} from "./serialize";

import {  
    encodeStringToBytes,
    decodeBytesToString,
} from "./text-encoding";

export const MakeMutableBackend = (buffer?: ArrayBuffer) : MutableBackend => {
    const dataIndex = buffer 
        ? extractDataIndex(new Uint8Array(buffer)) 
        : new Map<string, Uint8Array>();

    const clear = () => dataIndex.clear();
    const deleteFn = (key: string) => dataIndex.delete(key);
    const entries = () => dataIndex.entries();
    const get = (key: string) => dataIndex.get(key);
    const has = (key: string) => dataIndex.has(key);
    const keys = () => dataIndex.keys();
    const serialize = () => serializeDataIndex(dataIndex);
    const set = (key: string, data: Uint8Array) => {
        dataIndex.set(key, data);
    };
    const size = () => dataIndex.size;
    const values = () => dataIndex.values();

    return {
        clear,
        'delete': deleteFn,
        entries,
        get,
        has,
        keys,
        serialize,
        set,
        size,
        values,
    };
}

export const MakeMutableIkosi = (backend: MutableBackend) : MutableIkosi => {
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

    const setBlob = async (key: string, value: Blob) : Promise<void> => {
        const buffer = await value.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        backend.set(key, bytes);
    };
    const setBoolean = (key: string, value: boolean) : void => {
        const bytes = new Uint8Array(1);
        bytes[0] = value ? 1 : 0;
        backend.set(key, bytes);
    };
    const setJSON = <T=any>(key: string, value: T) : void => {
        const stringValue = JSON.stringify(value);
        setString(key, stringValue);
    };
    const setNumber = (key: string, value: number) : void => {
        const stringValue = value.toString(16);
        setString(key, stringValue);
    };
    const setString = (key: string, value: string) : void => {
        const bytes = encodeStringToBytes(value);
        backend.set(key, bytes);
    };

    return {
        ...backend,
        getBlob,
        getBoolean,
        getJSON,
        getNumber,
        getString,
        setBlob,
        setBoolean,
        setJSON,
        setNumber,
        setString,
    };
};