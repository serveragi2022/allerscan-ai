import FoodScanner from "@/components/FoodScanner";

export const metadata = { title: "Scan Label – AllerScan AI" };

export default function LabelPage() {
  return <FoodScanner mode="label" />;
}
