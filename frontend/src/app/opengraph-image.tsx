import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%, #f0fdf4 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
        }}
      >
        <svg
          viewBox="0 0 68 40"
          width="220"
          height="130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="20 4, 34 12, 34 28, 20 36, 6 28, 6 12"
            fill="#1F9D68"
            stroke="#2C3238"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="48 4, 62 12, 62 28, 48 36, 34 28, 34 12"
            fill="none"
            stroke="#2C3238"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            marginTop: 40,
            fontSize: 72,
            fontWeight: 800,
            color: "#111827",
            letterSpacing: "-0.04em",
          }}
        >
          ANI
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 28,
            fontWeight: 600,
            color: "#059669",
          }}
        >
          Agricess Network International
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            color: "#4b5563",
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.4,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
