import axios from 'axios';
import { decryptor } from './cripto';


const CRIPTO_CONTENT_TYPE = "application/raw"


const getReactionService = async _ => {
  var url = `${process.env.REACT_APP_API_URL}/reactions/`
  var response = await axios.get(url)
  if (response.headers["content-type"].indexOf(CRIPTO_CONTENT_TYPE) !== -1) {
    response.data = decryptor({
      payload: response.headers["x-response-payload"],
      data: response.data
    })
  }
  return response
}

const createReactionService = async props => {
  var url = props.id = `${process.env.REACT_APP_API_URL}/reactions/`
  const data = {
    "reaction": props.reaction,
    "thread": props.thread
  }

  var response = await axios.post(url, data, { 'Content-Type': 'application/json' })
  if (response.headers["content-type"].indexOf(CRIPTO_CONTENT_TYPE) !== -1) {
    response.data = decryptor({
      payload: response.headers["x-response-payload"],
      data: response.data
    })
  }
  return response
}

export { createReactionService, getReactionService }
