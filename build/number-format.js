"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberFormat = void 0;
var text_encoding_1 = require("./text-encoding");
var numberLength = 20; // 16
var numberRadix = 10; // 16
// const twiceNumberLength = numberLength * 2;
exports.NumberFormat = {
    encodedLength: numberLength,
    // twiceEncodedLength: twiceNumberLength,
    decode: function (data) {
        var stringValue = text_encoding_1.decodeBytesToString(data);
        return Number.parseInt(stringValue, numberRadix);
    },
    encode: function (value) {
        if (!Number.isFinite(value))
            throw new Error('Number must be finite');
        if (Number.isNaN(value))
            throw new Error("Can't encode NaN");
        if (!Number.isInteger(value))
            throw new Error("Number must be integer");
        var stringValue = value.toString(numberRadix).padStart(numberLength, '0');
        return text_encoding_1.encodeStringToBytes(stringValue);
    },
};
