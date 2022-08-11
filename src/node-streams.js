/**
 * Transform streams example
 *
 * Processing a file using Transform streams.
 * Measuring performances using perf hooks.
 *
 * Usual performances on my MacBook:
 * [ PerformanceEntry {
 *  name: 'Main',
 *  entryType: 'measure',
 *  startTime: 258.94266,
 *  duration: 1764.473395 } ]
 *
 */

/* eslint-disable no-console */
/* eslint-disable no-cond-assign */
/* eslint-disable class-methods-use-this */
/* eslint-disable import/no-unresolved */
/* eslint-disable node/no-missing-require */

const path = require("path");
const fs = require("fs");
const { pipeline, Transform, Writable } = require("stream");
const { performance, PerformanceObserver } = require("perf_hooks");

// 1. Measure performances
const perfs = new PerformanceObserver((list, observer) => {
  console.log(list.getEntries());
  performance.clearMarks();
  observer.disconnect();
});

perfs.observe({ entryTypes: ["measure"], buffered: true });

// 2. Actual Transform streams example
const TEST_PATH = path.resolve(__dirname, "../files/bigfile.log"); // size: 12949030 bytes
const ENCODING = "utf8";
const HIGH_WATERMARK = 16384;

class ChunksToLinesTransform extends Transform {
  constructor() {
    super();
    this.prev = "";
  }

  _transform(chunk, encoding, cb) {
    this.prev += chunk;
    let eolIndex;
    while ((eolIndex = this.prev.indexOf("\n")) >= 0) {
      const line = this.prev.slice(0, eolIndex + 1);
      this.push(line);
      this.prev = this.prev.slice(eolIndex + 1);
    }
    cb();
  }

  _destroy(err, cb) {
    if (this.prev.length > 0) {
      this.push(this.prev);
    }
    cb();
  }
}

class NumberLinesTransform extends Transform {
  constructor() {
    super();
    this.counter = 1;
  }

  _transform(chunk, encoding, cb) {
    this.push(`${this.counter}: ${chunk}`);
    this.counter += 1;
    cb();
  }
}

class SinkStream extends Writable {
  _write(chunk, encoding, cb) {
    console.log(chunk.toString());
    cb();
  }

  _final(cb) {
    performance.mark("Main-Finish");
    performance.measure("Main", "Main-Begin", "Main-Finish");
    cb();
  }
}

async function main() {
  performance.mark("Main-Begin");

  await pipeline(
    fs.createReadStream(TEST_PATH, {
      encoding: ENCODING,
      highWaterMark: HIGH_WATERMARK
    }),
    new ChunksToLinesTransform(),
    new NumberLinesTransform(),
    new SinkStream()
  );
}

main();
