import promisesAplusTests from 'promises-aplus-tests';
import Adehun from './adehun.js';

promisesAplusTests(Adehun, err => {
  // All done; output is in the console. Or check `err` for number of failures.
  console.log(err);
});
