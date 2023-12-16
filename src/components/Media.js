const Media = (props) => {
  const IS_VIDEO = props.url.indexOf(".mp4") > 0;
  const URL = "http://localhost:8000" + props.url;

  var content = (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: "100%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundImage: `url(${URL})`,
        borderRadius: 3,
      }}
    />
  );

  if (IS_VIDEO) {
    content = <h1>VIDEO</h1>;
  }

  return content;
};

export default Media;
