import { QueryClientProvider } from "react-query";
import { queryClient } from "./context/AplicationContext";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactQueryDevtools } from "react-query/devtools";
import Home from "./screens/Home";
import Index from "./screens/Index";
import Thread from "./screens/Thread";
import Search from "./screens/Search";
import Tags from "./screens/Tags";
import NotFound from "./screens/NotFound";
import SplashScreen from "./components/SplashSreen";
import "./styles/index.css";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setShowSplash(() => false);
    }, 1500);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {showSplash && <SplashScreen />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home/" element={<Home />} />
          <Route path="/t/:thread/" element={<Thread />} />
          <Route path="/search/:query/" element={<Search />} />
          <Route path="/explore/tags/:tag/" element={<Tags />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
