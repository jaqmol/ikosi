"use strict";
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
exports.MakeValuesIterator = exports.MakeKeysIterator = exports.MakeEntriesIterator = void 0;
exports.MakeEntriesIterator = function (index, data) {
    var ito = index.entries();
    var next = function () {
        var result = ito.next();
        var _a = __read(result.value, 2), key = _a[0], _b = __read(_a[1], 2), startIndex = _b[0], endIndex = _b[1];
        var done = !!result.done;
        var value = data.slice(startIndex, endIndex);
        return {
            value: [key, value],
            done: done,
        };
    };
    return { next: next };
};
exports.MakeKeysIterator = function (index) {
    var ito = index.keys();
    var next = function () {
        var result = ito.next();
        var value = result.value;
        var done = !!result.done;
        return { value: value, done: done };
    };
    return { next: next };
};
exports.MakeValuesIterator = function (index, data) {
    var ito = index.values();
    var next = function () {
        var result = ito.next();
        var _a = __read(result.value, 2), startIndex = _a[0], endIndex = _a[1];
        var done = !!result.done;
        var value = data.slice(startIndex, endIndex);
        return { value: value, done: done };
    };
    return { next: next };
};
