import { ImageResponse } from "next/og";
import { SporMark } from "./sporMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<SporMark size={180} />, size);
}
