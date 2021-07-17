"use strict";

const fs = require("fs");
const rewire = require("rewire");
const rewiredCli = rewire("../lib/cli.js");
const processCommand = rewiredCli.__get__("processCommand");

const validArgs = {
  title: "Covariance and Contravariance in Generic Programming",
  subtitle: "Tech Blog",
  author: "Rahul Bakale",
  date: "2018-09-27",
  graphic: "./examples/input-avatar.png",
  output: "./tests/tmp/output.png",
};

const mandatoryArgs = Object.keys(validArgs);

beforeEach(() => {
  fs.mkdirSync("./tests/tmp", { recursive: true });
});

afterEach(() => {
  fs.rmdirSync("./tests/tmp", { recursive: true });
});

test("fails when no arguments are supplied", () => {
  return expect(runCommand([])).rejects.toThrow(
    /Missing required arguments:.*/
  );
});

test.each(mandatoryArgs)(
  "fails when the %s argument is not supplied",
  (argName) => {
    const invalidArgs = Object.assign({}, validArgs);
    delete invalidArgs[argName];
    var args = getArgsArray(invalidArgs);

    return expect(runCommand(args)).rejects.toThrow(
      "Missing required argument: " + argName
    );
  }
);

test.each(Object.keys(validArgs))(
  "fails when the %s argument is an empty string",
  (argName) => {
    return verifyFailureWhenArgValueIsAWhitespaceOnlyString(argName, "");
  }
);

test.each(Object.keys(validArgs))(
  "fails when the %s argument is a whitespace-only string",
  (argName) => {
    return verifyFailureWhenArgValueIsAWhitespaceOnlyString(argName, "  \t ");
  }
);

test.each([
  "2021-31-12",
  "12-2021-31",
  "31-2021-12",
  "31-12-2021",
  "12-31-2021",
  "2021-12",
  "2021-31",
  "12-31",
])("fails when the date argument is an invalid date (%s)", (argValue) => {
  const argName = "date";
  const invalidArgs = Object.assign({}, validArgs);
  invalidArgs[argName] = argValue;
  var args = getArgsArray(invalidArgs);
  return expect(runCommand(args)).rejects.toThrow(
    `'${argValue}' is an invalid value for argument ${argName}. ${argValue} is not a valid date.`
  );
});

test("fails when graphic argument is a non-existent file", () => {
  const argName = "graphic";
  const argValue = "/tmp/foo.png";
  const failureReason = `ENOENT: no such file or directory, stat '${argValue}'`;

  const invalidArgs = Object.assign({}, validArgs);
  invalidArgs[argName] = argValue;
  var args = getArgsArray(invalidArgs);

  return expect(runCommand(args)).rejects.toThrow(
    `'${argValue}' is an invalid value for argument ${argName}. ${failureReason}`
  );
});

test("fails when graphic argument is a directory", () => {
  const args = Object.assign({}, validArgs);
  args["graphic"] = "./examples/";
  const argsArray = getArgsArray(args);

  return expect(runCommand(argsArray)).rejects.toThrow(
    `'${args.graphic}' is an invalid value for argument graphic. '${args.graphic}' is a directory.`
  );
});

test("fails when output argument is an existing directory", () => {
  const args = Object.assign({}, validArgs);
  args["output"] = "./tests/tmp/";
  const argsArray = getArgsArray(args);

  return expect(runCommand(argsArray)).rejects.toThrow(
    `'${args.output}' is an invalid value for argument output. '${args.output}' is a directory.`
  );
});

test("does not fail when output argument is a path whose parent is a non-existent directory", async () => {
  const args = Object.assign({}, validArgs);
  args["output"] = "./tests/tmp/nonexistent/output.png";

  const path = require("path");
  const outputParentDir = path.dirname(args.output);

  expect(fs.existsSync(outputParentDir)).toBe(false);

  await runCommand(getArgsArray(args));
  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(fs.existsSync(outputParentDir)).toBe(true);

  expect(readFile(args.output)).toEqual(readFile("./examples/output.png"));
}, 20000);

test("does not fail when output argument is an existing file", async () => {
  const args = Object.assign({}, validArgs);

  fs.writeFileSync(args.output, "sometext");
  expect(fs.existsSync(args.output)).toBe(true);

  await runCommand(getArgsArray(args));
  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(readFile(args.output)).toEqual(readFile("./examples/output.png"));
}, 20000);

test("generates image when proper arguments are supplied", async () => {
  const args = Object.assign({}, validArgs);
  const argsArray = getArgsArray(args);

  await runCommand(argsArray);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  expect(readFile(args.output)).toEqual(readFile("./examples/output.png"));
}, 20000);

function getArgsArray(args) {
  const output = [];

  Object.keys(args).forEach(function (key) {
    output.push("--" + key);
    output.push(args[key]);
  });
  return output;
}

function verifyFailureWhenArgValueIsAWhitespaceOnlyString(argName, argValue) {
  const invalidArgs = Object.assign({}, validArgs);
  invalidArgs[argName] = argValue;
  var args = getArgsArray(invalidArgs);

  return expect(runCommand(args)).rejects.toThrow(
    `'${argValue}' is an invalid value for argument ${argName}. The value cannot be a whitespace-only string.`
  );
}

async function runCommand(args) {
  await processCommand(args);
}

function readFile(path) {
  const buffer = fs.readFileSync(path);
  return Buffer.from(
    buffer,
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}
