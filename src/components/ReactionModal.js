import { useQuery } from 'react-query'
import { getReactionService } from '../services/reaction'
import Modal from '@mui/material/Modal'
import Masonry from '@mui/lab/Masonry'
import Grid from "@mui/material/Grid"
import ReactionIcon from './ReactionIcon'


export default function ReactionModal(props) {
  const { data, isLoading, isError } = useQuery("reactions",
    () => getReactionService().then((res) => res.data))

  return (props.show && !isLoading && !isError) && (
    <Modal
      open={props.show}
      onClose={props.onClose}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(6px)'
      }}
    >
      <Grid
        item
        lg={3}
        md={6}
        sm={6}
        xs={11}
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
          {data.map((reaction, index) => (
            <ReactionIcon
              name={reaction.name}
              key={index}
              onClick={() => props.onSelect(reaction)}
              url={`${process.env.REACT_APP_API_URL}${reaction.icon}`}
              style={{
                border:
                  props.last_reaction === reaction.id
                    ? "solid .0625rem rgb(107, 74, 252)"
                    : 'solid 0px white',

                background:
                  props.last_reaction === reaction.id
                    ? "rgba(107, 74, 252, .05)"
                    : "white",

                padding: 0,
                gap: 0,
                width: 50,
                height: 50,
                iconStyle: {
                  width: 35,
                  height: 35,
                }
              }}
            />
          ))}
        </Masonry>
      </Grid>
    </Modal>
  )
}
