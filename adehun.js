// Use class and object init method to ensure that resolve is only on parent object
// all children call static parent method
// States constant - use closure?
// TransitionState function
// Allow handling of several thens
// Use settimeout of 0 to push off event loop - guarantees async
// Clone promises-tests and check
// then method
//

function runAsync(fn) {
    setTimeout(fn, 0);
}

function isFunction(obj){
    return typeof obj === "function";
}

function isObject(obj){
    return typeof obj === "object";
}

function isPromise(obj){
    throw new Error("Unimplemented");
}

function Resolve(promise, x) {
    if(promise === x){
        promise.transition(validStates.REJECTED, new TypeError("The promise and its value refer to the same object"));
    } else if(isPromise(x)) {
        if(x.state === validStates.PENDING) {
            x.then(function(value){
                //why not resolve(promise, value)?
                promise.fulfill(value);
            }, function(reason){
                promise.reject(reason);
            });
        } else {
            promise.transition(x.state, x.value);
        }
    } else if (isObject(x) || isFunction(x)) {
        var called = false;
        try {
            var thenHandler = x.then;        

            if(isFunction(thenHandler)) {
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
            }
        } catch (e) {
            if(!called) {
                promise.reject(e);
            }
        }
    } else {
        promise.fulfill(x);
    }
}
var adehun = {
    state: 0,
    value: null,
    handlers:{
        fulfill: null,
        reject: null
    },
    isValidState: function(state) {
        return ((state === validStates.PENDING) || 
                (state === validStates.REJECTED) ||
                (state === validStates.FULFILLED));
    },
    validStates: {
        PENDING:0,
        FULFILLED:1,
        REJECTED:2
    },
    queue : [],
    transition: function(state, value) {
        if(this.state === state || 
           this.state !== validStates.PENDING ||
           !isValidState(state) ||
           arguments.length !== 2) {
            return;
        }

        this.value = value;
        this.state = state;
        this.process();
    },
    then: function(onFulfilled, onRejected) {
        var queuedPromise = new Object.create(this);
        if(isFunction(onFulfilled){
            queuedPromise.handlers.fulfill = onFulfilled;
        }

        if(isFunction(onRejected){
            queuedPromise.handlers.reject = onRejected;
        }

        this.queue.push(queuedPromise);

        return queuedPromise;

        //check if Object.create(adehun) is better
        //return Object.create(this);
    },
    fulfill: function(value) {
        this.transition(validStates.FULFILLED, value);
    },
    reject: function(reason) {
        this.transition(validStates.REJECTED, reason);
    },
    process: function() {
        if(this.state === validStates.PENDING){
            return;
        }

        while(this.queue.length) {
            var queuedPromise = this.queue.shift();       
            var handler = null;

            if(this.state === validStates.FULFILLED) {
                var handler = queuedPromise.handlers.fulfill || function (value) { return value; };
            } else if (this.state === validStates.REJECTED) {
                var handler = queuedPromise.handlers.reject || function (value) { throw value; };
            }

            try {
                var value = handler(this.value);
            } catch (e) {
                queuedPromise.transition(validStates.REJECTED, e);
                continue;
            }

            Resolve(queuedPromise, value);
        }
    }
};
