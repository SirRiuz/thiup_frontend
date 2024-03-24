import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


const Index = () => {
  const navigate = useNavigate();
  useEffect(() => (navigate("/home/")), []);
}

export default Index
