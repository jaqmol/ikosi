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
exports.keyFromIndex = exports.multiTypeBIkosiStorageFormat = exports.multiTypeAIkosiStorageFormat = exports.multiTypeBExpectations = exports.multiTypeAExpectations = exports.loremIpsumIkosiStorageFormat = exports.loremIpsum = exports.filterOdd = exports.filterEven = void 0;
var mutable_1 = require("./mutable");
var text_encoding_1 = require("./text-encoding");
exports.filterEven = function (_, index) { return (index % 2) === 0; };
exports.filterOdd = function (_, index) { return (index % 2) !== 0; };
exports.loremIpsum = [
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. ',
    'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. ',
    'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. ',
    'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur? ',
    'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. ',
    'Et harum quidem rerum facilis est et expedita distinctio. ',
    'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. ',
    'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. ',
    'Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. ',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. ',
];
exports.loremIpsumIkosiStorageFormat = function () {
    var e_1, _a;
    var iko = mutable_1.MakeMutableIkosiBackend();
    try {
        for (var _b = __values(exports.loremIpsum.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), index = _d[0], sentence = _d[1];
            var sentenceBytes = text_encoding_1.encodeStringToBytes(sentence);
            iko.set(exports.keyFromIndex(index), sentenceBytes);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return iko.serialize();
};
exports.multiTypeAExpectations = {
    boolean: true,
    number: 12000,
    string: 'lorem ipsum',
    json: [true, 12000, 'lorem ipsum'],
};
exports.multiTypeBExpectations = {
    boolean: false,
    number: 64000000,
    string: 'ipsum lorem',
    json: [true, 64000000, 'ipsum lorem'],
};
exports.multiTypeAIkosiStorageFormat = function () {
    var iko = mutable_1.MakeMutableIkosi(mutable_1.MakeMutableIkosiBackend());
    iko.setBoolean('boolean', exports.multiTypeAExpectations.boolean);
    iko.setNumber('number', exports.multiTypeAExpectations.number);
    iko.setString('string', exports.multiTypeAExpectations.string);
    iko.setJSON('json', exports.multiTypeAExpectations.json);
    return iko.serialize();
};
exports.multiTypeBIkosiStorageFormat = function () {
    var iko = mutable_1.MakeMutableIkosi(mutable_1.MakeMutableIkosiBackend());
    iko.setBoolean('boolean', exports.multiTypeBExpectations.boolean);
    iko.setNumber('number', exports.multiTypeBExpectations.number);
    iko.setString('string', exports.multiTypeBExpectations.string);
    iko.setJSON('json', exports.multiTypeBExpectations.json);
    return iko.serialize();
};
exports.keyFromIndex = function (index) { return String.fromCharCode(97 + index) + ":" + index; };
