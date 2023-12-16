import { useState } from "react";
import ".././styles/filePicker.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage } from "@fortawesome/free-solid-svg-icons";

const FILE_MAX_SIZE = 20 * 1024 * 1024;

const FilePicker = (props) => {
  const [files, setFile] = useState([]);
  const onDelete = (k) => setFile(() => files.filter((el) => el !== files[k]));

  const onSetFile = (e) => {
    const file = e.target.files[0];
    encodeFile(file, (data) => {
      const object = {
        type: file.type,
        name: file.name,
        data: data,
      };

      setFile((x) => x.concat(object));
      if (props.onChange !== undefined) props.onChange(files.concat(object));
    });
  };

  const encodeFile = (file, callback) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const fileContent = event.target.result;
      const base64Content = btoa(fileContent);
      if (!(file.size > FILE_MAX_SIZE)) {
        callback(base64Content);
      } else {
        alert("EL archivo es demaciado grande!! sobrepasa el limite de 20 MB");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <div className="custom-input" style={{ ...props.style }}>
        <FontAwesomeIcon icon={faImage} color="green" width={14} height={14} />
        <input
          disabled={files.length >= 3}
          onChange={onSetFile}
          type="file"
          accept="jpg, .jpeg, .png, .mp4"
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
        }}
      >
        {files.map((x, k) => (
          <span onClick={() => onDelete(k)} key={k}>
            {x.name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default FilePicker;
