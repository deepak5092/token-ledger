import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#334155",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 24 24">
          <rect x="6" y="13" width="3" height="6" rx="1" fill="#ffffff" />
          <rect x="10.5" y="9" width="3" height="10" rx="1" fill="#ffffff" />
          <rect x="15" y="5" width="3" height="14" rx="1" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
