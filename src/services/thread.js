import axios from 'axios';
import { decryptor } from './cripto';


const CRIPTO_CONTENT_TYPE = "application/raw"


const threadSearchService = async (props) => {
  const TYPE = props?.type === 'tag' ? 'tag' : 'q'
  var url = `${process.env.REACT_APP_API_URL}/threads/?${TYPE}=${props?.query}`
  var response = await axios.get(url)
  if (response.headers["content-type"].indexOf(CRIPTO_CONTENT_TYPE) !== -1) {
    response.data = decryptor({
      payload: response.headers["x-response-payload"],
      data: response.data
    })
  }
  return response
}

const commentService = async (props) => {
  var url = props.id = `${process.env.REACT_APP_API_URL}/threads/`
  const data = ({
    "sub": props.thread,
    "media": props.media,
    "text": props.text,
    "content": props.content
  })

  var response = await axios.post(url, data, { 'Content-Type': 'application/json' })
  if (response.headers["content-type"].indexOf(CRIPTO_CONTENT_TYPE) !== -1) {
    response.data = decryptor({
      payload: response.headers["x-response-payload"],
      data: response.data
    })
  }
  return response
}

const threadService = async (props) => {
  var url = props.id !== undefined ?
    `${process.env.REACT_APP_API_URL}/threads/${props.id}/responses/` :
    `${process.env.REACT_APP_API_URL}/threads/`

  var response = await axios.get(url)
  if (response.headers["content-type"].indexOf(CRIPTO_CONTENT_TYPE) !== -1) {
    response.data = decryptor({
      payload: response.headers["x-response-payload"],
      data: response.data
    })
  }
  return response
}


export { threadService, commentService, threadSearchService }
