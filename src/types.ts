export interface Span {
    offset: number;
    length: number;
}

export interface ImmutableBackend {
    entries() : Iterator<[string, Uint8Array]>
    get(key: string) : Uint8Array|undefined
    has(key: string) : boolean
    keys() : Iterator<string>
    size() : number
    values() : Iterator<Uint8Array>
}

export interface ImmutableIkosi extends ImmutableBackend {
    getBlob(key: string) : Blob|undefined
    getBoolean(key: string) : boolean|undefined
    getJSON<T=any>(key: string) : T|undefined
    getNumber(key: string) : number|undefined
    getString(key: string) : string|undefined
}

export interface MutableBackend extends ImmutableBackend {
    clear() : void
    delete(key: string) : boolean
    serialize() : ArrayBuffer
    set(key: string, data: Uint8Array) : void
}

export interface MutableIkosi extends MutableBackend, ImmutableIkosi {
    setBlob(key: string, value: Blob) : Promise<void>
    setBoolean(key: string, value: boolean) : void
    setJSON<T=any>(key: string, value: T) : void
    setNumber(key: string, value: number) : void
    setString(key: string, value: string) : void
}

// export type IndexStorageFormat = [string, number, number][];

