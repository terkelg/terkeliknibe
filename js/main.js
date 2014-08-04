/* Fix vh units in css */
window.viewportUnitsBuggyfill.init();

/* Scroll Effects */
var wow = new WOW(
  {
    mobile: false
  }
);
wow.init();

/* Share Button */
config = {
  url: 'http://terkeliknibe.dk/',
  title: 'Terkel I Boligknibe',
  text:  'Kan du hjælpe Terkel? #terkeliknibe',
  ui: {
    flyout: 'bottom center',
    button_font: false,
    button_text: 'Del budskabet'
  }
};

var share = new Share('.delmig', config);
