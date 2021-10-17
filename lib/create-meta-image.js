"use strict";

const fs = require("fs");
const { isValidDate } = require("iso-datestring-validator");
const Jimp = require("jimp");

const constants = {
  OUTPUT: {
    IMAGE: {
      WIDTH: 1200,
      HEIGHT: 630,
      BACKGROUND_COLOR: "white",
    },
    TEXT_AREA: {
      LEFT_MARGIN: 80,
      TOP_MARGIN: 80,
      WIDTH: 840,
    },
    TITLE: {
      FONT: Jimp.FONT_SANS_64_BLACK,
      COLOR: "black",
      MAX_WRAPPED_ROWS: 5,
    },
    SUBTITLE: {
      FONT: Jimp.FONT_SANS_32_BLACK,
      COLOR: "#586069",
      MAX_WRAPPED_ROWS: 1,
    },
    AUTHOR: {
      FONT: Jimp.FONT_SANS_32_BLACK,
      COLOR: "#586069",
      MAX_WRAPPED_ROWS: 1,
    },
    DATE: {
      FONT: Jimp.FONT_SANS_32_BLACK,
      COLOR: "#586069",
      MAX_WRAPPED_ROWS: 1,
    },
    SEPARATOR: {
      COLOR: "#586069",
    },
    GRAPHIC: {
      WIDTH: 180,
      HEIGHT: 180,
    },
  },
};

/**
 * Creates an image out of the given arguments.
 * @param {string} title Title.
 * @param {string} subtitle Subtitle.
 * @param {string} author Author.
 * @param {string} date Date.
 * @param {string} graphic Path of a graphic.
 * @param {string} output Path where the output image should be saved.
 */
async function createMetaImage(title, subtitle, author, date, graphic, output) {
  validateArgIsNotAWhitespaceOnlyString("title", title);
  validateArgIsNotAWhitespaceOnlyString("subtitle", subtitle);
  validateArgIsNotAWhitespaceOnlyString("author", author);
  validateArgIsNotAWhitespaceOnlyString("date", date);
  validateArgIsNotAWhitespaceOnlyString("graphic", graphic);
  validateArgIsNotAWhitespaceOnlyString("output", output);

  var graphicStat;
  try {
    graphicStat = fs.statSync(graphic);
  } catch (err) {
    throw new Error(
      `'${graphic}' is an invalid value for argument graphic. ${err.message}`
    );
  }

  if (graphicStat.isDirectory()) {
    throw new Error(
      `'${graphic}' is an invalid value for argument graphic. '${graphic}' is a directory.`
    );
  }

  if (fs.existsSync(output) && fs.statSync(output).isDirectory()) {
    throw new Error(
      `'${output}' is an invalid value for argument output. '${output}' is a directory.`
    );
  }

  if (!isValidDate(date)) {
    throw new Error(
      `'${date}' is an invalid value for argument date. ${date} is not a valid date.`
    );
  }

  const backgroundImage = await createBackgroundImage();
  const titleImage = await createTitleImage(title);
  const subtitleImage = await createSubtitleImage(subtitle);
  const authorNameImage = await createAuthorNameImage(author);
  const dateImage = await createDateImage(new Date(date));
  const separatorImage = await createDotSeparatorImage(
    authorNameImage.getHeight() / 3
  );
  const croppedGraphic = await cropGraphic(graphic);

  const titleCoords = {
    x: constants.OUTPUT.TEXT_AREA.LEFT_MARGIN,
    y: constants.OUTPUT.TEXT_AREA.TOP_MARGIN,
  };

  const subtitleCoords = {
    x: constants.OUTPUT.TEXT_AREA.LEFT_MARGIN,
    y: titleCoords.y + titleImage.getHeight() + 40,
  };

  const authorNameCoords = {
    x: constants.OUTPUT.TEXT_AREA.LEFT_MARGIN,
    y: subtitleCoords.y + subtitleImage.getHeight() + 30,
  };

  const separatorCoords = {
    x: authorNameCoords.x + authorNameImage.getWidth() + 20,
    y:
      authorNameCoords.y +
      authorNameImage.getHeight() / 2 -
      separatorImage.getHeight() / 2,
  };

  const dateCoords = {
    x: separatorCoords.x + separatorImage.getWidth() + 20,
    y: authorNameCoords.y,
  };

  const graphicCoords = {
    x:
      constants.OUTPUT.TEXT_AREA.LEFT_MARGIN +
      constants.OUTPUT.TEXT_AREA.WIDTH +
      30,
    y: constants.OUTPUT.TEXT_AREA.TOP_MARGIN,
  };

  const images = [
    { image: titleImage, coords: titleCoords },
    { image: subtitleImage, coords: subtitleCoords },
    { image: authorNameImage, coords: authorNameCoords },
    { image: separatorImage, coords: separatorCoords },
    { image: dateImage, coords: dateCoords },
    { image: croppedGraphic, coords: graphicCoords },
  ];

  images.forEach(({ image, coords }) =>
    backgroundImage.blit(image, coords.x, coords.y)
  );

  backgroundImage.write(output);
}

