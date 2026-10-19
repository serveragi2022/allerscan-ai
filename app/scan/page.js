import FoodScanner from "@/components/FoodScanner";

export const metadata = { title: "Scan Food – AllerScan AI" };

export default function ScanPage() {
  return <FoodScanner mode="food" />;
}
