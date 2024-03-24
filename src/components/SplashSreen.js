import logo from '../assets/images/app.png'


export default function SplashScreen() {
  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        justifyContent: 'center',
        alignContent: 'center',
        alignItems: 'center',
        background: 'white'
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          backgroundImage: `url(${logo})`,
          backgroundRepeat:'no-repeat',
          backgroundPosition:'center',
          backgroundSize:'cover'
        }}
      />
    </div>
  )
}

