var a = require("./adehun.js");

var b = a.deferred().promise;

b.transition(2, "done");

b.reject("tesyt");

b.state;
