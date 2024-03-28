import { useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import styles from "../styles/components/SearchBar.module.css"
import SvgSearch from "../assets/svg/SvgSearch"
import SvgCloseText from "../assets/svg/SvgCloseText"


const ENTER_KEY = "enter"


export default function SearchBar(props) {
  const navigate = useNavigate()
  const { query } = useParams()
  const [text, setText] = useState(query?.length > 0 ? query : "")
  const [focus, setFocus] = useState(false)
  const search = useRef(null)

  return (
    <div
      onClick={() => {
        setFocus(() => true)
        search.current.focus()
      }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignContent: 'center',
        alignItems: 'center',
        background: "#FCFCFD",
        height: 55,
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 16,
        gap: 10,
        border: "solid 1px rgba(235, 235, 235, 1.00)",
        boxShadow: focus ? "0px 12px 24px rgba(235, 235, 235, .65)": "0px 0px 0px red",
        ...props.styles,
      }}
    >
      <div
        style={{
          display:'flex',
          justifyContent:'center',
          alignContent:'center',
          alignItems:'center'
        }}
      >
        <SvgSearch/>
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          justifyContent:'center',
          alignContent:'center',
          alignItems:'center',
          background:'red'
        }}
      >
        <input
          ref={search}
          className={styles.searchInput}
          placeholder="Search"
          value={text}
          type="text"
          onBlur={() => setFocus(() => false)}
          onChange={(e) => setText(e.target.value.replace("#", "").toLowerCase())}
          onKeyDown={(e) => {
            if ((e.key.toLowerCase() === ENTER_KEY) && text.length >= 1) {
              navigate(`/search/${text}/`)
            }
          }}
        />
      </div>
      {(text.length > 0) && (
        <div className={styles.clearSearch} onClick={(e) => {
          setText(() => "")}}>
          <SvgCloseText/>
        </div>
      )}
    </div>
  )
}
