export const MakeEntriesIterator = (
    index: Map<string, [number, number]>,
    data: Uint8Array,
) :Iterator<[string, Uint8Array]> => {
    const ito = index.entries();

    const next = () :IteratorResult<[string, Uint8Array]> => {
        const result = ito.next();
        const [key, [startIndex, endIndex]] :[string, [number, number]] = result.value;
        const done = !!result.done;
        const value = data.slice(startIndex, endIndex);
        return {
            value: [key, value],
            done,
        };
    };

    return { next };
}

export const MakeKeysIterator = (
    index: Map<string, [number, number]>,
) :Iterator<string> => {
    const ito = index.keys();

    const next = () :IteratorResult<string> => {
        const result = ito.next();
        const value :string = result.value;
        const done = !!result.done;
        return { value, done };
    };

    return { next };
}

export const MakeValuesIterator = (
    index: Map<string, [number, number]>,
    data: Uint8Array,
) :Iterator<Uint8Array> => {
    const ito = index.values();

    const next = () :IteratorResult<Uint8Array> => {
        const result = ito.next();
        const [startIndex, endIndex] :[number, number] = result.value;
        const done = !!result.done;
        const value = data.slice(startIndex, endIndex);
        return { value, done };
    };

    return { next };
}