"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeDataIndex = void 0;
var index_format_1 = require("./index-format");
var number_format_1 = require("./number-format");
exports.serializeDataIndex = function (dataIndex) {
    var e_1, _a, e_2, _b;
    var keys = Array.from(dataIndex.keys());
    keys.sort();
    var index = new Map();
    var valueBytes = [];
    var bytesCount = number_format_1.NumberFormat.encodedLength;
    try {
        for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            var value = dataIndex.get(key);
            if (value) {
                var startIndex = bytesCount;
                bytesCount += value.length;
                var endIndex = bytesCount;
                index.set(key, [startIndex, endIndex]);
                valueBytes.push(value);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var indexStartIndex = bytesCount;
    var indexBytes = index_format_1.encodeIndex(index);
    bytesCount += indexBytes.length;
    var indexStartIndexBytes = number_format_1.NumberFormat.encode(indexStartIndex);
    var acc = new Uint8Array(bytesCount);
    var offset = 0;
    acc.set(indexStartIndexBytes, offset);
    offset += indexStartIndexBytes.length;
    try {
        for (var valueBytes_1 = __values(valueBytes), valueBytes_1_1 = valueBytes_1.next(); !valueBytes_1_1.done; valueBytes_1_1 = valueBytes_1.next()) {
            var value = valueBytes_1_1.value;
            acc.set(value, offset);
            offset += value.length;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (valueBytes_1_1 && !valueBytes_1_1.done && (_b = valueBytes_1.return)) _b.call(valueBytes_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    if (offset !== indexStartIndex)
        throw new Error("Unexpected index start index, is " + offset + ", should be " + indexStartIndex);
    acc.set(indexBytes, indexStartIndex);
    return acc.buffer;
};
