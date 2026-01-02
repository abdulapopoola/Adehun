"use strict";

const validStates = {
    PENDING: 0,
    FULFILLED: 1,
    REJECTED: 2
};

const isValidState = (state) => {
    return ((state === validStates.PENDING) ||
            (state === validStates.REJECTED) ||
            (state === validStates.FULFILLED));
};

const Utils = {
    runAsync: (fn) => {
        setTimeout(fn, 0);
    },
    isFunction: (val) => {
        return val && typeof val === "function";
    },
    isObject: (val) => {
        return val && typeof val === "object";
    },
    isPromise: (val) => {
        return val && val instanceof Adehun;
    }
};

class Adehun {
    constructor(fn) {
        this.value = null;
        this.state = validStates.PENDING;
        this.queue = [];
        this.handlers = {
            fulfill: null,
            reject: null
        };

        if (fn) {
            fn(value => {
                Resolve(this, value);
            }, reason => {
                this.reject(reason);
            });
        }
    }

    then(onFulfilled, onRejected) {
        const queuedPromise = new Adehun();
        if (Utils.isFunction(onFulfilled)) {
            queuedPromise.handlers.fulfill = onFulfilled;
        }

        if (Utils.isFunction(onRejected)) {
            queuedPromise.handlers.reject = onRejected;
        }

        this.queue.push(queuedPromise);
        this.process();

        return queuedPromise;
    }

    transition(state, value) {
        if (this.state === state ||
            this.state !== validStates.PENDING ||
            !isValidState(state) ||
            arguments.length !== 2) {
            return;
        }

        this.value = value;
        this.state = state;
        this.process();
    }

    process() {
        const fulfillFallBack = (value) => {
            return value;
        };
        const rejectFallBack = (reason) => {
            throw reason;
        };

        if (this.state === validStates.PENDING) {
            return;
        }

        Utils.runAsync(() => {
            while (this.queue.length) {
                let queuedPromise = this.queue.shift(),
                    handler = null,
                    value;

                if (this.state === validStates.FULFILLED) {
                    handler = queuedPromise.handlers.fulfill || fulfillFallBack;
                } else if (this.state === validStates.REJECTED) {
                    handler = queuedPromise.handlers.reject || rejectFallBack;
                }

                try {
                    value = handler(this.value);
                } catch (e) {
                    queuedPromise.transition(validStates.REJECTED, e);
                    continue;
                }

                Resolve(queuedPromise, value);
            }
        });
    }

    fulfill(value) {
        this.transition(validStates.FULFILLED, value);
    }

    reject(reason) {
        this.transition(validStates.REJECTED, reason);
    }
}

function Resolve(promise, x) {
    if (promise === x) {
        promise.transition(validStates.REJECTED, new TypeError("The promise and its value refer to the same object"));
    } else if (Utils.isPromise(x)) {
        if (x.state === validStates.PENDING) {
            x.then(val => {
                Resolve(promise, val);
            }, reason => {
                promise.transition(validStates.REJECTED, reason);
            });
        } else {
            promise.transition(x.state, x.value);
        }
    } else if (Utils.isObject(x) || Utils.isFunction(x)) {
        let called = false,
            thenHandler;
        try {
            thenHandler = x.then;

            if (Utils.isFunction(thenHandler)) {
                thenHandler.call(x,
                    y => {
                        if (!called) {
                            Resolve(promise, y);
                            called = true;
                        }
                    },
                    r => {
                        if (!called) {
                            promise.reject(r);
                            called = true;
                        }
                    });
            } else {
                promise.fulfill(x);
                called = true;
            }
        } catch (e) {
            if (!called) {
                promise.reject(e);
                called = true;
            }
        }
    } else {
        promise.fulfill(x);
    }
}

module.exports = {
    resolved: (value) => {
        return new Adehun(resolve => {
            resolve(value);
        });
    },
    rejected: (reason) => {
        return new Adehun((resolve, reject) => {
            reject(reason);
        });
    },
    deferred: () => {
        let resolve, reject;

        return {
            promise: new Adehun((rslv, rjct) => {
                resolve = rslv;
                reject = rjct;
            }),
            resolve: resolve,
            reject: reject
        };
    }
};
