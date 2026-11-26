import { ImageResponse } from "next/og";
import { TurMark } from "./turMark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<TurMark size={512} />, size);
}
