#!/usr/bin/env node

var fs = require('fs');
var minimist = require('minimist');
var esverify = require("../esverify.js");

function error(msg) {
  console.error(msg);
  process.exit(1);
}

function usage(err) {
  console.log('Usage: esverify [OPTIONS] FILE\n');
  console.log('Options:');
  console.log('  -f, --logformat FORMAT  Format can be either "simple" or "colored"');
  console.log('                          (default format is "colored")');
  console.log('  --z3path PATH           Path to local z3 executable');
  console.log('                          (default path is "z3")');
  console.log('  -r, --remote            Invokes z3 remotely via HTTP request');
  console.log('  --z3url URL             URL to remote z3 web server');
  console.log('  -q, --quiet             Suppresses output');
  console.log('  -h, --help              Prints this help text and exit');
  console.log('  -v, --version           Prints version information');
  process.exit(err ? 1 : 0);
}

var opts = minimist(process.argv.slice(2), {
  boolean: ["quiet", "remote", "help", "version"],
  string: ["logformat", "z3path", "z3url"],
  default: { quiet: false },
  alias: {q: "quiet", v: "version", h: "help", r: "remote", f: "logformat"},
  unknown: function(opt) { if (opt[0] == '-' && opt != '-') usage(true); }
});
if (opts.version) { console.log("0.1.2"); process.exit(0); }
if (opts._.length != 1 || opts.help) usage(!opts.help);
opts.filename = opts._[0];

function run(err, js) {
  if (err) error('Error: ' + e.message);
  esverify.verify(js.toString(), opts)
    .then(msgs => msgs.forEach(msg => msg.status != "verified" && error("failed")));
}

if (opts.filename !== '-') {
  fs.readFile(opts.filename, run);
} else {
  var content = '';
  process.stdin.resume();
  process.stdin.on('data', chunk => content += chunk);
  process.stdin.on('error', e => error('Error: ' + e.message));
  process.stdin.on('end', () => run(null, content));
}
