import { createBrowserRouter } from "react-router-dom"
import { threadSearchService, threadService } from "./services/thread"
import { queryClient } from "./context/AplicationContext"
import Home from './screens/Home'
import Thread from './screens/Thread'
import Search from "./screens/Search"
import Index from "./screens/Index";


const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  }, {
    path: "/home",
    element: <Home />,
    loader: (async ({ params }) => {
      return queryClient.fetchQuery(["threads"], () =>
        threadService({}).then((res) => res.data))
    })
  }, {
    path: "/t/:thread",
    element: <Thread />,
    errorElement: (<h1>Sorry, this page isn't available.</h1>),
    loader: (async ({ params }) => {
      return queryClient.fetchQuery([params.thread], () =>
        threadService({ id: params.thread }).then((res) => res.data))
    })
  }, {
    path: "/search/:query/",
    element: <Search />,
    errorElement: (<h1>Sorry, this page isn't available.</h1>),
    loader: (async ({ params }) => {
      return queryClient.fetchQuery([params.query], () =>
        threadSearchService({ query: params.query }).then((res) => res.data))
    })
  }, {
    path: "*",
    element: <h1>Sorry, this page isn't available.</h1>
  }
])

export default router
