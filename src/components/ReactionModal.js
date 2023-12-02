import Modal from '@mui/material/Modal';
import Masonry from '@mui/lab/Masonry';
import Grid from "@mui/material/Grid"
import ReactionIcon from './ReactionIcon';
import useReaction from '../hooks/useReaction';


const ReactionModal = props => {
  const { reactions } = useReaction({ list: props.show })
  return props.show && reactions && (
    <Modal
      open
      onClose={props.onClose}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(5px)'
      }}
    >
      <Grid
        item
        md={3}
        xs={10}
        style={{
          background: 'white',
          borderRadius: 11,
          outline: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignContent: 'center',
          alignItems: 'center',
          paddingTop: 20,
          paddingBottom: 20,
          paddingLeft: 10,
          paddingRight: 10
        }}
      >
        <Masonry
          spacing={2}
          style={{
            display: 'flex',
            alignContent: 'center'
          }}
        >
          {reactions.map((reaction, index) => (
            <ReactionIcon
              key={index}
              onClick={() => props.onSelect(reaction)}
              iconUrl={`${process.env.REACT_APP_API_URL}${reaction.icon}`}
              style={{
                padding: 0,
                gap: 0,
                width: 50,
                height: 50,
                iconStyle: {
                  width: 35,
                  height: 35
                }
              }}
            />
          ))}
        </Masonry>
      </Grid>
    </Modal>
  )
}

export default ReactionModal
