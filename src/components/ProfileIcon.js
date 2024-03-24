
export default function ProfileIcon(props) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: "100%",
          height: "100%",
          justifyContent: "end",
          alignItems: "end",
          marginLeft: 3,
          marginTop: 5,
        }}
      >
        {props.flag}
      </div>
      <div
        style={{
          width: props.iconSize !== undefined ? props.iconSize : 23,
          height: props.iconSize !== undefined ? props.iconSize : 23,
          borderRadius: 8,
          background: 'rgb(229, 229, 229)',
          backgroundImage: 'url("https://d111it5gwc8pcx.cloudfront.net/6d95e95d-a17a-4ccd-b5c8-ccd546064657/34508546007_image168.png?Expires=1794937150&Key-Pair-Id=APKAI4AXC6V7UKQE2IPQ&Signature=V67Zri4CjLuHevJ4JowiCnizcfXmqHafhW490PLUcnEhiySaSlOkxP~0JCaiJwkG5CJ59JrUvjVSl-oxsheSt4LDmFv9c3fkLD0hFTfSAwHX3NpkIuzhiBbZZb9X7d0Odw-yUDlAkz8HIXE0YytOCIp70LIupw11sX7GNT5wSbyAov57myzvSUSHKNKI7IyMGldIs68bFVhvNp-S-jeTN8MrC5ZpPR242YwerhW0nC2Iq0aKb6Wsy6B8RrOk64alCq3TG0LRqZQoaF~XWR-gLzeFBZLf~m8GZjWF7a~VJ~wvfcJSJg3qpnmslj3fgTgRuVcZwSykhxnb0kXu9FedU7mshvlNRPn6EB74XRL6f6JaltYH2JV67OMBophf9OTDPjvZ7hyHl9tpGGk5C4rGj4ee4vyBmCREEsRmJYST81CaG38owJ1Orxa~OWclWTE9nPUb9gnVRyv7pgKVvKQOaGxZe-Tqs7fHKkKCEfxK0ppy-QKWxiAotFPdTQMk9G0qnJy2skV~O-STfj-AUv-4842UaXZf61DlCJDPUIC77cbBUVOW14GN80HK5xiUc4GnrPI7HTlTrxegCJaWDhf9Uz42ziAGxyyJem1rRQUs8XViHB2r6NCWMpsuhA8Ma9f1sW0TSRpcers7K3mXdyrse6bj5V8ooJQ3SPTUjeIgQmM_")',
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </div>
  )
}
