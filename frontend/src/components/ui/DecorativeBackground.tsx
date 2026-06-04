export function DecorativeBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(#1e2d4a 1px, transparent 1px), linear-gradient(90deg, #1e2d4a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)",
        }}
      />
      <div
        className="absolute"
        style={{
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 400,
          background:
            "radial-gradient(ellipse at center, rgba(0, 212, 170, 0.12) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
