const numberLength = 20; // 16
const numberRadix = 10; // 16
// const twiceNumberLength = numberLength * 2;

export const NumberFormat = {
    encodedLength: numberLength,
    // twiceEncodedLength: twiceNumberLength,
    decode: (data: Uint8Array) => {
        const decoder = new TextDecoder();
        const stringValue = decoder.decode(data);
        return Number.parseInt(stringValue, numberRadix);
    },
    encode: (value: number) => {
        if (!Number.isFinite(value)) throw new Error('Number must be finite');
        if (Number.isNaN(value)) throw new Error("Can't encode NaN");
        if (!Number.isInteger(value)) throw new Error("Number must be integer");
        const stringValue = value.toString(numberRadix).padStart(numberLength, '0');
        const encoder = new TextEncoder();
        return encoder.encode(stringValue);
    },
};