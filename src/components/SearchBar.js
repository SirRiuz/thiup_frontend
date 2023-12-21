import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import SvgSearch from "../assets/svg/SvgSearch"


const ENTER_KEY = "enter"

const SearchBar = props => {
  const navigate = useNavigate()
  const { query } = useParams();
  const [text, setText] = useState(query?.length > 0 ? query : "")

  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <SvgSearch />
      <input
        value={text}
        type="text"
        placeholder={props.placeholder ? props.placeholder : "Search"}
        onChange={(e) => setText(e.target.value)}
        style={{
          flex: 1,
          outline: 'none',
          border: 'none',
          background: 'transparent'
        }}
        onKeyDown={(e) => {
          if ((e.key.toLowerCase() === ENTER_KEY) && (text !== query))
            navigate(`/search/${text}/`)
        }}
      />
    </div>
  )
}

export default SearchBar
