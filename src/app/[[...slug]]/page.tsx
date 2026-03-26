import { HomePage } from "@/components/HomePage";

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ["BUT1"] },
    { slug: ["BUT2-FA-A"] },
    { slug: ["BUT2-FA-B"] },
    { slug: ["BUT2-FI-A"] },
    { slug: ["BUT2-FI-B"] },
    { slug: ["BUT3-FA-A"] },
    { slug: ["BUT3-FA-B"] },
    { slug: ["BUT3-FI-A"] },
    { slug: ["BUT3-FI-B"] },
  ];
}

export default function Page() {
  return <HomePage />;
}
