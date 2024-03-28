import { useRef, useState } from "react"
import SvgFiles from "../assets/svg/SvgFiles"

const FILE_MAX_SIZE = 20 * 1024 * 1024

export default function FilePicker(props) {
  const [files, setFile] = useState([])
  const hiddenFileInput = useRef(null)
  const onDelete = (k) => setFile(
    () => files.filter((el) => el !== files[k]))

  const onSetFile = (e) => {
    if (e.target.files.length >= 1) {
      const file = e.target.files[0]
      encodeFile(file, (data) => {
        const object = {
          type: file.type,
          name: file.name,
          data: data,
        }
        setFile((x) => x.concat(object))
        if (props.onChange) props.onChange(files.concat(object))
      })
    }
  }

  const encodeFile = (file, callback) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      const fileContent = event.target.result
      const base64Content = btoa(fileContent)
      if (file.size > FILE_MAX_SIZE) {
        alert("EL archivo es demaciado grande!! sobrepasa el limite de 20 MB")
        return
      }
      callback(base64Content)
    }
    reader.readAsBinaryString(file)
  }

  const handleClick = event => {
    hiddenFileInput.current.click();    // ADDED
  };

  return (
    <div>
      <div>
        <div
          onClick={handleClick}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignContent: 'center',
            alignItems: 'center',
            cursor:files.length >= 3 ? 'default':'pointer'
          }}
        >
          <SvgFiles />
        </div>
        <input
          ref={hiddenFileInput}
          disabled={files.length >= 3}
          onChange={onSetFile}
          type="file"
          accept="jpg, .jpeg, .png, .mp4"
          style={{
            display: "none"
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          background: 'red'
        }}
      >
        {files.map((x, k) => (
          <span onClick={() => onDelete(k)} key={k}>
            {x.name}
          </span>
        ))}
      </div>
    </div>
  )
}
