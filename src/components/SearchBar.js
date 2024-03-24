import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import HeadBar from "./HeadBar"


const ENTER_KEY = "enter"

export default function SearchBar(props) {
  const navigate = useNavigate()
  const { query } = useParams()
  const [text, setText] = useState(query?.length > 0 ? query : "")

  return (
    <HeadBar
      styles={{
        display: 'flex',
        alignContent: 'center',
        alignItems: 'center',
        flex: 1,
        gap: 15,
        position: 'relative',
        marginBottom: 5,
        background: 'red'
      }}
    >
      <input
        value={text}
        type="text"
        onChange={(e) => {
          setText(e.target.value.replace("#", "").toLowerCase())
        }}
        onKeyDown={(e) => {
          if ((e.key.toLowerCase() === ENTER_KEY) && text.length >= 1) {
            navigate(`/search/${text}/`)
          }
        }}
      />
    </HeadBar>
  )
}
