"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBytesToString = exports.encodeStringToBytes = void 0;
var TxtEnc = typeof TextEncoder === 'undefined'
    ? (function () { return require('util').TextEncoder; })()
    : TextEncoder;
var TxtDec = typeof TextDecoder === 'undefined'
    ? (function () { return require('util').TextDecoder; })()
    : TextDecoder;
exports.encodeStringToBytes = function (value) { return (new TxtEnc()).encode(value); };
exports.decodeBytesToString = function (value) { return (new TxtDec()).decode(value); };
