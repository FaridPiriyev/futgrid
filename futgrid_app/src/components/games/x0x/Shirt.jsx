export default function Shirt({ className = "", fill = "currentColor", stroke = "none", strokeWidth = 0 }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path
        d="M34 10 L18 16 L4 34 L18 44 L24 38 L24 92 L76 92 L76 38 L82 44 L96 34 L82 16 L66 10 C62 18 56 21 50 21 C44 21 38 18 34 10 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}
