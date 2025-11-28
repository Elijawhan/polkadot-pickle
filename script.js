import BlackHole2d from "./js/BlackHole2d.js";

window.Applet = new BlackHole2d();

window.Applet.handleMessage = (event, payload) => {
  switch(event) {
    case 'setSpeed':      window.Applet.setSpeed(payload.speed ?? 1); break;
    case 'setBackground': window.Applet.setBackground(payload.r, payload.g, payload.b); break;
    case 'reset':         window.Applet.reset(); break;
    case 'destroy':       window.Applet.destroy(); break;
  }
};