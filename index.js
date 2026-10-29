// Load the Tailwind CSS before anything else. NativeWind reads its dark-mode
// flag from this CSS when its color-scheme module first runs; if the CSS is
// not there yet, it throws "Cannot manually set color scheme" on web.
import "./global.css";
import "expo-router/entry";
