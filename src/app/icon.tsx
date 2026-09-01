import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <rect x="6" y="13" width="3" height="6" rx="1" fill="#ffffff" />
          <rect x="10.5" y="9" width="3" height="10" rx="1" fill="#ffffff" />
          <rect x="15" y="5" width="3" height="14" rx="1" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
