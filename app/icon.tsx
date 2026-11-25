import { ImageResponse } from "next/og";
import { SporMark } from "./sporMark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<SporMark size={512} />, size);
}
