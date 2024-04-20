import { decrypt, getClientSing } from "./cripto";
import axios from "axios";

const CRYPTO_CONTENT_TYPE = "application/raw";

async function paginationService(props) {
  const url = props.next;
  var response = await axios.get(url, {
    headers: {
      "client-assertion": getClientSing(),
    },
  });
  if (response.headers["content-type"].indexOf(CRYPTO_CONTENT_TYPE) !== -1) {
    response.data = decrypt({
      payload: response.headers["x-response-payload"],
      data: response.data,
    });
  }
  return response;
}

export { paginationService };
