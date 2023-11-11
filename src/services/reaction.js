import axios from 'axios';


const getReactionService = props => {
  var url = `${process.env.REACT_APP_API_URL}/reactions/`
  return axios.get(url, {
    'Content-Type': 'application/json'})
}

const createReactionService = props => {
  var url = props.id =`${process.env.REACT_APP_API_URL}/reactions/`
  const data = ({
    "reaction": props.reaction,
    "thread": props.thread})

  return axios.post(url, data, {
    'Content-Type': 'application/json'})
}

export {createReactionService, getReactionService}
