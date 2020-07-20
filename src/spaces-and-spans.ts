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

import { NumberFormat } from "./number-format";

export const MakeSpaceProvider = (occupiedSpans: Span[]) => {
    const spaces = extractSpaces(occupiedSpans);
    
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
            const offset = lastSpanEndIndex(occupiedSpans);
            return {offset, length: required};
        }

        const finding = spaces.splice(index, 1)[0];
        return finding;
    };
};

const extractSpaces = (occupiedSpans: Span[]) => {
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

    let spanAfterIndexPosition: Span|null = null;
    for (const s of spans) {
        if (s.offset === NumberFormat.bufferifiedLength) {
            spanAfterIndexPosition = s;
            break;
        }
    }
    if (!spanAfterIndexPosition && spans.length) {
        const firstSpanSpace = {
            offset: NumberFormat.bufferifiedLength,
            length: spans[0].offset - NumberFormat.bufferifiedLength,
        };
        spaces.splice(0, 0, firstSpanSpace);
    }

    return spaces;
};

const lastSpanEndIndex = (spans: Span[]) => {
    const max = (a: number, b: number) => Math.max(a, b);
    return spans
        .map(({offset, length}) => offset + length)
        .reduce(max, NumberFormat.bufferifiedLength);
}

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
