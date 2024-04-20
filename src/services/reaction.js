import { decrypt, getClientSing } from "./cripto";
import axios from "axios";

const CRYPTO_CONTENT_TYPE = "application/raw";

async function getReactionService() {
  var url = `${process.env.REACT_APP_API_URL}/reactions/`;
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

async function createReactionService(props) {
  var url = (props.id = `${process.env.REACT_APP_API_URL}/reactions/`);
  var response = await axios.post(
    url,
    {
      reaction: props.reaction,
      thread: props.thread,
    },
    {
      "Content-Type": "application/json",
      headers: {
        "client-assertion": getClientSing(),
      },
    }
  );

  if (response.headers["content-type"].indexOf(CRYPTO_CONTENT_TYPE) !== -1) {
    response.data = decrypt({
      payload: response.headers["x-response-payload"],
      data: response.data,
    });
  }
  return response;
}

export { createReactionService, getReactionService };
