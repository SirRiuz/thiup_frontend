import ErrorMessage from "../components/ErrorMessage"

export default function NotFound() {
  return (
    <ErrorMessage
      title={(<span>Sorry, this page isn't available.</span>)}
      description={(
        <span style={{ fontSize: 15 }}>
          The link you followed may be broken or does not exist.
        </span>
      )}
    />
  )
}
