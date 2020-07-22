const TxtEnc = typeof TextEncoder === 'undefined' 
    ? (() => require('util').TextEncoder)()
    : TextEncoder;
const TxtDec = typeof TextDecoder === 'undefined' 
    ? (() => require('util').TextDecoder)()
    : TextDecoder;

export const encodeStringToBytes = (value: string) => (new TxtEnc()).encode(value);
export const decodeBytesToString = (value: Uint8Array) => (new TxtDec()).decode(value);