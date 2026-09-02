const colores = ["#B5451B", "#E0A33E", "#5B6B3A", "#B5451B", "#E0A33E", "#5B6B3A"];

export function Banderines() {
  return (
    <svg
      viewBox="0 0 240 20"
      preserveAspectRatio="none"
      className="h-4 w-full"
      aria-hidden="true"
    >
      <line x1="0" y1="3" x2="240" y2="3" stroke="#6B5647" strokeWidth="0.5" />
      {colores.map((c, i) => (
        <polygon
          key={i}
          points={`${i * 40},3 ${i * 40 + 40},3 ${i * 40 + 20},18`}
          fill={c}
        />
      ))}
    </svg>
  );
}
