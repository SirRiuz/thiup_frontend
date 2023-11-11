import { paginationService } from "../services/pagination"

const usePagination = props => {
  const paginate = (next, callback) => {
    if(next !== null) {
      paginationService({next: next})
        .then(res => callback(res.data))
    }
  }

  return { paginate }
}

export default usePagination
