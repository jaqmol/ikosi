export interface Span {
    offset: number;
    length: number;
}

export interface ImmutableIkosiBackend {
    entries() : Iterator<[string, Uint8Array]>
    get(key: string) : Uint8Array|undefined
    has(key: string) : boolean
    keys() : Iterator<string>
    size() : number
    values() : Iterator<Uint8Array>
}

export interface ImmutableIkosi extends ImmutableIkosiBackend {
    getBlob(key: string) : Blob|undefined
    getBoolean(key: string) : boolean|undefined
    getJSON<T=any>(key: string) : T|undefined
    getNumber(key: string) : number|undefined
    getString(key: string) : string|undefined
}

export interface MutableIkosiBackend extends ImmutableIkosiBackend {
    clear() : void
    delete(key: string) : boolean
    serialize() : ArrayBuffer
    set(key: string, data: Uint8Array) : void
}

export interface MutableIkosi extends MutableIkosiBackend, ImmutableIkosi {
    setBlob(key: string, value: Blob) : Promise<void>
    setBoolean(key: string, value: boolean) : void
    setJSON<T=any>(key: string, value: T) : void
    setNumber(key: string, value: number) : void
    setString(key: string, value: string) : void
}
