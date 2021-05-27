"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const make_error_1 = require("make-error");
class E extends make_error_1.BaseError {
    constructor(...argS) {
        super();
        /**
         * Error chain from inheritance.
         * @example [ 'e', 'external', 'invalid_api_argument' ]
         */
        this.chain = [];
        this.init(...argS);
        // this.name = this.constructor.name
        // Error.captureStackTrace(this, this.constructor)
    }
    init(...a) {
        const a0 = a[0];
        switch (a.length) {
            case 1:
                switch (typeof a0) {
                    case 'string':
                        this.message = a0;
                        break;
                    case 'object':
                        this.fill(a0);
                        break;
                }
                break;
            case 2:
                let a1 = a[1];
                this.message = a0;
                switch (typeof a1) {
                    case 'string':
                        this.solution = a1;
                        break;
                    case 'object':
                        this.fill(a1);
                        break;
                }
                break;
        }
        // this.stack = (new Error()).stack
        this.generate_chain();
        this.generate_echain();
    }
    /**
     * Generate error chain based on inheritance
     * @param ins
     * @param echain
     */
    generate_chain(ins = undefined) {
        if (ins === undefined) {
            ins = this;
        }
        ins = Object.getPrototypeOf(ins);
        const name = ins.constructor.name.toLowerCase();
        this.chain.unshift(name);
        if (ins.constructor === E || !ins.constructor) {
            return;
        }
        return this.generate_chain(ins);
    }
    /**
     * Generate and get echain string
     * @returns {string}
     */
    generate_echain() {
        if (!this.echain) {
            this.echain = this.chain.join('.');
        }
        return this.echain;
    }
    /**
     * Fill `this` with a another object
     * @param obj
     */
    fill(obj) {
        for (let key in obj) {
            this[key] = obj[key];
        }
    }
}
exports.E = E;
// // @ts-ignore
// E.prototype = new Error
// // @ts-ignore
// E.prototype.name = 'E'
//# sourceMappingURL=e.js.map