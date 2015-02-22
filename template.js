var State = {
  PENDING: 0,
  FULFILLED: 1,
  REJECTED: 2
};

var transition = function(state, value) {
  
  if (this.state == state ||          // must change the state
      this.state !== State.PENDING || // can only change from pending
      (state != State.FULFILLED &&    // can only change to fulfill or reject
          state != State.REJECTED) ||
      arguments.length < 2) {         // must provide value/reason
    return false;
  }

  this.state = state;                 // change state
  this.value = value;
  this.run();                         // we’ll see this later
};

var then = function(onFulfilled, onRejected) {
  // need to return a promise
  var promise = new Promise();

  this.queue.push({
    fulfill : typeof onFulfilled == 'function' && onFulfilled,
    reject : typeof onRejected == 'function' && onRejected,
    promise: promise
  });
  this.run(); // We’ll see this later
  
  return promise;
};

var resolve = function(promise, x) {
  if (promise === x) {
    promise.transition(State.REJECTED, new TypeError());
  } else if (x && x.constructor == Promise) { // must know it’s implementation
    if (x.state == State.PENDING) { // 2.3.2.1
      x.then(function(value) {
        resolve(promise, value);
      }, function(reason) {
        promise.transition(State.REJECTED, reason);
      });
    } else {
      promise.transition(x.state, x.value);
    }
  } else if ((typeof x == 'object' || typeof x == 'function') && x != null) {
    var called = false;
    try {
      var then = x.then;
      if (typeof then == 'function') {
        then.call(x, function(y) {
          called || resolve(promise, y);
          called = true;
        }, function(r) {
          called || promise.transition(State.REJECTED, r);
          called = true;
        });
      } else {
        promise.transition(State.FULFILLED, x);
      }
    } catch(e) {
      called || promise.transition(State.REJECTED, e);
    }
  } else {
    promise.transition(State.FULFILLED, x);
  }
};

var run = function() {
  if (this.state == State.PENDING) return;
  var self = this;
  setTimeout(function() {
    while(self.queue.length) {
      var obj = self.queue.shift();
      try {
        // resolve returned promise based on return
        var value = (self.state == State.FULFILLED ?
            (obj.fulfill || function(x) {return x;}) :
            (obj.reject || function(x) {throw x;}))
                (self.value);
      } catch (e) {
        // reject if an error is thrown
        obj.promise.transition(State.REJECTED, e);
        continue;
      }
      resolve(obj.promise, value);
    }
  }, 0);
};

var Promise = function(fn) {
  var self = this;
  this.state = State.PENDING;
  this.queue = [];
  fn && fn(function(value) {
    resolve(self, value);
  }, function(reason) {
    self.transition(State.REJECTED, reason);
  });
};
Promise.prototype.transition = transition;
Promise.prototype.run = run;
Promise.prototype.then = then;

module.exports = {
  resolved: function(value) {
    return new Promise(function(res) {res(value);});
  },
  rejected: function(reason) {
    return new Promise(function(res, rej) {rej(reason);});
  },
  deferred: function() {
    var resolve, reject;
    return {
      promise: new Promise(function(res, rej) {
        resolve = res;
        reject = rej;
      }),
      resolve: resolve,
      reject: reject
    };
  }
};