function validateArgIsNotAWhitespaceOnlyString(argName, argValue) {
  if (argValue.trim().length == 0) {
    throw new Error(
      `'${argValue}' is an invalid value for argument ${argName}. The value cannot be a whitespace-only string.`
    );
  }
}

/**
 * Creates a background image.
 */
async function createBackgroundImage() {
  return createImage(
    constants.OUTPUT.IMAGE.WIDTH,
    constants.OUTPUT.IMAGE.HEIGHT,
    constants.OUTPUT.IMAGE.BACKGROUND_COLOR
  );
}

/**
 * Creates an image out of title.
 * @param {string} title Title.
 */
async function createTitleImage(title) {
  return await createImageForText(
    title,
    constants.OUTPUT.TITLE.FONT,
    constants.OUTPUT.TITLE.COLOR,
    constants.OUTPUT.TEXT_AREA.WIDTH,
    constants.OUTPUT.TITLE.MAX_WRAPPED_ROWS
  );
}

/**
 * Creates an image out of subtitle.
 * @param {string} subtitle Subtitle.
 */
async function createSubtitleImage(subtitle) {
  return await createImageForText(
    subtitle,
    constants.OUTPUT.SUBTITLE.FONT,
    constants.OUTPUT.SUBTITLE.COLOR,
    constants.OUTPUT.TEXT_AREA.WIDTH,
    constants.OUTPUT.SUBTITLE.MAX_WRAPPED_ROWS
  );
}

/**
 * Creates an image out of author's name.
 * @param {string} author Author's name.
 */
async function createAuthorNameImage(author) {
  return await createImageForText(
    author,
    constants.OUTPUT.AUTHOR.FONT,
    constants.OUTPUT.AUTHOR.COLOR,
    constants.OUTPUT.TEXT_AREA.WIDTH,
    constants.OUTPUT.AUTHOR.MAX_WRAPPED_ROWS
  );
}

/**
 * Creates an image out of date.
 * @param {string} date Date.
 */
async function createDateImage(date) {
  return await createImageForText(
    formatDate(date),
    constants.OUTPUT.DATE.FONT,
    constants.OUTPUT.DATE.COLOR,
    constants.OUTPUT.TEXT_AREA.WIDTH,
    constants.OUTPUT.DATE.MAX_WRAPPED_ROWS
  );
}

/**
 * Creates an image of a dot separator.
 * @param {number} diameter Diameter of the dot.
 */
async function createDotSeparatorImage(diameter) {
  return await createCircularImage(diameter, constants.OUTPUT.SEPARATOR.COLOR);
}

/**
 * Resizes and crops a graphic into a circular image.
 * @param {string} graphic Path of a graphic.
 */
async function cropGraphic(graphic) {
  const image = await Jimp.read(graphic);
  return image
    .resize(constants.OUTPUT.GRAPHIC.WIDTH, constants.OUTPUT.GRAPHIC.HEIGHT)
    .circle();
}

/**
 * Creates image out of text.
 * @param {string} text The text to generate an image out of.
 * @param {string} fontName Text font.
 * @param {string} textColor Text color.
 * @param {int} maxImageWidth Maximum width of the generated image.
 * @param {int} maxWrappedTextRows Maximum number of rows when the text is
 * wrapped.
 */
async function createImageForText(
  text,
  fontName,
  textColor,
  maxImageWidth,
  maxWrappedTextRows
) {
  const font = await Jimp.loadFont(fontName);

  const textWidth = Jimp.measureText(font, text);
  const textHeightOneRow = Jimp.measureTextHeight(font, "a");
  const textHeightFull = Jimp.measureTextHeight(font, text, maxImageWidth);
  const actualWrappedTextRows = textHeightFull / textHeightOneRow;
  const allowedWrappedTextRows = Math.min(
    actualWrappedTextRows,
    maxWrappedTextRows
  );

  const imageWidth = Math.min(textWidth, maxImageWidth);
  const imageHeight = allowedWrappedTextRows * textHeightOneRow;

  const image = new Jimp(imageWidth, imageHeight, (err) => {
    if (err) throw err;
  });

  image.print(
    font,
    0,
    0,
    text,
    imageWidth, // truncate text
    imageHeight
  );

  image.color([{ apply: "xor", params: [textColor] }]);

  return image;
}

/**
 * Creates a circular image.
 * @param {number} diameter The diameter of the circle.
 * @param {string} backgroundColor The background color of the image.
 */
async function createCircularImage(diameter, backgroundColor) {
  const image = await createImage(diameter, diameter, backgroundColor);
  return image.circle();
}

/**
 * Creates an image.
 * @param {int} width Image width.
 * @param {int} height Image height.
 * @param {string} backgroundColor Image background color.
 */
async function createImage(width, height, backgroundColor) {
  const image = new Jimp(width, height, backgroundColor, (err, _) => {
    if (err) throw err;
  });

  return image;
}

/**
 * Formats a date into a string
 *
 * @param {date} date Date.
 */
function formatDate(date) {
  var months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear()
  );
}

module.exports = createMetaImage;
