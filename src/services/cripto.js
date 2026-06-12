const CryptoJS = require("crypto-js");

/**
 * Decodes the data that arrives
 * from the server.
 */
const decodeData = (data) =>
  CryptoJS.enc.Base64.parse(data.split("").reverse().join(""));

/**
 * Decodes the payload that arrives
 * from the server.
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
 * Decrypts the information that
 * arrives from the server.
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
 * Cifra el body de un request — ESPEJO SIMÉTRICO EXACTO del decrypt de
 * respuesta (mismo AES-CBC/PKCS7, mismo sobre base64 + reverse, formato
 * key:iv invertido). NO es cripto nueva: es la dirección inversa del
 * esquema que ya existe. La clave/iv se generan aquí (random) y viajan
 * en el sobre → OPACIDAD de transporte, NO seguridad (TLS es la defensa
 * real contra MITM).
 *
 * Devuelve { payload, data }: `payload` va en el header X-Request-Payload
 * y `data` es el body (ciphertext base64 invertido); el backend lo
 * descifra con el mismo formato (RequestDecryptMiddleware).
 */
function encrypt(plainString) {
  const key = CryptoJS.lib.WordArray.random(16); // AES-128, igual que el BE
  const iv = CryptoJS.lib.WordArray.random(16);
  const cipher = CryptoJS.AES.encrypt(plainString, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const keyB64 = CryptoJS.enc.Base64.stringify(key);
  const ivB64 = CryptoJS.enc.Base64.stringify(iv);
  const ciphertextB64 = cipher.ciphertext.toString(CryptoJS.enc.Base64);
  return {
    payload: btoa(`${keyB64}:${ivB64}`).split("").reverse().join(""),
    data: ciphertextB64.split("").reverse().join(""),
  };
}

export { decrypt, encrypt };
