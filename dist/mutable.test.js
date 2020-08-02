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
var mutable_1 = require("./mutable");
var text_encoding_1 = require("./text-encoding");
var test_utils_1 = require("./test-utils");
test('Singular mutable backend set test', function () {
    var iko = mutable_1.MakeMutableBackend();
    var sentenceBytes = text_encoding_1.encodeStringToBytes(test_utils_1.loremIpsum[0]);
    iko.set('a', sentenceBytes);
    var retrievedSentenceBytes = iko.get('a');
    expect(retrievedSentenceBytes).toBeDefined();
    if (retrievedSentenceBytes) {
        var retrievedSentence = text_encoding_1.decodeBytesToString(retrievedSentenceBytes);
        expect(retrievedSentence).toBe(test_utils_1.loremIpsum[0]);
    }
});
test('Multiple mutable backend set tests', function () {
    var e_1, _a, e_2, _b;
    var iko = mutable_1.MakeMutableBackend();
    try {
        for (var _c = __values(test_utils_1.loremIpsum.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
            var _e = __read(_d.value, 2), index = _e[0], sentence = _e[1];
            var sentenceBytes = text_encoding_1.encodeStringToBytes(sentence);
            iko.set(test_utils_1.keyFromIndex(index), sentenceBytes);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        for (var _f = __values(test_utils_1.loremIpsum.entries()), _g = _f.next(); !_g.done; _g = _f.next()) {
            var _h = __read(_g.value, 2), index = _h[0], expectedSentence = _h[1];
            var sentenceBytes = iko.get(test_utils_1.keyFromIndex(index));
            expect(sentenceBytes).toBeDefined();
            if (sentenceBytes) {
                var retrievedSentence = text_encoding_1.decodeBytesToString(sentenceBytes);
                expect(retrievedSentence).toBe(expectedSentence);
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_2) throw e_2.error; }
    }
});
test('Singular mutable backend serialize test', function () {
    var ikoA = mutable_1.MakeMutableBackend();
    var sentenceBytes = text_encoding_1.encodeStringToBytes(test_utils_1.loremIpsum[0]);
    ikoA.set('a', sentenceBytes);
    var storageFormat = ikoA.serialize();
    var ikoB = mutable_1.MakeMutableBackend(storageFormat);
    var retrievedSentenceBytes = ikoB.get('a');
    expect(retrievedSentenceBytes).toBeDefined();
    if (retrievedSentenceBytes) {
        var retrievedSentence = text_encoding_1.decodeBytesToString(retrievedSentenceBytes);
        expect(retrievedSentence).toBe(test_utils_1.loremIpsum[0]);
    }
});
test('Multiple mutable backend serialize tests', function () {
    var e_3, _a;
    var storageFormat = test_utils_1.loremIpsumIkosiStorageFormat();
    var iko = mutable_1.MakeMutableBackend(storageFormat);
    try {
        for (var _b = __values(test_utils_1.loremIpsum.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), index = _d[0], expectedSentence = _d[1];
            var sentenceBytes = iko.get(test_utils_1.keyFromIndex(index));
            expect(sentenceBytes).toBeDefined();
            if (sentenceBytes) {
                var retrievedSentence = text_encoding_1.decodeBytesToString(sentenceBytes);
                expect(retrievedSentence).toBe(expectedSentence);
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
});
test('Mutable ikosi types test', function () {
    var ikoA = mutable_1.MakeMutableIkosi(mutable_1.MakeMutableBackend());
    ikoA.setBoolean('boolean', true);
    var retrievedBool = ikoA.getBoolean('boolean');
    expect(retrievedBool).toBe(true);
    ikoA.setBoolean('boolean', false);
    retrievedBool = ikoA.getBoolean('boolean');
    expect(retrievedBool).toBe(false);
    ikoA.setNumber('number', 12000);
    var retrievedNum = ikoA.getNumber('number');
    expect(retrievedNum).toBe(12000);
    ikoA.setNumber('number', 64000000);
    retrievedNum = ikoA.getNumber('number');
    expect(retrievedNum).toBe(64000000);
    ikoA.setString('string', 'lorem ipsum');
    var retrievedStr = ikoA.getString('string');
    expect(retrievedStr).toBe('lorem ipsum');
    ikoA.setString('string', 'ipsum lorem');
    retrievedStr = ikoA.getString('string');
    expect(retrievedStr).toBe('ipsum lorem');
    ikoA.setJSON('json', [true, 12000, 'lorem ipsum']);
    var retrievedJson = ikoA.getJSON('json');
    expect(retrievedJson).toEqual([true, 12000, 'lorem ipsum']);
    ikoA.setJSON('json', [false, 64000000, 'ipsum lorem']);
    retrievedJson = ikoA.getJSON('json');
    expect(retrievedJson).toEqual([false, 64000000, 'ipsum lorem']);
    var storageFormat = ikoA.serialize();
    var ikoB = mutable_1.MakeMutableIkosi(mutable_1.MakeMutableBackend(storageFormat));
    retrievedBool = ikoB.getBoolean('boolean');
    expect(retrievedBool).toBe(false);
    retrievedNum = ikoB.getNumber('number');
    expect(retrievedNum).toBe(64000000);
    retrievedStr = ikoB.getString('string');
    expect(retrievedStr).toBe('ipsum lorem');
    retrievedJson = ikoB.getJSON('json');
    expect(retrievedJson).toEqual([false, 64000000, 'ipsum lorem']);
});
