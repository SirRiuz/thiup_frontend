

/**
 * Se encarga de formatear el array al formato
 * necesario para el contenido
 * 
 * @param {*} data 
 * @returns array
 */
const parseArray = (data) => {
  let subconjuntos = [];
  for (let i = 0; i < data.length; i += 2) {
    subconjuntos.push(data.slice(i, i + 2));
  }
  return subconjuntos
}


const isSingle = (data) => {
  return data.length === 1
}


export {parseArray, isSingle}
