import type { Layout } from './scales';
import { RollingNumber } from './TextMotion';

export function Footer({ layout, net }: { layout: Layout; net: number }) {
  return (
    <footer className="adc-footer" style={{ top: layout.footerTop, left: layout.plotLeft }}>
      <span className="adc-legend">
        <span className="adc-legend-swatch adc-legend-swatch--add" aria-hidden="true" />
        Added
      </span>
      <span className="adc-legend">
        <span className="adc-legend-swatch adc-legend-swatch--rem" aria-hidden="true" />
        Removed
      </span>
      <span className="adc-legend">
        <span className="adc-legend-swatch adc-legend-swatch--net" aria-hidden="true" />
        Net
        <RollingNumber className="adc-legend-net" value={net} sign="auto" />
      </span>
    </footer>
  );
}
