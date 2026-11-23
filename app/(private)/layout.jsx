import PrivatePageProviders from "../../src/components/app/PrivatePageProviders.jsx";

export default function PrivateLayout({ children }) {
  return <PrivatePageProviders>{children}</PrivatePageProviders>;
}
