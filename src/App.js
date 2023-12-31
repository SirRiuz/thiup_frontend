import { QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from 'react-query/devtools'
import { queryClient } from "./context/AplicationContext";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Home from "./screens/Home";
import Index from "./screens/Index";
import Thread from './screens/Thread'
import Search from "./screens/Search";
import Tags from "./screens/Tags";
import "./styles/index.css";


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<Index />} />
          <Route path="/home/" element={<Home />} />
          <Route path="/t/:thread" element={<Thread />} />
          <Route path="/search/:query/" element={<Search />} />
          <Route path="/explore/tags/:tag/" element={<Tags />} />
          
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
};

export default App;
