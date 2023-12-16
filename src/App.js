import { QueryClientProvider } from "react-query";
import { RouterProvider } from "react-router-dom";
import { ReactQueryDevtools } from 'react-query/devtools'
import { queryClient } from "./context/AplicationContext";
import router from "./router";
import "./styles/index.css";


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
};

export default App;
