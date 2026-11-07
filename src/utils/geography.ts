import { GeoCoordinate } from '../types/route';

// Validate longitude and latitude coordinates.
function isValidCoordinate(
  coordinate: GeoCoordinate
): boolean {
  if (!Array.isArray(coordinate) || coordinate.length !== 2) {
    return false;
  }

  const [longitude, latitude] = coordinate;

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

// Calculate the shortest distance from a point to a route segment.
function distanceToSegmentMeters(
  point: GeoCoordinate,
  start: GeoCoordinate,
  end: GeoCoordinate
): number {
  const referenceLatitude = point[1] * Math.PI / 180;

  const metersPerLongitude =
    111320 * Math.cos(referenceLatitude);

  const metersPerLatitude = 110574;

  // Use the observation as the local coordinate origin.
  const pointX = 0;
  const pointY = 0;

  const startX = (start[0] - point[0]) * metersPerLongitude;
  const startY = (start[1] - point[1]) * metersPerLatitude;

  const endX = (end[0] - point[0]) * metersPerLongitude;
  const endY = (end[1] - point[1]) * metersPerLatitude;

  const deltaX = endX - startX;
  const deltaY = endY - startY;

  const lengthSquared =
    deltaX * deltaX + deltaY * deltaY;

  // Handle a segment with identical endpoints.
  if (lengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      (
        (pointX - startX) * deltaX +
        (pointY - startY) * deltaY
      ) / lengthSquared
    )
  );

  const closestX = startX + projection * deltaX;
  const closestY = startY + projection * deltaY;

  return Math.hypot(
    pointX - closestX,
    pointY - closestY
  );
}

// Check whether an observation lies within the route corridor.
export function isCoordinateNearLine(
  coordinate: GeoCoordinate,
  line: GeoCoordinate[],
  maximumDistanceMeters: number
): boolean {

  if (
    !isValidCoordinate(coordinate) ||
    !Array.isArray(line) ||
    line.length === 0 ||
    !Number.isFinite(maximumDistanceMeters) ||
    maximumDistanceMeters < 0
  ) {
    return false;
  }

  const validCoordinates = line.filter(isValidCoordinate);

  if (validCoordinates.length === 0) {
    return false;
  }

  // A route containing one coordinate is treated as a point.
  if (validCoordinates.length === 1) {
    return (
      distanceToSegmentMeters(
        coordinate,
        validCoordinates[0],
        validCoordinates[0]
      ) <= maximumDistanceMeters
    );
  }

  // Check every consecutive route segment.
  for (
    let index = 1;
    index < validCoordinates.length;
    index += 1
  ) {
    const distance = distanceToSegmentMeters(
      coordinate,
      validCoordinates[index - 1],
      validCoordinates[index]
    );

    if (distance <= maximumDistanceMeters) {
      return true;
    }
  }

  return false;
}