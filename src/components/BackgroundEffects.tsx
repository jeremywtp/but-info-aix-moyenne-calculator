export function BackgroundEffects() {
  return (
    <>
      <div className="bg-aurora">
        <div className="aurora-layer1" />
        <div className="aurora-layer2" />
        <div className="aurora-layer3" />
        <div className="aurora-layer4" />
        <div className="aurora-layer5" />
        <div className="aurora-layer6" />
        <div className="aurora-layer7" />
        <div className="aurora-layer8" />
      </div>
      <div className="bg-accent-line" />
      <div className="bg-particles" />
      <div className="bg-particles-layer2" />
      <div className="bg-particles-layer3" />
      <div className="bg-particles-layer4" />
      <div className="bg-particles-layer5" />
      <div className="matrix-rain">
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className="matrix-column" />
        ))}
      </div>
      <div className="corner-decoration corner-tl" />
      <div className="corner-decoration corner-tr" />
      <div className="corner-decoration corner-bl" />
      <div className="corner-decoration corner-br" />
    </>
  );
}
