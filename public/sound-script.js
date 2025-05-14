
const playlists = {
  foret: [
    "syp6Lsd8HOo",
    "XxEhuSJF780",
    "aMezVX6pxE8",
    "Rj9zsvXKn78",
    "OC23KpzsEdo"
  ],
  donjon: [
    "W2NAblVD70Q",
    "a483kj0sR4c",
    "a0Av2XNPd_g",
    "tzh8jTkL_To",
    "noZJARt6uuQ"
  ],
  combat: [
    "eg4xReKlJxE",
    "hEQThgfXT30",
    "A48QqpWKWG8",
    "t3B802PIuB0",
    "MK5c5Kb8xeY"
  ],
  ville: [
    "ywH2C6KVFno",
    "WJrqwa6tMQY",
    "b_x_GprYDO0",
    "ddMSMwKQkKI",
    "WMNatjasc_8"
  ],
  magie: [
    "zWK6ZeYllq8",
    "ev5FbSeywe8",
    "vL-LBzf7fYc",
    "AohPsuy65hQ",
    "SA1ZM5_UFhQ"
  ],
  tension: [
    "fv_7EurNAss",
    "EApZmmYg_oQ",
    "3A3JY6W4u8E",
    "l3UIq-swjco",
    "kgq21eM26nY"
  ],
  exploration: [
    "sHA_4wfQhE8",
    "lHJbaPh5lhc",
    "Zlkpfyd07k4",
    "amwA16ye148",
    "vvTTHGq53Ug"
  ],
  emotion: [
    "aoJ-NYeuxGk",
    "1XOK0htV3Us",
    "J2hO_GqDKsk",
    "PukAl9zUp7w",
    "41Jlc0KdUSI"
  ],
  dramatique: [
    "eYj8ciqAPcA", // Heart of Courage – Two Steps From Hell
    "fOjLAA_dbK0", // Climb Together – Audiomachine
    "bZdznoBcq6Q", // Sad Dramatic Trailer – Musique libre de droit
    "tHri3XJEvmg", // Boreal – Musique Classique Dramatique
    "kmUueaXyio8"  // A Moth to A Flame – Dramatic Music for your Villain Arc
  ]
};

let currentTheme = null;
let currentIndex = 0;
let player;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '0',
    width: '0',
    videoId: '',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    },
    playerVars: {
      'autoplay': 1,
      'controls': 0
    }
  });
}

function onPlayerReady(event) {
  console.log("YouTube Player Ready");
}

function onPlayerStateChange(event) {
  // Could be extended to autoplay next track when current ends
}

function playRandom(theme) {
  currentTheme = theme;
  const options = playlists[theme];
  currentIndex = Math.floor(Math.random() * options.length);
  player.loadVideoById(options[currentIndex]);
}

function playNext() {
  if (!currentTheme) return;
  const options = playlists[currentTheme];
  currentIndex = (currentIndex + 1) % options.length;
  player.loadVideoById(options[currentIndex]);
}

function playPrevious() {
  if (!currentTheme) return;
  const options = playlists[currentTheme];
  currentIndex = (currentIndex - 1 + options.length) % options.length;
  player.loadVideoById(options[currentIndex]);
}

function pauseVideo() {
  if (player && player.pauseVideo) {
    player.pauseVideo();
  }
}

function resumeVideo() {
  if (player && player.playVideo) {
    player.playVideo();
  }
}
