import { queryClient } from "../context/AplicationContext"


const checkStorage = (handlerError) => {
  try {
    const { data } = queryClient.getQueryState('threads')
  } catch(e) {
    handlerError()
  }
}

export default checkStorage

