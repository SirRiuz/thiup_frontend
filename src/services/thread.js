import { decrypt, getClientSing } from "./cripto";
import axios from "axios";

const CRYPTO_CONTENT_TYPE = "application/raw";

async function threadSearchService(props) {
  const TYPE = props?.type === "tag" ? "tag" : "q";
  var url = `${process.env.REACT_APP_API_URL}/threads/?${TYPE}=${props?.query}`;
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

async function commentService(props) {
  var url = (props.id = `${process.env.REACT_APP_API_URL}/threads/`);
  var response = await axios.post(
    url,
    {
      sub: props.thread,
      media: props.media,
      text: props.text,
      content: props.content,
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

async function threadService(props) {
  var url =
    props.id !== undefined
      ? `${process.env.REACT_APP_API_URL}/threads/${props.id}/responses/`
      : `${process.env.REACT_APP_API_URL}/threads/`;

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

export { threadService, commentService, threadSearchService };
