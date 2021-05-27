import { BaseError } from 'make-error';
export interface T_error {
    /**
     * Unique error code for error identifying, can be overwritten by by descendents.
     *
     * @example 'E1829'
     */
    eid?: string;
    /**
     * String version of error chain from inheritance.
     * @example 'e_base.external.invalid_api_argument'
     */
    echain?: string;
    /**
     * Error chain from inheritance.
     * @example [ 'e', 'external', 'invalid_api_argument' ]
     */
    chain?: string[];
    /**
     * Error level, defined and specified by descendents.
     *
     * @example 'internal'
     * @example 'external'
     * @example 'database'
     */
    level?: string;
    /**
     * How to solve this problem
     *
     * @example 'Please configure .env file first.'
     */
    solution?: string;
    /**
     * One line to cover the error.
     */
    message?: string;
    /**
     * Additional data of the error goes here
     *
     * @example {input: {username: 'Not a username'}}
     */
    data?: any;
    /**
     * Stack info
     */
    stack?: string;
}
export declare class E extends BaseError implements T_error {
    /**
     * Unique error code for error identifying, can be overwritten by by descendents.
     *
     * @example 'E1829'
     */
    eid: string;
    /**
     * String version of error chain from inheritance.
     * @example 'e_base.external.invalid_api_argument'
     */
    echain: string;
    /**
     * Error chain from inheritance.
     * @example [ 'e', 'external', 'invalid_api_argument' ]
     */
    chain: string[];
    /**
     * Error level, defined and specified by descendents.
     *
     * @example 'internal'
     * @example 'external'
     * @example 'database'
     */
    level: string;
    /**
     * How to solve this problem
     *
     * @example 'Please configure .env file first.'
     */
    solution?: string;
    /**
     * One line to cover the error.
     */
    message: string;
    /**
     * Additional data of the error goes here
     *
     * @example {input: {username: 'Not a username'}}
     */
    data?: any;
    /**
     * Stack info
     */
    stack: string;
    constructor(message?: string);
    constructor(message?: string, solution?: string);
    constructor(e?: Error);
    constructor(e?: E);
    constructor(opt?: T_error);
    init(...a: any[]): void;
    /**
     * Generate error chain based on inheritance
     * @param ins
     * @param echain
     */
    generate_chain(ins?: any): any;
    /**
     * Generate and get echain string
     * @returns {string}
     */
    generate_echain(): string;
    /**
     * Fill `this` with a another object
     * @param obj
     */
    fill(obj: any): void;
}
