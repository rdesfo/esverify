esverify
========

Verification System for ECMAScript/JavaScript

Example
-------

Given a simple JavaScript `max` function, we can add pre- and post-conditions
using special pseudo-calls to `requires` and `ensures` with boolean expressions.

```js
function max(a, b) {
  requires(typeof(a) == "number");
  requires(typeof(b) == "number");
  ensures(max(a,b) >= a);

  if (a >= b) {
    return a;
  } else {
    return b;
  }
}
```

These expressions will then be statically verified with respect to the function
body with an SMT solver.

Interactive Tools
-----------------

The tool support will be improved in the future but the first step is a
verification workspace which allows inspection of verificaiton results
including potential counter-examples.
