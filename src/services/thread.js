import axios from 'axios';


const commentService = props => {
  var url = props.id =`${process.env.REACT_APP_API_URL}/threads/`
  const data = ({
    "sub": props.thread,
    "media": props.media,
    "text": props.text})

  return axios.post(url, data, {
    'Content-Type': 'application/json'})
}

const threadService = props => {
  var url = props.id !== undefined ?
    `${process.env.REACT_APP_API_URL}/threads/${props.id}/responses/`:
    `${process.env.REACT_APP_API_URL}/threads/`
  return axios.get(url, {})
}


export {threadService, commentService}
