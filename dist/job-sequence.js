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
exports.MakeJobSequence = void 0;
exports.MakeJobSequence = function () {
    var jobs = [];
    var idling = true;
    var next = function () {
        if (idling && jobs.length) {
            var _a = __read(jobs.splice(0, 1)[0], 3), job = _a[0], resolve_1 = _a[1], reject_1 = _a[2];
            try {
                idling = false;
                job(function (e, v) {
                    if (e)
                        reject_1(e);
                    else
                        resolve_1(v);
                    idling = true;
                    setTimeout(next, 0);
                });
            }
            catch (e) {
                reject_1(e);
            }
        }
    };
    return function (job, resolve, reject) {
        jobs.push([job, resolve, reject]);
        setTimeout(next, 0);
    };
};
