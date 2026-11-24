import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { tr } from "../i18n";

export const SOCIAL_LINKS = [
  {
    key: "instagram",
    Icon: FaInstagram,
    href: "https://www.instagram.com/futgrid.az",
    get label() {
      return tr("Instagram");
    },
  },
  {
    key: "tiktok",
    Icon: FaTiktok,
    href: "https://www.tiktok.com/@futgrid.az",
    get label() {
      return tr("TikTok");
    },
  },
  {
    key: "youtube",
    Icon: FaYoutube,
    href: "https://www.youtube.com/@futgridaz",
    get label() {
      return tr("YouTube");
    },
  },
];

export const externalProps = (href) =>
  href?.startsWith("http")
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
