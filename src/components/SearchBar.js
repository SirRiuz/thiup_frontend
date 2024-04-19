import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../styles/components/SearchBar.module.css";
import SvgSearch from "../assets/svg/SvgSearch";
import SvgCloseText from "../assets/svg/SvgCloseText";

const ENTER_KEY = "enter";

export default function SearchBar(props) {
  const navigate = useNavigate();
  const { query } = useParams();
  const [text, setText] = useState(query?.length > 0 ? query : "");
  const search = useRef(null);

  return (
    <div
      onClick={() => {
        search.current.focus();
      }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignContent: "center",
        alignItems: "center",
        background: "white",
        height: 55,
        borderRadius: "max(0px, min(8px, -999900% + 1.05589e+07px)) / 8px",
        paddingLeft: 16,
        paddingRight: 16,
        gap: 10,
        boxShadow: "rgba(0, 0, 0, .1) 0px 1px 2px 0px",
        ...props.styles,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignContent: "center",
          alignItems: "center",
        }}
      >
        <SvgSearch />
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          justifyContent: "center",
          alignContent: "center",
          alignItems: "center",
          background: "red",
        }}
      >
        <input
          ref={search}
          className={styles.searchInput}
          placeholder="Search"
          value={text}
          type="text"
          onChange={(e) =>
            setText(e.target.value.replace("#", "").toLowerCase())
          }
          onKeyDown={(e) => {
            if (e.key.toLowerCase() === ENTER_KEY && text.length >= 1) {
              navigate(`/search/${text}/`);
            }
          }}
        />
      </div>
      {text.length > 0 && (
        <div
          className={styles.clearSearch}
          onClick={() => {
            setText(() => "");
          }}
        >
          <SvgCloseText />
        </div>
      )}
    </div>
  );
}
