import {
    FSReadFn,
    FSWriteFn,
    FSStatsFn,
    Span,
    IndexStorageFormat,
} from './types';

import {
    SizeFn,
} from './wrappers';

import {
    MakeDataReader,
} from './data-reader-writer';

export const MakeSpaceProvider = (fsStats: FSStatsFn, filepath: string, occupiedSpans: Span[]) => {
    const fileSize = SizeFn(fsStats);
    
    const spans = [...occupiedSpans];
    spans.sort((a, b) => {
        if (a.offset < b.offset) return -1;
        if (a.offset > b.offset) return 1;
        return 0;
    });

    const lastIndex = spans.length - 1;
    const spaces: Span[] = [];
    for (let i = 0; i < spans.length; i++) {
        if (i < lastIndex) {
            const a = spans[i];
            const b = spans[i + 1];
            const offset = a.offset + a.length;
            const length = b.offset - offset;
            if (length > 0) {
                spaces.push({ offset, length });
            }
        }
    }
    console.log('spaces:', spaces);
    
    return async (required: number) :Promise<Span> => {
        let signedDivergence = Infinity;
        let divergence = Infinity;
        let index: number = -1;

        for (let i = 0; i < spaces.length; i++) {
            const space = spaces[i];
            const spaceSignedDivergence = space.length - required;
            if (spaceSignedDivergence === 0) {
                index = i;
                break;
            } else {
                const spaceDivergence = Math.abs(spaceSignedDivergence);
                if (
                    (spaceDivergence < divergence) ||
                    ((spaceDivergence === divergence) && (signedDivergence < 0) && (spaceSignedDivergence > 0))
                ) {
                    signedDivergence = spaceSignedDivergence;
                    divergence = spaceDivergence;
                    index = i;
                }
            }
        }

        if (index === -1) {
            const offset = await fileSize(filepath);
            return {offset, length: required};
        }

        return spaces.splice(index, 1)[0];
    };
};

export const collectOccupiedSpans = async (fsRead: FSReadFn, fd: number, indexOffset: number, valueOffsets: number[]) :Promise<Span[]> => {
    const acc :Span[] = [];

    if (indexOffset > 0) {
        const reader = MakeDataReader(fsRead, fd, indexOffset);
        const spans = await reader.envelopeSpans();
        acc.push(...spans);
    }

    for (const offset of valueOffsets) {
        const reader = MakeDataReader(fsRead, fd, offset);
        const spans = await reader.envelopeSpans();
        acc.push(...spans);
    }

    return acc;
};
