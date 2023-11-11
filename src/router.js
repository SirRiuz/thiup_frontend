import { createBrowserRouter } from "react-router-dom"
import { threadService } from "./services/thread"
import Home from './screens/Home'
import Thread from './screens/Thread'


const router = createBrowserRouter([
  {
    path: "/",
    element: <Home/>,
    loader: (async ({ params }) => {
      console.log("snapshot")
      var snapshot = localStorage.getItem("snapshot")
      snapshot = JSON.parse(snapshot)
      if (snapshot !== null) {
        console.log("Si hay snapshow")
        return new Promise((resolve, reject) => {
          resolve({
            data: snapshot.data,
            location: snapshot.location})
          localStorage.removeItem("snapshot")
        })
      }

      return threadService({})
    })
  }, {
    path: "/t/:thread",
    element: <Thread/>,
    errorElement: (<h1>Not found</h1>),
    loader:(async ({ params }) => {
      return threadService({
        id: params.thread})
    })
  }
])

export default router
  