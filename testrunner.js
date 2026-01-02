const promisesAplusTests = require("promises-aplus-tests");
const Adehun = require("./adehun.js");

promisesAplusTests(Adehun, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
    console.log(err);
});
