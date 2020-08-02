"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
exports.MakeImmutableIkosi = exports.MakeImmutableBackend = void 0;
var iterators_1 = require("./iterators");
var index_format_1 = require("./index-format");
var text_encoding_1 = require("./text-encoding");
exports.MakeImmutableBackend = function (buffer) {
    var data = new Uint8Array(buffer);
    var index = index_format_1.extractIndex(data);
    var entries = function () { return iterators_1.MakeEntriesIterator(index, data); };
    var get = function (key) {
        var range = index.get(key);
        if (!range)
            return;
        var _a = __read(range, 2), startIndex = _a[0], endIndex = _a[1];
        return data.slice(startIndex, endIndex);
    };
    var has = function (key) { return index.has(key); };
    var keys = function () { return iterators_1.MakeKeysIterator(index); };
    var size = function () { return index.size; };
    var values = function () { return iterators_1.MakeValuesIterator(index, data); };
    return {
        entries: entries,
        get: get,
        has: has,
        keys: keys,
        size: size,
        values: values,
    };
};
exports.MakeImmutableIkosi = function (backend) {
    var getBlob = function (key) {
        var bytes = backend.get(key);
        if (!bytes)
            return;
        return new Blob([bytes]);
    };
    var getBoolean = function (key) {
        var bytes = backend.get(key);
        if (!bytes)
            return;
        return bytes[0] > 0;
    };
    var getJSON = function (key) {
        var stringValue = getString(key);
        if (!stringValue)
            return;
        return JSON.parse(stringValue);
    };
    var getNumber = function (key) {
        var stringValue = getString(key);
        if (!stringValue)
            return;
        return Number.parseInt(stringValue, 16);
    };
    var getString = function (key) {
        var bytes = backend.get(key);
        if (!bytes)
            return;
        return text_encoding_1.decodeBytesToString(bytes);
    };
    return __assign(__assign({}, backend), { getBlob: getBlob,
        getBoolean: getBoolean,
        getJSON: getJSON,
        getNumber: getNumber,
        getString: getString });
};
