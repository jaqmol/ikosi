import {  
    encodeStringToBytes,
    decodeBytesToString,
} from "./text-encoding";

const numberLength = 16; // 16
const numberRadix = 16; // 16

export const NumberFormat = {
    encodedLength: numberLength,
    decode: (data: Uint8Array) => {
        const stringValue = decodeBytesToString(data);
        return Number.parseInt(stringValue, numberRadix);
    },
    encode: (value: number) => {
        if (!Number.isFinite(value)) throw new Error('Number must be finite');
        if (Number.isNaN(value)) throw new Error("Can't encode NaN");
        if (!Number.isInteger(value)) throw new Error("Number must be integer");
        const stringValue = value.toString(numberRadix).padStart(numberLength, '0');
        return encodeStringToBytes(stringValue);
    },
};