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
var test_utils_1 = require("./test-utils");
var text_encoding_1 = require("./text-encoding");
var immutable_1 = require("./immutable");
test('Multiple immutable backend deserialize and get tests', function () {
    var e_1, _a;
    var storageFormat = test_utils_1.loremIpsumIkosiStorageFormat();
    var backend = immutable_1.MakeImmutableIkosiBackend(storageFormat);
    try {
        for (var _b = __values(test_utils_1.loremIpsum.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), index = _d[0], expectedSentence = _d[1];
            var sentenceBytes = backend.get(test_utils_1.keyFromIndex(index));
            expect(sentenceBytes).toBeDefined();
            if (sentenceBytes) {
                var retrievedSentence = text_encoding_1.decodeBytesToString(sentenceBytes);
                expect(retrievedSentence).toBe(expectedSentence);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
});
test('Multiple multi-type immutable deserialize and get tests', function () {
    var storageFormat = test_utils_1.multiTypeAIkosiStorageFormat();
    var iko = immutable_1.MakeImmutableIkosi(immutable_1.MakeImmutableIkosiBackend(storageFormat));
    expect(iko.size()).toBe(4);
    var boolValue = iko.getBoolean('boolean');
    expect(boolValue).toBe(test_utils_1.multiTypeAExpectations.boolean);
    var numValue = iko.getNumber('number');
    expect(numValue).toBe(test_utils_1.multiTypeAExpectations.number);
    var strValue = iko.getString('string');
    expect(strValue).toBe(test_utils_1.multiTypeAExpectations.string);
    var jsonValue = iko.getJSON('json');
    expect(jsonValue).toEqual(test_utils_1.multiTypeAExpectations.json);
});
