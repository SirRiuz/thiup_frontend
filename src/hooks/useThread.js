import { useEffect, useRef, useState } from "react";
import { threadService } from "../services/thread";

const useThread = (props) => {
  const [data, setData] = useState([]);
  const [isLoad, setLoad] = useState(false);
  const cacheRef = useRef({});

  const getResponses = (id, callback) => {
    threadService({ id: id }).then((res) => {
      callback(res.data.responses);
    });
  };

  useEffect(() => {
    if (data.length === 0 && props.id !== null) {
      if (!cacheRef.current.promise) {
        cacheRef.current.promise = threadService({
          id: props.id,
        })
          .then((res) => {
            setData(res.data);
          })
          .finally(() => {
            setLoad(false);
            cacheRef.current.promise = null;
          });
      }
    }
  }, [props.id]);

  return { data, getResponses, isLoad };
};

export default useThread;
