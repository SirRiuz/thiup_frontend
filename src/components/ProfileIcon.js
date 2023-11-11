
const ProfileIcon = props => {
  return (
    <div
      style={{
        width: props.iconSize !== undefined ? props.iconSize : 23,
        height: props.iconSize !== undefined ? props.iconSize : 23,
        borderRadius: "100%",
        backgroundImage: 'url("https://avatars.githubusercontent.com/u/122377845?s=400&v=4")',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    />
  )
}


export default ProfileIcon

