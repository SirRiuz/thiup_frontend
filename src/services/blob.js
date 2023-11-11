import axios from "axios"


const blobService = props => {
    return axios.get(props.url, {})
}

export default blobService

