import logo from "../assets/latveria.webp";

export const LatveriaSeal = ({ size = 44, className = "" }) => (
  <img
    src={logo}
    width={size}
    height={size}
    alt="latveriacademy"
    className={`latveria-seal ${className}`}
  />
);

export const LatveriaWatermark = () => null;
