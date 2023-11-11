import { commentService } from "../services/thread"


const useComment = props => {
  const send = (data, callback) => {
    commentService({
      thread: data.thread,
      media: data.files.map((x, k) => x),
      text: data.text})
      .then(res => {
        callback(res)
      })
      .catch(err => {})
  } 
  return {send}
}

export default useComment
