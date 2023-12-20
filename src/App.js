import { QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from 'react-query/devtools'
import { queryClient } from "./context/AplicationContext";
import Home from "./screens/Home";
import Index from "./screens/Index";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import "./styles/index.css";


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />

        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
};

export default App;
