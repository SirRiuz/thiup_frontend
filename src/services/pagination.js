import axios from 'axios';


const paginationService = props => {
    const url = props.next
    return axios.get(url, {})
}

export { paginationService }
