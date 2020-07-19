import {
    FSReadFn,
    Span,
} from './types';
import {
    ReadFn,
} from './wrappers';
import { off } from 'process';

const numberLength = 20; // 16
const numberRadix = 10; // 16
const twiceNumberLength = numberLength * 2;

export const NumberFormat = {
    bufferifiedLength: numberLength,
    twiceBufferifiedLength: twiceNumberLength,
    parse: (b: Buffer) =>
        Number.parseInt(b.toString(), numberRadix),
    bufferify: (n: number) => {
        if (!Number.isFinite(n)) throw new Error('Number must be finite');
        if (Number.isNaN(n)) throw new Error("Can't bufferify NaN");
        if (!Number.isInteger(n)) throw new Error("Number must be integer");
        return Buffer.from(
            n.toString(numberRadix).padStart(numberLength, '0'),
        );
    },
};