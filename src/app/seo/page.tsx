import { permanentRedirect } from "next/navigation";

export default function SeoPageRedirect() {
  permanentRedirect("/guides");
}
