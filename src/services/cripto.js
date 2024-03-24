const CryptoJS = require("crypto-js")


/**
 * Se encarga de decodificar la data que llega
 * del servidor.
 * 
 * @param {*} data 
 * @returns string
 */
const decodeData = (data) => (
  CryptoJS.enc.Base64.parse(
    data.split("").reverse().join(""))
)


/**
 * Se encarga de deocificar la payload que llega
 * del servidor.
 * 
 * @param {*} payload 
 * @returns object
 */
const decodePayload = payload => {
  const REAL_PAYLOAD = payload.split("").reverse().join("")
  const SPLIT_PAYLOAD = atob(REAL_PAYLOAD).split(":")
  return {
    key: CryptoJS.enc.Base64.parse(SPLIT_PAYLOAD[0]),
    iv: CryptoJS.enc.Base64.parse(SPLIT_PAYLOAD[1])
  }
}


/**
 * Se encarga de decodificar la informacion que
 * llega del servidor.
 * 
 * @param {*} payload 
 * @returns object
 */
const decryptor = props => {
  const { key, iv } = decodePayload(props.payload)
  const data = decodeData(props.data)
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: data },
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  )
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8))
}


export {
  decryptor
}
