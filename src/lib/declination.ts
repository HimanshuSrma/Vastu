import geomagnetism from "geomagnetism";

type GeoModel = ReturnType<typeof geomagnetism.model>;
let cached: GeoModel | null = null;

function getModel(): GeoModel {
  if (!cached) {
    cached = geomagnetism.model(new Date(), { allowOutOfBoundsModel: true });
  }
  return cached;
}

// Magnetic declination in degrees (east positive). Add to a magnetic
// heading to obtain a true-north heading.
export function declinationDegrees(lat: number, lon: number): number {
  return getModel().point([lat, lon]).decl;
}
