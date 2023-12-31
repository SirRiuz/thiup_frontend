import { useState } from "react"
import { Grid, useMediaQuery, useTheme } from "@mui/material"
import SvgHome from "../assets/svg/SvgHome"
import Button from "./Button"
import SvgThread from "../assets/svg/SvgThread"
import SvgDreaft from "../assets/svg/SvgDraft"


const MenuPages = () => {
  const [page, setPage] = useState(null)
  const SECTIONS = [
    {
      icon: <SvgHome />,
      name: "Home"
    }
  ]

  return (
    <Grid container flexDirection={"column"}>
      {SECTIONS.map((x, k) => (
        <Grid
          container
          key={k}
          height={32}
          paddingLeft={"20px"}
          paddingRight={"20px"}
          direction={"row"}
          gap={"10px"}
          alignContent={"center"}
          alignItems={"center"}
          onClick={() => setPage(() => k)}
          style={{
            cursor: "pointer",
            background: page === k ?
              "rgb(231, 231, 233)" : "#F4F5F5",
          }}
          justifyContent={{
            lg: "start",
            md: "center",
            sm: "center",
            xs: "center"
          }}
        >
          <Grid
            item
            style={{
              display: "flex",
              alignContent: "center",
              alignItems: "center"
            }}
          >
            {x.icon}
          </Grid>
          <Grid
            item
            style={{
              color: "#27282b",
              fontWeight: 600,
              fontSize: 14
            }}
            display={{
              lg: "block",
              md: "none",
              sm: "none",
              xs: "none"
            }}
          >
            {x.name}
          </Grid>
        </Grid>
      ))}
    </Grid>
  )
}


const NavMenu = () => {
  // const theme = useTheme();
  // const isLG = useMediaQuery(theme.breakpoints.up("lg"));
  // const isSM = useMediaQuery(theme.breakpoints.up("sm"));
  // const isXS = useMediaQuery(theme.breakpoints.up("xs"));
  // const isMD = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Grid
      container
      gap={"20px"}
      style={{
        marginTop:50
      }}
    >

      {/* <Grid container style={{ background: "pink" }}>
        <div>x</div>
        <span>Thiup</span>
      </Grid>

      <Grid
        container
      >
        <Grid item width={101} height={33}>
          <Button
            isFocus={true}
            placeholder={isLG ? "Compose" : " "}
            onClick={() => {
              alert("Hello")
            }}
          />
        </Grid>
      </Grid> */}

      <MenuPages />
    </Grid>
  )
}


export default NavMenu
