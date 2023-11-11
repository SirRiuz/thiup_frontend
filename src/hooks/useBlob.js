import { useEffect, useState } from "react"
import blobService from "../services/blob"


const useBlob = props => {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    blobService({url: props.url})
      .then(res => {
        const blob = new Blob([res.data], { type: res.headers['content-type'] });
        const file = new File([blob], 'file', { type: blob.type })
        console.log(file)
      })      
  }, [props.url])

  return {url}
}

export default useBlob
