import { useEffect, useState } from "react"
import {
  createReactionService,
  getReactionService
} from "../services/reaction"


const useReaction = props => {
  const [reactions, setReactions] = useState([])

  useEffect(() => {
    if(props.list)
      getReactionService()
        .then(res => setReactions(() => res.data))
  }, [props.list])

  const react = e => {
    createReactionService({
      reaction: e.reaction,
      thread: e.thread
    })
  }


  return { react, reactions }

}

export default useReaction