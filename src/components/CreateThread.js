import Modal from '@mui/material/Modal';
import Grid from "@mui/material/Grid"
import CommentBox from './Comment';


const CreateThread = props => {
  return (
    <Modal
      open
      style={{
        //background: '#6b4afc',
        display: 'flex',
        justifyContent: 'center',
        alignContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(7px)'
      }}
    >
      <Grid
        item
        lg={4}
        md={6}
        sm={6}
        xs={11}
        style={{
          background: 'white',
          borderRadius: 11,
          outline: 'none',
          paddingTop: 15,
          paddingBottom: 15,
          //display: 'flex',
          // justifyContent: 'center',
          // alignContent: 'center',
          // alignItems: 'center',
          // paddingTop: 20,
          // paddingBottom: 20,
          // paddingLeft: 10,
          // paddingRight: 10
        }}
      >
        <CommentBox
          focus={true}
          iconSize={43}
          btnPlaceholder={'Post'}
          placeholder={'Start a thread'}
        />
      </Grid>
    </Modal>
  )
}

export default CreateThread
