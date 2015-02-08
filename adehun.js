var validStates = {
    PENDING:0,
    FULFILLED:1,
    REJECTED:2
};

var isValidState = function(state) {
    return ((state === validStates.PENDING) || 
            (state === validStates.REJECTED) ||
            (state === validStates.FULFILLED));
};

var Utils = {
    runAsync: function(fn) {
        setTimeout(fn, 0);
    },
    isFunction: function(val) {
        return val && typeof val === "function";
    },
    isObject: function(val) {
        return val && typeof val === "object";
    },
    isPromise: function(val) {
        return val && val.constructor === "Promise";
    }
};

function Resolve(promise, x) {
    if(promise === x) {
        promise.transition(validStates.REJECTED, new TypeError("The promise and its value refer to the same object"));
    } else if(Utils.isPromise(x)) {
        if(x.state === validStates.PENDING) {
            x.then(function(value){
                promise.fulfil(value);
            }, function(reason){
                promise.reject(reason);
            });
        } else {
            promise.transition(x.state, x.value);
        }
    } else if (Utils.isObject(x) || Utils.isFunction(x)) {
        var called = false;
        try {
            var thenHandler = x.then;        

            if(Utils.isFunction(thenHandler)) {
                thenHandler.call(x,
                        function (y) {
                            if(!called) {
                                Resolve(promise, y);
                                called = true;
                            }
                        },
                        function(r) {
                            if(!called) {
                                promise.reject(r);
                                called = true;
                            }
                        });
            } else {
                promise.fulfill(x);
                called = true;
            }
        } catch (e) {
            if(!called) {
                promise.reject(e);
                called = true;
            }
        }
    } else {
        promise.fulfill(x);
    }
}

var then = function(onFulfilled, onRejected) {
    var queuedPromise = new Promise();
    if(Utils.isFunction(onFulfilled)){
        queuedPromise.handlers.fulfill = onFulfilled;
    }

    if(Utils.isFunction(onRejected)){
        queuedPromise.handlers.reject = onRejected;
    }

    this.queue.push(queuedPromise);
    this.process();

    return queuedPromise;
};

var process = function() {
    var that = this;
    if(this.state === validStates.PENDING){
        return;
    }

    Utils.runAsync(function () { 
        while(that.queue.length) {
            var queuedPromise = that.queue.shift();       
            var handler = null;

            if(that.state === validStates.FULFILLED) {
                handler = queuedPromise.handlers.fulfill || function (value) { return value; };
            } else if (that.state === validStates.REJECTED) {
                handler = queuedPromise.handlers.reject || function (value) { throw value; };
            }

            try {
                var value = handler(that.value);
            } catch (e) {
                queuedPromise.transition(validStates.REJECTED, e);
                continue;
            }

            Resolve(queuedPromise, value);
        }
    });
};

var transition = function(state, value) {
    if(this.state === state ||
       this.state !== validStates.PENDING ||
       !isValidState(state) ||
       arguments.length !== 2) {
                return;
            }

    this.value = value;
    this.state = state;
    this.process();
};

var fulfill = function(value) {
    this.transition(validStates.FULFILLED, value);
};

var reject = function(reason) {
    this.transition(validStates.REJECTED, reason);
};

var Promise = function(fn) {
    var that = this;

    this.value = null;
    this.state = validStates.PENDING;
    this.queue = [];
    this.handlers = {
        fulfill : null,
        reject : null
    };

    if(fn) {
        fn(function(value) {
            Resolve(that, value);
        },
        function(reason) {
            that.transition(validStates.REJECTED, reason);
        });
    }
};

Promise.prototype.transition = transition;
Promise.prototype.process = process;
Promise.prototype.then = then;
Promise.prototype.fulfill = fulfill;
Promise.prototype.reject = reject;

module.exports = {
    resolved: function (value) {
        return new Promise(function (resolve) {
            resolve(value);
        });
    },
    rejected: function (reason) {
        return new Promise(function (resolve, reject) {
            reject(reason);
        });
    },
    deferred: function () {
        var resolve, reject;

        return {
            promise: new Promise(function(rslv, rjct){
                resolve = rslv;
                reject = rjct;
            }),
                resolve: resolve,
                reject: reject
        };
    }
};
