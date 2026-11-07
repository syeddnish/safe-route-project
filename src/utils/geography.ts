import { GeoCoordinate } from '../types/route';

function distanceToSegmentMeters(
  point: GeoCoordinate,
  start: GeoCoordinate,
  end: GeoCoordinate
): number {
  const referenceLatitude = ((point[1] + start[1] + end[1]) / 3) * Math.PI / 180;
  const metersPerLongitude = 111320 * Math.cos(referenceLatitude);
  const metersPerLatitude = 110574;
  const pointX = point[0] * metersPerLongitude;
  const pointY = point[1] * metersPerLatitude;
  const startX = start[0] * metersPerLongitude;
  const startY = start[1] * metersPerLatitude;
  const endX = end[0] * metersPerLongitude;
  const endY = end[1] * metersPerLatitude;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const projection = Math.max(
    0,
    Math.min(1, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared)
  );
  return Math.hypot(
    pointX - (startX + projection * deltaX),
    pointY - (startY + projection * deltaY)
  );
}

export function isCoordinateNearLine(
  coordinate: GeoCoordinate,
  line: GeoCoordinate[],
  maximumDistanceMeters: number
): boolean {
  if (line.length === 0) {
    return false;
  }
  if (line.length === 1) {
    return distanceToSegmentMeters(coordinate, line[0], line[0]) <= maximumDistanceMeters;
  }

  for (let index = 1; index < line.length; index += 1) {
    if (distanceToSegmentMeters(coordinate, line[index - 1], line[index]) <= maximumDistanceMeters) {
      return true;
    }
  }
  return false;
}
