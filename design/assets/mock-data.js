/* =========================================================================
   THIUP MOCKUP — DATOS DE EJEMPLO
   100% inventados. Nada aquí sale de la red ni se guarda en ningún lado —
   es solo para poder ver las pantallas llenas y jugar con el diseño.
   ========================================================================= */

function mask(id, online) {
  return { id, isOnline: !!online };
}

const MockData = {
  currentUser: mask("4f3a91", true),

  // ---- Experimentos de "vida" del Home (sandbox — no existen en la app
  // real todavía, ver design/CLAUDE.md § Experimentos). ----

  feed: [
    {
      uid: "poll1",
      type: "poll",
      mask: mask("c9a221", true),
      time: "3 h",
      text: "¿Qué te ayuda más cuando la ansiedad no te deja dormir?",
      poll: {
        totalVotes: 378,
        closesLabel: "Cierra en 2 días",
        options: [
          { id: "a", label: "Respirar o meditar", votes: 142 },
          { id: "b", label: "Hablar con alguien", votes: 98 },
          { id: "c", label: "Salir a caminar", votes: 61 },
          { id: "d", label: "Nada funciona todavía", votes: 77 },
        ],
      },
      repliesCount: 18,
      reactions: [{ name: "love", count: 12 }, { name: "wow", count: 3 }],
      media: [],
    },
    {
      uid: "p1",
      mask: mask("6be4a5", true),
      time: "2 h",
      text: "Llevo tres meses sin dormir bien. El médico dice que es ansiedad, pero nunca pensé que se sintiera así — como si el cuerpo no se apagara nunca. ¿Alguien más por aquí?",
      isMine: false,
      isTrending: true,
      repliesCount: 14,
      reactions: [
        { name: "love", count: 22 },
        { name: "sad", count: 9 },
        { name: "applause", count: 3 },
      ],
      media: [],
      topReply: {
        uid: "p1r1",
        mask: mask("6be4a5", true),
        isOp: true,
        time: "1 h",
        text: "Actualización: hablé con un terapeuta por primera vez hoy. Dar el primer paso fue lo más difícil.",
        repliesCount: 3,
        reactions: [{ name: "applause", count: 11 }],
        media: [],
      },
    },
    {
      uid: "p2",
      mask: mask("0c88de"),
      time: "4 h",
      text: "Renuncié hoy. Diez años en la misma empresa y nunca me sentí tan ligero. Da miedo, pero también se siente correcto.",
      isMine: true,
      repliesCount: 6,
      reactions: [
        { name: "love", count: 8 },
        { name: "wow", count: 4 },
      ],
      media: [{ type: "image", illo: "escritorio" }],
    },
    {
      uid: "p3",
      mask: mask("f3a921", true),
      time: "6 h",
      isSnap: true,        // hilo temporal: vive 12 h (snapTotalMin) y le quedan 6 (snapLeftMin) — lo usa el indicador de las v2
      snapLeftMin: 360,
      snapTotalMin: 720,
      text: "Esto se autodestruye en unas horas: necesitaba decir en voz alta que extraño a alguien que ya no está, y no tengo con quién más hablarlo.",
      repliesCount: 2,
      reactions: [{ name: "sad", count: 5 }],
      media: [],
    },
    {
      uid: "p4",
      mask: mask("9d1c73"),
      time: "8 h",
      text: "#privacidad ¿Alguien sabe qué tan seguro es compartir diagnósticos médicos en apps de salud? Leí que algunas venden los datos a aseguradoras.",
      repliesCount: 9,
      reactions: [{ name: "wow", count: 6 }, { name: "angry", count: 2 }],
      media: [],
    },
    {
      uid: "p5",
      mask: mask("2e7fb0", true),
      time: "1 d",
      text: "Primera vez que subo fotos del viaje que hice solo. Fue la primera decisión 100% mía en mucho tiempo.",
      repliesCount: 11,
      reactions: [
        { name: "love", count: 31 },
        { name: "applause", count: 14 },
        { name: "wow", count: 5 },
      ],
      // Carrusel de "muchas" fotos (4) — demuestra que el carrusel es un
      // scroll sin tope, no un grid de máximo 4 como antes.
      media: [
        { type: "image", illo: "montana" },
        { type: "image", illo: "carretera" },
        { type: "image", illo: "ciudad" },
        { type: "image", illo: "playa" },
      ],
    },
    {
      uid: "p6",
      mask: mask("c41a88"),
      time: "1 d",
      text: "A veces siento que soy la única persona de mi familia que piensa distinto sobre todo — política, religión, cómo vivir. ¿Se vuelve menos solitario con el tiempo?",
      repliesCount: 23,
      reactions: [{ name: "love", count: 40 }, { name: "sad", count: 7 }],
      media: [],
    },
    {
      uid: "p7",
      mask: mask("5a92fc", true),
      time: "9 h",
      text: "Grabé esto en voz alta porque escribirlo ya no alcanzaba. Es la primera vez que hablo del tema en lugar de solo pensarlo.",
      repliesCount: 7,
      reactions: [{ name: "love", count: 16 }, { name: "applause", count: 4 }],
      // Video (1 item) — solo poster + insignias decorativas, sin
      // reproducción real (ver CLAUDE.md § Alcance).
      media: [{ type: "video", illo: "lluvia" }],
    },
    {
      uid: "p8",
      mask: mask("7cd410"),
      time: "10 h",
      text: "Hoy me animé a mostrar mis cicatrices sin manga larga por primera vez. Marco la foto como spoiler — todavía no estoy list@ para que la vea cualquiera sin avisar.",
      repliesCount: 13,
      reactions: [{ name: "love", count: 29 }, { name: "applause", count: 8 }],
      // Spoiler (elección del usuario, no automático) — ver `isNsfw` en
      // mp1 para el otro gatillo ("Contenido sensible").
      media: [{ type: "image", illo: "abstracta", isSpoiler: true }],
    },
  ],

  // Pool para el scroll infinito (experimento de "vida" — ver CLAUDE.md):
  // temas variados a propósito (duelo, dinero, crianza, cuerpo, mudanza,
  // adicción, amistad, identidad, salud crónica, bloqueo creativo...) para
  // que cargar más NUNCA se sienta repetitivo. home.html recorre este
  // arreglo en bucle (con sufijo de vuelta en el uid) para simular carga
  // infinita real sin necesitar cientos de posts escritos a mano.
  // ---- Ejemplos de REPOST para home-v2.html (sandbox; la feature no existe
  // en la app real). Dos formas: repost simple (`repostedBy` = quién lo
  // compartió; el hilo se ve entero) y cita (`quote` = el hilo citado,
  // incrustado bajo el comentario de quien cita). `reposts` = contador. ----
  reposts: [
    // ===== Repost simple (el hilo se ve entero) =====
    { // solo texto
      uid: "rp1", repostedBy: mask("2e7fb0", true), mask: mask("a41d0c"), time: "5 h",
      text: "Le conté a mi hermana lo que llevaba dos años callando. No se rompió nada. Solo me abrazó y dijo que ya lo sospechaba.",
      repliesCount: 23, reposts: 12,
      reactions: [{ name: "love", count: 48 }, { name: "applause", count: 9 }],
      media: [],
    },
    { // una imagen
      uid: "rp2", repostedBy: mask("9d1c73"), mask: mask("7c2be9", true), time: "7 h",
      text: "Primer día sin ansiolíticos en tres años. Salí a caminar para celebrarlo y me encontré esto.",
      repliesCount: 11, reposts: 5,
      reactions: [{ name: "applause", count: 31 }, { name: "love", count: 14 }],
      media: [{ type: "image", illo: "montana", ratio: 1.5 }],
    },
    { // varias imágenes
      uid: "rp3", repostedBy: mask("f3a921"), mask: mask("58e1d4"), time: "10 h",
      text: "Un año viviendo sola. Estos son los rincones que me fueron haciendo sentir en casa.",
      repliesCount: 8, reposts: 3,
      reactions: [{ name: "love", count: 26 }],
      media: [{ type: "image", illo: "escritorio" }, { type: "image", illo: "cafe" }, { type: "image", illo: "ciudad" }, { type: "image", illo: "bosque" }],
    },
    { // un video
      uid: "rp4", repostedBy: mask("c9a221", true), mask: mask("e6a0b3"), time: "12 h",
      text: "Me grabé diciendo en voz alta lo que nunca le dije a mi papá. No sé si lo vea algún día, pero ya no lo cargo yo.",
      repliesCount: 19, reposts: 9,
      reactions: [{ name: "sad", count: 22 }, { name: "love", count: 40 }],
      media: [{ type: "video", illo: "lluvia", ratio: 1.5, duration: 96 }],
    },
    { // mezclado: fotos + video
      uid: "rp5", repostedBy: mask("b71e04", true), mask: mask("1f9c6d", true), time: "1 d",
      text: "Volví al pueblo después de ocho años. Fotos del camino y un video de la plaza, que está igual.",
      repliesCount: 6, reposts: 2,
      reactions: [{ name: "wow", count: 4 }, { name: "love", count: 12 }],
      media: [{ type: "image", illo: "carretera" }, { type: "video", illo: "playa", duration: 34 }, { type: "image", illo: "bosque" }],
    },

    // ===== Cita (tu comentario + el hilo original incrustado) =====
    { // cita de un hilo de solo texto
      uid: "q1", mask: mask("b71e04", true), time: "1 h",
      text: "Esto. Llevaba meses creyendo que era el único al que le pasaba.",
      repliesCount: 4, reposts: 1,
      reactions: [{ name: "love", count: 7 }],
      media: [],
      quote: {
        uid: "q1o", mask: mask("d3f07a"), time: "1 d",
        text: "Nadie te avisa de que mudarte solo también es aprender a escuchar el silencio de tu propia casa. Los primeros meses dejaba la radio prendida todo el día.",
        media: [],
      },
    },
    { // cita de un hilo con una imagen
      uid: "q2", mask: mask("9d1c73"), time: "2 h",
      text: "Guardo esta foto para los días malos.",
      repliesCount: 2,
      reactions: [{ name: "love", count: 5 }],
      media: [],
      quote: {
        uid: "q2o", mask: mask("7c2be9", true), time: "7 h",
        text: "Primer día sin ansiolíticos en tres años. Salí a caminar para celebrarlo y me encontré esto.",
        media: [{ type: "image", illo: "montana" }],
      },
    },
    { // cita de un hilo con varias imágenes
      uid: "q3", mask: mask("2e7fb0", true), time: "3 h",
      text: "Me dieron ganas de ordenar mi cuarto por primera vez en semanas.",
      repliesCount: 1,
      reactions: [{ name: "laugh", count: 3 }, { name: "love", count: 6 }],
      media: [],
      quote: {
        uid: "q3o", mask: mask("58e1d4"), time: "10 h",
        text: "Un año viviendo sola. Estos son los rincones que me fueron haciendo sentir en casa.",
        media: [{ type: "image", illo: "escritorio" }, { type: "image", illo: "cafe" }, { type: "image", illo: "ciudad" }, { type: "image", illo: "bosque" }, { type: "image", illo: "playa" }],
      },
    },
    { // cita de un hilo con video
      uid: "q4", mask: mask("f3a921"), time: "4 h",
      text: "Lo vi dos veces. Ojalá yo me atreva a hacer lo mismo.",
      repliesCount: 3,
      reactions: [{ name: "sad", count: 2 }, { name: "applause", count: 8 }],
      media: [],
      quote: {
        uid: "q4o", mask: mask("e6a0b3"), time: "12 h",
        text: "Me grabé diciendo en voz alta lo que nunca le dije a mi papá. No sé si lo vea algún día, pero ya no lo cargo yo.",
        media: [{ type: "video", illo: "lluvia", duration: 96 }],
      },
    },
    { // mezclado: quien cita adjunta su propia foto, y lo citado trae foto + video
      uid: "q5", mask: mask("c9a221", true), time: "6 h",
      text: "Yo también volví este año. Así se ve el mío.",
      repliesCount: 5,
      reactions: [{ name: "love", count: 9 }],
      media: [{ type: "image", illo: "playa", ratio: 1.5 }],
      quote: {
        uid: "q5o", mask: mask("1f9c6d", true), time: "1 d",
        text: "Volví al pueblo después de ocho años. Fotos del camino y un video de la plaza, que está igual.",
        media: [{ type: "image", illo: "carretera" }, { type: "video", illo: "playa", duration: 34 }],
      },
    },
  ],

  morePosts: [
    {
      uid: "mp1",
      mask: mask("7fbb2e", true),
      time: "2 d",
      text: "Hoy hace un año que murió mi papá. Nadie me preguntó cómo estoy y la verdad no sé si quería que lo hicieran.",
      repliesCount: 31,
      reactions: [{ name: "sad", count: 52 }, { name: "love", count: 18 }],
      // NSFW (gatillo automático, no elección del usuario) — copy distinto
      // al spoiler ("Contenido sensible" vs "Spoiler", ver renderMediaFrame).
      media: [{ type: "image", illo: "abstracta", isNsfw: true }],
    },
    {
      uid: "mp2",
      mask: mask("1c9a4d"),
      time: "2 d",
      text: "Pedí mi primer préstamo yo sola, sin que nadie lo firmara conmigo. Pequeño para algunos, enorme para mí.",
      repliesCount: 8,
      reactions: [{ name: "applause", count: 24 }, { name: "love", count: 6 }],
      media: [{ type: "image", illo: "ciudad" }],
    },
    {
      uid: "mp3",
      mask: mask("e02f81", true),
      time: "3 d",
      isSnap: true,        // a punto de borrarse: ejemplo del estado "queda poco"
      snapLeftMin: 40,
      snapTotalMin: 4360,
      text: "Mi hijo me preguntó por qué ya no vivimos con papá. Improvisé una respuesta y no sé si fue la correcta.",
      repliesCount: 4,
      reactions: [{ name: "sad", count: 9 }],
      media: [],
    },
    {
      uid: "mp4",
      mask: mask("9b64fa"),
      time: "3 d",
      text: "#cuerpopositivo Dejé de pesarme todos los días. Llevo un mes y ya no es lo primero en lo que pienso al despertar.",
      repliesCount: 15,
      reactions: [{ name: "love", count: 37 }, { name: "applause", count: 11 }],
      media: [],
    },
    {
      uid: "mp5",
      mask: mask("36dc0a", true),
      time: "4 d",
      isTrending: true,
      text: "Me mudé a una ciudad donde no conozco a nadie. La primera semana lloré todos los días; la cuarta ya tengo a quién llamar.",
      repliesCount: 19,
      reactions: [{ name: "love", count: 45 }, { name: "wow", count: 6 }],
      media: [{ type: "image", illo: "carretera" }, { type: "image", illo: "montana" }],
    },
    {
      uid: "mp6",
      mask: mask("f481bc"),
      time: "4 d",
      text: "Dos años sobrio hoy. No lo publico por aplausos, lo publico porque hace dos años no creía que llegaría hasta acá.",
      repliesCount: 42,
      reactions: [{ name: "applause", count: 88 }, { name: "love", count: 50 }],
      media: [],
    },
    {
      uid: "mp7",
      mask: mask("2ae970", true),
      time: "5 d",
      text: "¿Cómo le dicen adiós a una amistad de 15 años sin que se sienta como una ruptura? Porque se siente exactamente igual.",
      repliesCount: 27,
      reactions: [{ name: "sad", count: 22 }, { name: "love", count: 14 }],
      media: [],
    },
    {
      uid: "mp8",
      mask: mask("c71dfe"),
      time: "5 d",
      text: "Salí del clóset con mi abuela antes que con mis papás. No esperaba que fuera ella la que mejor lo tomara.",
      repliesCount: 36,
      reactions: [{ name: "love", count: 71 }, { name: "wow", count: 9 }],
      media: [],
    },
    {
      uid: "mp9",
      mask: mask("80b5e3", true),
      time: "6 d",
      text: "Llevo seis meses sin poder escribir una sola línea del libro. Empiezo a pensar que esa historia ya no es mía.",
      repliesCount: 11,
      reactions: [{ name: "sad", count: 8 }, { name: "wow", count: 2 }],
      media: [],
    },
    {
      uid: "mp10",
      mask: mask("4e2c9b"),
      time: "6 d",
      text: "Mi reumatólogo por fin me creyó. Tres años pidiendo que me revisaran bien y resulta que sí era real.",
      repliesCount: 29,
      reactions: [{ name: "wow", count: 33 }, { name: "angry", count: 14 }, { name: "love", count: 19 }],
      media: [],
    },
    {
      uid: "mp11",
      mask: mask("ad31f0", true),
      time: "1 sem",
      text: "Mi mamá nunca me dijo que me quería con palabras. Ayer, por primera vez en 34 años, lo hizo.",
      repliesCount: 54,
      reactions: [{ name: "love", count: 120 }, { name: "sad", count: 10 }],
      media: [],
    },
    {
      uid: "mp12",
      mask: mask("6fb824"),
      time: "1 sem",
      text: "Renuncié a mi segundo trabajo en un año. Empiezo a sospechar que el problema no es la empresa.",
      repliesCount: 16,
      reactions: [{ name: "laugh", count: 12 }, { name: "wow", count: 5 }],
      media: [{ type: "image", illo: "escritorio" }],
    },
    {
      uid: "mp13",
      mask: mask("0cf7a9", true),
      time: "1 sem",
      text: "#ansiedadsocial Cancelé un cumpleaños por tercera vez este año. La culpa después duele más que la ansiedad de ir.",
      repliesCount: 21,
      reactions: [{ name: "sad", count: 17 }, { name: "love", count: 9 }],
      media: [],
    },
    {
      uid: "mp14",
      mask: mask("b93e6c"),
      time: "2 sem",
      text: "Terminé una relación de 7 años sin tener a dónde ir. Hoy firmé el contrato de mi primer apartamento solo.",
      repliesCount: 38,
      reactions: [{ name: "applause", count: 64 }, { name: "love", count: 29 }],
      media: [{ type: "image", illo: "generica" }],
    },
  ],

  // Hilo completo para /p/p1 — con respuestas anidadas (profundidad 0/1/2).
  thread: {
    id: "p1",
    uid: "p1",
    mask: mask("6be4a5", true),
    time: "2 h",
    publishedAt: new Date().toISOString(),
    text: "Llevo tres meses sin dormir bien. El médico dice que es ansiedad, pero nunca pensé que se sintiera así — como si el cuerpo no se apagara nunca. ¿Alguien más por aquí?",
    isTrending: true,
    repliesCount: 6,
    reactions: [
      { name: "love", count: 22 },
      { name: "sad", count: 9 },
      { name: "applause", count: 3 },
    ],
    media: [],
    ancestors: [],
    replies: [
      {
        id: "r1",
        mask: mask("f3a921"),
        time: "1 h",
        publishedAt: new Date().toISOString(),
        text: "Yo pasé por algo parecido el año pasado. Lo que más me ayudó fue dejar de revisar el celular antes de dormir — suena obvio pero cambió todo.",
        reactions: [{ name: "love", count: 6 }],
        repliesCount: 0,
        depth: 0,
        guides: [],
        hasChildren: true,
        dividerBelow: false,
      },
      {
        id: "r1-1",
        parentId: "r1",
        mask: mask("6be4a5", true),
        isOp: true,
        time: "55 min",
        publishedAt: new Date().toISOString(),
        text: "Gracias, lo voy a intentar. ¿Cuánto tiempo antes lo dejabas?",
        reactions: [],
        repliesCount: 0,
        depth: 1,
        guides: [false],
        hasChildren: false,
        dividerBelow: false,
      },
      {
        id: "r2",
        mask: mask("9d1c73"),
        time: "40 min",
        publishedAt: new Date().toISOString(),
        text: "No tengo consejos, solo quería decir que no estás solo en esto. Es más común de lo que la gente admite.",
        reactions: [{ name: "love", count: 9 }, { name: "applause", count: 2 }],
        repliesCount: 0,
        depth: 0,
        guides: [],
        hasChildren: false,
        dividerBelow: true,
      },
      {
        id: "r3",
        mask: mask("2e7fb0", true),
        time: "20 min",
        publishedAt: new Date().toISOString(),
        isEdited: true,
        text: "El insomnio por ansiedad es horrible. Terapia + reducir cafeína después del mediodía me cambió la vida en semanas.",
        reactions: [{ name: "wow", count: 1 }],
        repliesCount: 0,
        depth: 0,
        guides: [],
        hasChildren: false,
        dividerBelow: false,
      },
    ],
  },

  // ---- Hilo de la propuesta thread-v2.html (sandbox). Mismo hilo que
  // `thread`, pero en forma de ÁRBOL (`kids`) y con más ramas para poder
  // probar plegado, mapa del hilo y orden. Varias respuestas llevan fotos
  // (una sola, apaisada, y carruseles) en primer nivel y en subrespuestas. `mins` = antigüedad en minutos
  // (solo para ordenar por "Recientes"). ----
  threadV2: {
    id: "p1",
    mask: mask("6be4a5", true),
    time: "2 h",
    text: "Llevo tres meses sin dormir bien. El médico dice que es ansiedad, pero nunca pensé que se sintiera así — como si el cuerpo no se apagara nunca. ¿Alguien más por aquí?",
    reposts: 6,
    reactions: [
      { name: "love", count: 22 },
      { name: "sad", count: 9 },
      { name: "applause", count: 3 },
    ],
    kids: [
      {
        id: "r1", mask: mask("f3a921"), time: "1 h", mins: 60,
        text: "Yo pasé por algo parecido el año pasado. Lo que más me ayudó fue dejar de revisar el celular antes de dormir — suena obvio pero cambió todo.",
        reactions: [{ name: "love", count: 6 }],
        kids: [
          {
            id: "r1-1", mask: mask("6be4a5", true), isOp: true, time: "55 min", mins: 55,
            text: "Gracias, lo voy a intentar. ¿Cuánto tiempo antes lo dejabas?",
            reactions: [],
            kids: [
              {
                id: "r1-1-1", mask: mask("f3a921"), time: "50 min", mins: 50,
                text: "Una hora antes, más o menos. Las primeras noches cuestan, después el cuerpo lo aprende. Yo cambié la pantalla por un té y mirar por la ventana.",
                media: [{ type: "image", illo: "cafe" }, { type: "image", illo: "lluvia" }],
                reactions: [{ name: "love", count: 4 }],
                kids: [],
              },
            ],
          },
          {
            id: "r1-2", mask: mask("b71e04", true), time: "35 min", mins: 35,
            text: "A mí me sirvió dejarlo cargando fuera del cuarto. Si no lo veo, no lo agarro. Así quedó mi mesa de noche.",
            media: [{ type: "image", illo: "escritorio", ratio: 1.5 }],
            reactions: [{ name: "applause", count: 2 }],
            kids: [],
          },
        ],
      },
      {
        id: "r2", mask: mask("9d1c73"), time: "40 min", mins: 40,
        text: "No tengo consejos, solo quería decir que no estás solo en esto. Es más común de lo que la gente admite.",
        reactions: [{ name: "love", count: 9 }, { name: "applause", count: 2 }],
        kids: [],
      },
      {
        id: "r3", mask: mask("2e7fb0", true), time: "20 min", mins: 20, isEdited: true,
        text: "El insomnio por ansiedad es horrible. Terapia + reducir cafeína después del mediodía me cambió la vida en semanas. Y caminar temprano: dejo fotos de mis rutas.",
        media: [{ type: "image", illo: "montana" }, { type: "image", illo: "bosque" }, { type: "image", illo: "carretera" }, { type: "image", illo: "playa" }],
        reactions: [{ name: "wow", count: 1 }],
        kids: [
          {
            id: "r3-1", mask: mask("6be4a5", true), isOp: true, time: "12 min", mins: 12,
            text: "¿La terapia la empezaste por el sueño o por otra cosa?",
            reactions: [],
            kids: [],
          },
        ],
      },
      {
        id: "r4", mask: mask("c9a221", true), time: "8 min", mins: 8,
        text: "Guardo este hilo. Llevo semanas igual y leerlos me hace sentir menos raro.",
        reactions: [{ name: "love", count: 3 }, { name: "sad", count: 1 }],
        kids: [],
      },
      {
        id: "r5", mask: mask("e05d38"), time: "3 min", mins: 3,
        text: "Algo pequeño: anotar en papel lo que me da vueltas antes de acostarme. No lo arregla, pero baja el ruido.",
        media: [{ type: "image", illo: "ciudad" }],
        reactions: [{ name: "love", count: 2 }],
        kids: [],
      },
    ],
  },

  notifications: [
    {
      verb: "reaction",
      actors: [mask("f3a921", true), mask("9d1c73"), mask("2e7fb0")],
      actorCount: 3,
      reaction: { name: "love" },
      isReply: false,
      threadRef: "Llevo tres meses sin dormir bien…",
      time: "5 min",
      isNew: true,
    },
    {
      verb: "reply",
      actors: [mask("9d1c73")],
      actorCount: 1,
      isReply: false,
      threadRef: "Renuncié hoy. Diez años en la misma empresa…",
      time: "1 h",
      isNew: true,
    },
    {
      verb: "profile_view",
      actors: [mask("c41a88")],
      actorCount: 1,
      time: "3 h",
      isNew: false,
    },
    {
      verb: "qr_generate",
      actors: [mask("0c88de"), mask("6be4a5")],
      actorCount: 2,
      isReply: true,
      threadRef: "El insomnio por ansiedad es horrible…",
      time: "1 d",
      isNew: false,
    },
  ],

  trending: [
    { name: "privacidad", postsCount: 482 },
    { name: "ansiedad", postsCount: 311 },
    { name: "renuncias", postsCount: 174 },
    { name: "duelo", postsCount: 96 },
    { name: "terapia", postsCount: 88 },
  ],

  topics: ["privacidad", "tecnologia", "salud", "musica", "viajes", "comida", "deportes", "cine", "libros", "ciencia", "gaming", "arte"],

  searchResults: [
    {
      uid: "s1",
      mask: mask("6be4a5", true),
      time: "2 h",
      text: "Llevo tres meses sin dormir bien por la ansiedad. ¿Alguien más por aquí?",
      repliesCount: 14,
      reactions: [{ name: "love", count: 22 }],
      media: [],
    },
    {
      uid: "s2",
      mask: mask("2e7fb0", true),
      time: "20 min",
      text: "El insomnio por ansiedad es horrible. Terapia + reducir cafeína me cambió la vida.",
      repliesCount: 1,
      reactions: [{ name: "wow", count: 1 }],
      media: [],
    },
  ],

  myProfile: {
    stats: { threads: 12, reactions: 340, replies: 25 },
    joined: "abril de 2023",
  },

  // ---- Perfil propio de profile-v2.html (sandbox): nombre, descripción,
  // enlaces y portada editables; hilos, respuestas y media de ejemplo. ----
  profileV2: {
    name: "Luna de invierno",
    bio: "Escribo aquí lo que no me atrevo a decir en voz alta. Insomne en recuperación, madre primeriza, coleccionista de tazas. #ansiedad #maternidad",
    links: [
      { label: "Mi diario", url: "lunadeinvierno.blog" },
      { label: "Música para dormir", url: "open.spotify.com/playlist/37i9dQ" },
    ],
    cover: "montana",
    joined: "abril de 2023",
    stats: { threads: 12, reactions: 340, replies: 25 },
    threads: [
      {
        uid: "my1", pinned: true, mask: mask("4f3a91", true), time: "2 sem",
        text: "Hoy cumplo un año escribiendo aquí. Empecé porque no podía dormir y no quería despertar a nadie. Gracias a quienes leen en silencio: también me han acompañado.",
        repliesCount: 31, reposts: 8,
        reactions: [{ name: "love", count: 64 }, { name: "applause", count: 17 }],
        media: [],
      },
      {
        uid: "my2", mask: mask("4f3a91", true), time: "4 h",
        text: "Seis horas seguidas. No me acordaba de cómo se sentía despertar sin haber peleado con la noche. #insomnio",
        repliesCount: 9, reposts: 2,
        reactions: [{ name: "applause", count: 22 }, { name: "love", count: 11 }],
        media: [{ type: "image", illo: "cafe", ratio: 1.5 }],
      },
      {
        uid: "my3", mask: mask("4f3a91", true), time: "1 d", isSnap: true, snapLeftMin: 180, snapTotalMin: 1440,
        text: "Hay días en que ser mamá me queda grande. Hoy fue uno. Mañana lo borro, pero necesitaba decirlo.",
        repliesCount: 14,
        reactions: [{ name: "love", count: 38 }, { name: "sad", count: 6 }],
        media: [],
      },
      {
        uid: "my4", mask: mask("4f3a91", true), time: "3 d",
        text: "Mi rincón para las madrugadas: una lámpara baja, la taza de siempre y la ventana.",
        repliesCount: 5, reposts: 1,
        reactions: [{ name: "love", count: 19 }],
        media: [{ type: "image", illo: "escritorio" }, { type: "image", illo: "lluvia" }, { type: "image", illo: "ciudad" }],
      },
      {
        uid: "my5", mask: mask("4f3a91", true), time: "5 d",
        text: "Esto me lo guardé para releerlo.",
        repliesCount: 2,
        reactions: [{ name: "love", count: 8 }],
        media: [],
        quote: {
          uid: "my5o", mask: mask("a41d0c"), time: "1 sem",
          text: "Le conté a mi hermana lo que llevaba dos años callando. No se rompió nada. Solo me abrazó y dijo que ya lo sospechaba.",
          media: [],
        },
      },
    ],
    replies: [
      {
        uid: "myr1", replyTo: mask("6be4a5", true), mask: mask("4f3a91", true), time: "1 h",
        text: "A mí me ayudó dejar una libreta junto a la cama. Lo que me daba vueltas lo escribía y lo soltaba hasta la mañana.",
        repliesCount: 2,
        reactions: [{ name: "love", count: 6 }],
        media: [],
      },
      {
        uid: "myr2", replyTo: mask("7c2be9", true), mask: mask("4f3a91", true), time: "8 h",
        text: "Qué alegría leer esto. El primer día es el que más pesa.",
        repliesCount: 0,
        reactions: [{ name: "applause", count: 3 }],
        media: [],
      },
      {
        uid: "myr3", replyTo: mask("d3f07a"), mask: mask("4f3a91", true), time: "2 d",
        text: "La radio prendida todo el día: yo igual. Ahora es un pódcast bajito, pero la idea es la misma.",
        repliesCount: 1,
        reactions: [{ name: "love", count: 4 }, { name: "laugh", count: 2 }],
        media: [],
      },
    ],
  },

  publicProfile: {
    maskId: "6be4a5",
    stats: { posts: 34, reactions: 540, replies: 61 },
    joined: "enero de 2022",
    isOnline: true,
  },
};

if (typeof window !== "undefined") window.MockData = MockData;
