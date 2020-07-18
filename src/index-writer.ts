import {
    FSWriteFn,
    Span,
    IndexStorageFormat,
} from './types';

import {
    MakeDataReader,
} from './data-reader';

export const MakeIndexWriter = (fsWrite: FSWriteFn, fd: number) => 
    async () :Promise<Map<string, Span[]>> => {
        const reader = MakeDataReader(fsRead, fd, 0);

        const storageBuffer = await reader.data();
        const storageString = storageBuffer.toString();
        const storageFormat :IndexStorageFormat = JSON.parse(storageString);
        
        const acc = new Map<string, Span[]>();
        for (const [key, offset] of storageFormat) {
            const reader = MakeDataReader(fsRead, fd, offset);
            const spans = await reader.spans();
            acc.set(key, spans);
        }

        return acc;
    };