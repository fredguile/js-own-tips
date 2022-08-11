/**
 * Node 10.x Async Iterators example
 *
 * Trying out async iterators introduced in Node 10 for processing a file using generators.
 * Measuring performances using perf hooks.
 *
 * Usual performances on my MacBook:
 * [ PerformanceEntry {
 *  name: 'Main',
 *  entryType: 'measure',
 *  startTime: 232.845343,
 *  duration: 1489.117426 } ]
 *
 */

/* eslint-disable no-console */
/* eslint-disable no-cond-assign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-unresolved */
/* eslint-disable node/no-missing-require */

if (typeof Symbol.asyncIterator === "undefined") {
  throw new Error(
    "Async iterators aren't currently supported by your Node version"
  );
}

const path = require("path");
const fs = require("fs");
const { performance, PerformanceObserver } = require("perf_hooks");

// 1. Measure performances
const perfs = new PerformanceObserver((list, observer) => {
  console.log(list.getEntries());
  performance.clearMarks();
  observer.disconnect();
});

perfs.observe({ entryTypes: ["measure"], buffered: true });

// 2. Actual async iterator example
const TEST_PATH = path.resolve(__dirname, "../files/bigfile.log"); // size: 12949030 bytes
const ENCODING = "utf8";
const HIGH_WATERMARK = 16384;

/**
 * Functions "compose" helper (of the purest form I could find)
 *
 * @param {Array<Function>} fns
 */
function compose(...fns) {
  return fns.reduce((f, g) => (...args) => f(g(...args)));
}

/**
 * Generator for splitting chunks into lines (using \n as line separator)
 *
 * @param {Promise} an iterable Promise returning chunks
 */
async function* chunksToLines(chunksAsync) {
  let prev = "";
  for await (const chunk of chunksAsync) {
    prev += chunk;
    let eolIndex;
    while ((eolIndex = prev.indexOf("\n")) >= 0) {
      const line = prev.slice(0, eolIndex + 1);
      yield line;
      prev = prev.slice(eolIndex + 1);
    }
  }
  if (prev.length > 0) {
    yield prev;
  }
}

/**
 * Generator for prefixing lines with line numbers
 *
 * @param {Promise} an iterable Promise returning lines
 */
async function* numberLines(linesAsync) {
  let counter = 1;
  for await (const line of linesAsync) {
    yield `${counter}: ${line}`;
    counter += 1;
  }
}

async function main() {
  performance.mark("Main-Begin");

  const input = fs.createReadStream(TEST_PATH, {
    encoding: ENCODING,
    highWaterMark: HIGH_WATERMARK
  });

  const transformed = compose(
    numberLines,
    chunksToLines
  )(input);

  for await (const line of transformed) {
    console.log(line);
  }

  performance.mark("Main-Finish");
  performance.measure("Main", "Main-Begin", "Main-Finish");
}

main();
