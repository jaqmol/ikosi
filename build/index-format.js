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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDataIndex = exports.encodeIndex = exports.decodeIndex = exports.extractIndex = void 0;
var number_format_1 = require("./number-format");
var text_encoding_1 = require("./text-encoding");
exports.extractIndex = function (data) {
    var indexStartIndexData = data.slice(0, number_format_1.NumberFormat.encodedLength);
    var indexStartIndex = number_format_1.NumberFormat.decode(indexStartIndexData);
    var indexData = data.slice(indexStartIndex);
    return exports.decodeIndex(indexData);
};
exports.decodeIndex = function (indexData) {
    var e_1, _a;
    var indexString = text_encoding_1.decodeBytesToString(indexData);
    var indexStorageFormat = JSON.parse(indexString);
    var index = new Map();
    try {
        for (var indexStorageFormat_1 = __values(indexStorageFormat), indexStorageFormat_1_1 = indexStorageFormat_1.next(); !indexStorageFormat_1_1.done; indexStorageFormat_1_1 = indexStorageFormat_1.next()) {
            var _b = __read(indexStorageFormat_1_1.value, 3), key = _b[0], startIndex = _b[1], endIndex = _b[2];
            index.set(key, [startIndex, endIndex]);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (indexStorageFormat_1_1 && !indexStorageFormat_1_1.done && (_a = indexStorageFormat_1.return)) _a.call(indexStorageFormat_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return index;
};
exports.encodeIndex = function (index) {
    var e_2, _a;
    var indexStorageFormat = [];
    try {
        for (var _b = __values(index.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), key = _d[0], _e = __read(_d[1], 2), startIndex = _e[0], endIndex = _e[1];
            indexStorageFormat.push([key, startIndex, endIndex]);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var indexString = JSON.stringify(indexStorageFormat);
    return text_encoding_1.encodeStringToBytes(indexString);
};
exports.extractDataIndex = function (data) {
    var e_3, _a;
    var index = exports.extractIndex(data);
    var dataIndex = new Map();
    try {
        for (var _b = __values(index.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), key = _d[0], _e = __read(_d[1], 2), startIndex = _e[0], endIndex = _e[1];
            var value = data.slice(startIndex, endIndex);
            dataIndex.set(key, value);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return dataIndex;
};
