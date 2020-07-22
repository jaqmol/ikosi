export interface Span {
    offset: number;
    length: number;
}

export interface ImmutableIkosi {
    entries() : Iterator<[string, Uint8Array]>
    get(key: string) : Uint8Array|undefined
    has(key: string) : boolean
    keys() : Iterator<string>
    size() : number
    values() : Iterator<Uint8Array>
}

export interface ImmutableTypedIkosi extends ImmutableIkosi {
    getBlob(key: string) : Blob|undefined
    getBoolean(key: string) : boolean|undefined
    getJSON<T=any>(key: string) : T|undefined
    getNumber(key: string) : number|undefined
    getString(key: string) : string|undefined
}

export interface MutableIkosi extends ImmutableIkosi {
    clear() : void
    delete(key: string) : boolean
    serialize() : ArrayBuffer
    set(key: string, data: Uint8Array) : MutableIkosi
}

export interface MutableTypedIkosi extends MutableIkosi, ImmutableTypedIkosi {
    setBlob(key: string, value: Blob) : Promise<MutableTypedIkosi>
    setBoolean(key: string, value: boolean) : MutableTypedIkosi
    setJSON<T=any>(key: string, value: T) : MutableTypedIkosi
    setNumber(key: string, value: number) : MutableTypedIkosi
    setString(key: string, value: string) : MutableTypedIkosi
}

export type IndexStorageFormat = [string, number, number][];

