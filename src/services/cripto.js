import JWT, { SupportedAlgorithms } from "expo-jwt";
import uuid from "react-uuid";
const CryptoJS = require("crypto-js");

/**
 * Se encarga de decodificar la data que llega
 * del servidor.
 */
const decodeData = (data) =>
  CryptoJS.enc.Base64.parse(data.split("").reverse().join(""));

/**
 * Se encarga de deocificar la payload que llega
 * del servidor.
 */
function decodePayload(payload) {
  const REAL_PAYLOAD = payload.split("").reverse().join("");
  const SPLIT_PAYLOAD = atob(REAL_PAYLOAD).split(":");
  return {
    key: CryptoJS.enc.Base64.parse(SPLIT_PAYLOAD[0]),
    iv: CryptoJS.enc.Base64.parse(SPLIT_PAYLOAD[1]),
  };
}

/**
 * Se encarga de decodificar la informacion que
 * llega del servidor.
 */
function decrypt(props) {
  const { key, iv } = decodePayload(props.payload);
  const data = decodeData(props.data);
  const decrypted = CryptoJS.AES.decrypt({ ciphertext: data }, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

/**
 * Genera una firma criptografica aleatorea firmada
 * para que el backend pueda aceptar la peticion
 */
function getClientSing() {
  var currentDateTime = new Date();
  var year = currentDateTime.getFullYear();
  var month = currentDateTime.getMonth() + 1;
  var day = currentDateTime.getDate();
  var hour = currentDateTime.getHours();
  var minutes = currentDateTime.getMinutes();
  var seconds = currentDateTime.getSeconds();
  return JWT.encode(
    {
      timestamp:
        year +
        "-" +
        month +
        "-" +
        day +
        " " +
        hour +
        ":" +
        minutes +
        ":" +
        seconds,
      payload: uuid(),
    },
    process.env.REACT_APP_API_KEY
  );
}

export { decrypt, getClientSing };
