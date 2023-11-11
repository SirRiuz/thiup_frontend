import React from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
import "../styles/slider.css"


const MediaSwiper = props => {
  return props.children.length >0 && (
    <div
      style={{
        border:'solid 1.5px #cfcccc',
        borderRadius: 3,
      }}
    >
      <Swiper className="mySwiper">
        {props.children.map((children, k) => (
          <SwiperSlide key={k}>
            {children}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}

export default MediaSwiper
