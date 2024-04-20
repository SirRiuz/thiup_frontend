import { Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SvgBack from "../assets/svg/SvgBack";
import styles from "../styles/components/GoBack.module.css";

export default function GoBack() {
  const navigate = useNavigate();
  return (
    <Tooltip title="Back">
      <div className={styles.button} onClick={() => navigate(-1)}>
        <SvgBack />
      </div>
    </Tooltip>
  );
}
