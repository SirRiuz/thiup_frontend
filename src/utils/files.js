function getResolutionOfImageOrVideo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const url = event.target.result;
      if (file.type.startsWith("image")) {
        const img = new Image();
        img.onload = function () {
          resolve({ width: img.width, height: img.height });
        };
        img.src = url;
      } else if (file.type.startsWith("video")) {
        const video = document.createElement("video");
        video.onloadedmetadata = function () {
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = reject;
        video.src = url;
      } else {
        reject(new Error("The selected file is not an image or a video."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getPixelColor(image) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const pixelData = ctx.getImageData(
    image.width / 2,
    image.height / 2,
    1,
    1
  ).data;
  const hexColor =
    "#" +
    (
      "000000" +
      ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)
    ).slice(-6);
  return hexColor.toUpperCase();
}

function hexToRGBA(hex, alpha) {
  hex = hex.replace("#", "");
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);
  var a = alpha || alpha === 0 ? alpha : 1;
  return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
}

function getPixelColorOfImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const url = event.target.result;
      const img = new Image();
      img.onload = function () {
        const pixelColor = getPixelColor(img);
        resolve(pixelColor);
      };
      img.src = url;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export { getResolutionOfImageOrVideo, getPixelColorOfImage, hexToRGBA };
