import axios from 'axios';
import { decryptor } from './cripto';


const CRIPTO_CONTENT_TYPE = "application/raw"

const paginationService = async (props) => {
    const url = props.next
    var response = await axios.get(url, {})
    if (response.headers["content-type"].indexOf(CRIPTO_CONTENT_TYPE) !== -1) {
        response.data = decryptor({
          payload: response.headers["x-response-payload"],
          data: response.data
        })
      }
    return response
}

export { paginationService }
