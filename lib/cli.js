"use strict";

const yargs = require("yargs/yargs");
const createMetaImage = require("./create-meta-image");

/**
 * Main function
 */
async function run(argv = process.argv) {
  try {
    await processCommand(argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

async function processCommand(args) {
  const argv = parseArgs(args);

  if (argv.help || argv.version) {
    return;
  }

  await createMetaImage(
    argv.title,
    argv.subtitle,
    argv.author,
    argv.date,
    argv.graphic,
    argv.output
  );
}

function parseArgs(args) {
  return yargs(args)
    .command(
      "*",
      "Create an image that can be used in meta tags of a web page.",
      (yargs) => buildOptions(yargs)
    )
    .demandOption(["title", "subtitle", "author", "date", "graphic", "output"])
    .help()
    .alias("help", "h")
    .exitProcess(false).argv;
}

function buildOptions(yargs) {
  yargs
    .option("title", {
      description: "Title",
      type: "string",
      requiresArg: true,
    })
    .option("subtitle", {
      description: "Subtitle",
      type: "string",
      requiresArg: true,
    })
    .option("author", {
      description: "Author",
      type: "string",
      requiresArg: true,
    })
    .option("date", {
      description: "Date, in ISO 8601 (YYYY-MM-DD) format",
      type: "string",
      requiresArg: true,
    })
    .option("graphic", {
      description: "Path of a graphic to be included in the output",
      type: "string",
      requiresArg: true,
    })
    .option("output", {
      description: "Path where the output image should be saved",
      type: "string",
      requiresArg: true,
    });
}

module.exports = run;
